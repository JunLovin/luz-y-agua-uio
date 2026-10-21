-- Mirrors packages/shared/src/config.ts; packages/shared/src/config.sql.test.ts fails if they drift apart.
create or replace function thresholds() returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '{
    "accuracyBeforeMinutes": 10,
    "accuracyAfterMinutes": 30,
    "peakDistinctReports": 5,
    "trustStep": 0.02,
    "zoneBarrioStep": 0.1,
    "learnedWeight": 0.5,
    "lowDocumentShare": 0.3,
    "silentSourceHours": 72,
    "activeSourceDocuments": 3,
    "activeSourceWindowDays": 14,
    "crowdEntryMinutes": 20,
    "crowdExitMinutes": 30,
    "crowdStaleHours": 6,
    "maxReportsPerIpPerHour": 10
  }'::jsonb
$$;

-- §7: the salt of the day a report was hashed with, so a phone is never counted twice when
-- the salt changes at midnight (Quito time). `weight` drops to 0.5 for unattested reports (H7).
alter table reports
  add column salt_day date not null default ((now() at time zone 'America/Guayaquil')::date),
  add column weight real not null default 1 check (weight in (0.5, 1));

create unique index crowd_outages_one_open_idx on crowd_outages (barrio_id, service) where ended_at is null;

/**
 * Distinct devices per barrio and service since `p_since`, by their latest status. Devices are
 * counted per salt day and the larger day wins: a phone reporting on both sides of midnight
 * has two hashes but counts once.
 */
create function crowd_devices(p_since timestamptz)
returns table (barrio_id text, service text, out_devices real, restored_devices real)
language sql
stable
set search_path = ''
as $$
  with latest as (
    select distinct on (r.barrio_id, r.service, r.salt_day, r.dedup_hash)
      r.barrio_id, r.service, r.salt_day, r.status, r.weight
    from public.reports r
    where r.received_at > p_since
    order by r.barrio_id, r.service, r.salt_day, r.dedup_hash, r.received_at desc, r.id desc
  ),
  per_day as (
    select l.barrio_id, l.service,
      coalesce(sum(l.weight) filter (where l.status = 'out'), 0) as out_devices,
      coalesce(sum(l.weight) filter (where l.status = 'restored'), 0) as restored_devices
    from latest l
    group by l.barrio_id, l.service, l.salt_day
  )
  select p.barrio_id, p.service, max(p.out_devices)::real, max(p.restored_devices)::real
  from per_day p
  group by p.barrio_id, p.service
$$;
revoke execute on function crowd_devices(timestamptz) from public, anon, authenticated;

-- §5.4: the same per-salt-day maximum, so learning does not double count across midnight either.
create or replace function report_peaks(p_service text, p_starts_at timestamptz)
returns table (barrio_id text, reports bigint)
language sql
stable
set search_path = ''
as $$
  select per_day.barrio_id, max(per_day.devices)
  from (
    select r.barrio_id, r.salt_day, count(distinct r.dedup_hash) as devices
    from public.reports r, public.thresholds() t
    where r.service = p_service
      and r.status = 'out'
      and r.received_at >= p_starts_at - make_interval(mins => (t ->> 'accuracyBeforeMinutes')::int)
      and r.received_at <= p_starts_at + make_interval(mins => (t ->> 'accuracyAfterMinutes')::int)
    group by r.barrio_id, r.salt_day
  ) per_day
  group by per_day.barrio_id
$$;

-- Same counting as crowd_devices, inlined: a view cannot call a function anon may not execute.
-- Mirrors config.crowd.liveWindowMs, displayMinimum and displayRoundTo in packages/shared.
create or replace view public_crowd_live as
with latest as (
  select distinct on (barrio_id, service, salt_day, dedup_hash) barrio_id, service, salt_day, status, weight
  from reports
  where received_at > now() - interval '60 minutes'
  order by barrio_id, service, salt_day, dedup_hash, received_at desc, id desc
),
per_day as (
  select barrio_id, service, sum(weight) as devices
  from latest
  where status = 'out'
  group by barrio_id, service, salt_day
)
select barrio_id, service, (round(max(devices) / 5.0) * 5)::int as reports
from per_day
group by barrio_id, service
having max(devices) >= 3;

/**
 * §7: stores one anonymous report. The IP and the nonce only exist here as HMACs with the
 * random salt of the day (created on first use), never in clear.
 */
create function submit_report(
  p_barrio_id text,
  p_service text,
  p_status text,
  p_nonce text,
  p_ip text
) returns text
language plpgsql
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'America/Guayaquil')::date;
  day_salt bytea;
  hits int;
begin
  if not exists (select 1 from public.barrios where id = p_barrio_id) then
    return 'unknown_barrio';
  end if;

  insert into public.daily_salts (day, salt) values (v_day, extensions.gen_random_bytes(32))
  on conflict do nothing;
  select salt into day_salt from public.daily_salts where day = v_day;

  insert into public.rate_limits as rl (ip_hash, window_start)
  values (
    encode(extensions.hmac(convert_to(p_ip, 'UTF8'), day_salt, 'sha256'), 'hex'),
    date_trunc('hour', now())
  )
  on conflict (ip_hash, window_start) do update set count = rl.count + 1
  returning count into hits;
  if hits > (public.thresholds() ->> 'maxReportsPerIpPerHour')::int then
    return 'rate_limited';
  end if;

  insert into public.reports (barrio_id, service, status, dedup_hash, salt_day)
  values (
    p_barrio_id,
    p_service,
    p_status,
    encode(extensions.hmac(convert_to(p_nonce, 'UTF8'), day_salt, 'sha256'), 'hex'),
    v_day
  );
  return 'ok';
end;
$$;
revoke execute on function submit_report(text, text, text, text, text) from public, anon, authenticated;

/**
 * §7, every minute: opens a crowd outage when enough devices report `out`, closes it when
 * `restored` wins or reports go stale, and links it to a scheduled outage so no `crowd`
 * push repeats an official one.
 */
create function aggregate_reports() returns void
language plpgsql
set search_path = ''
as $$
declare
  t jsonb := public.thresholds();
  entry_since timestamptz := now() - make_interval(mins => (t ->> 'crowdEntryMinutes')::int);
begin
  update public.crowd_outages c set ended_at = now()
  where c.ended_at is null
    and (
      not exists (
        select 1 from public.reports r
        where r.barrio_id = c.barrio_id and r.service = c.service
          and r.received_at > now() - make_interval(hours => (t ->> 'crowdStaleHours')::int)
      )
      or exists (
        select 1 from public.crowd_devices(now() - make_interval(mins => (t ->> 'crowdExitMinutes')::int)) d
        where d.barrio_id = c.barrio_id and d.service = c.service
          and d.restored_devices > d.out_devices
      )
    );

  update public.crowd_outages c set peak_reports = greatest(c.peak_reports, ceil(d.out_devices)::int)
  from public.crowd_devices(entry_since) d
  where c.ended_at is null and d.barrio_id = c.barrio_id and d.service = c.service;

  insert into public.crowd_outages (barrio_id, service, started_at, peak_reports)
  select d.barrio_id, d.service, now(), ceil(d.out_devices)::int
  from public.crowd_devices(entry_since) d
  where d.out_devices >= (t ->> 'peakDistinctReports')::int
    and not exists (
      select 1 from public.crowd_outages c
      where c.barrio_id = d.barrio_id and c.service = d.service and c.ended_at is null
    );

  update public.crowd_outages c set matched_outage_id = (
    select o.id from public.outages o
    where o.service = c.service
      and c.barrio_id = any(o.barrio_ids)
      and o.tier in ('high', 'medium')
      and now() >= o.starts_at - make_interval(mins => (t ->> 'accuracyBeforeMinutes')::int)
      and now() <= coalesce(o.ends_at, o.starts_at + interval '1 day')
    order by o.starts_at desc
    limit 1
  )
  where c.ended_at is null and c.matched_outage_id is null;
end;
$$;
revoke execute on function aggregate_reports() from public, anon, authenticated;

select cron.schedule('aggregate-reports', '* * * * *', 'select public.aggregate_reports()');

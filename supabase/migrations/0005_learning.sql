-- Mirrors packages/shared/src/config.ts (accuracyWindow, crowd.minDistinctReports, learning);
-- packages/shared/src/config.sql.test.ts fails if they drift apart.
create function thresholds() returns jsonb
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
    "learnedWeight": 0.5
  }'::jsonb
$$;
revoke execute on function thresholds() from public, anon, authenticated;

alter table outages
  add column evaluated_at timestamptz,
  add column confirmed boolean;

-- 'candidate': a barrio seen in a zone's outage window, not yet trusted (§5.5).
alter table zone_barrio drop constraint zone_barrio_origin_check;
alter table zone_barrio add constraint zone_barrio_origin_check
  check (origin in ('official', 'geometry', 'learned', 'candidate'));

/** Distinct devices that reported `out` per barrio in the accuracy window of an outage start. */
create function report_peaks(p_service text, p_starts_at timestamptz)
returns table (barrio_id text, reports bigint)
language sql
stable
set search_path = ''
as $$
  select r.barrio_id, count(distinct r.dedup_hash)
  from public.reports r, public.thresholds() t
  where r.service = p_service
    and r.status = 'out'
    and r.received_at >= p_starts_at - make_interval(mins => (t ->> 'accuracyBeforeMinutes')::int)
    and r.received_at <= p_starts_at + make_interval(mins => (t ->> 'accuracyAfterMinutes')::int)
  group by r.barrio_id
$$;
revoke execute on function report_peaks(text, timestamptz) from public, anon, authenticated;

/**
 * §5.4 and §5.5: for each high scheduled outage whose window has closed, compare it with
 * neighbor reports, nudge the source's trust and learn which barrios a zone really covers.
 */
create function evaluate_outages() returns int
language plpgsql
set search_path = ''
as $$
declare
  t jsonb := public.thresholds();
  peak_size int := (t ->> 'peakDistinctReports')::int;
  o record;
  confirmed_peak boolean;
  silent boolean;
  had_history boolean;
  evaluated int := 0;
begin
  for o in
    select x.id, x.service, x.zone_id, x.barrio_ids, x.starts_at, d.source_id
    from public.outages x
    join public.source_documents d on d.id = x.source_document_id
    where x.kind = 'scheduled'
      and x.tier = 'high'
      and x.evaluated_at is null
      and x.starts_at + make_interval(mins => (t ->> 'accuracyAfterMinutes')::int) < now()
    for update of x skip locked
  loop
    select coalesce(bool_or(p.reports >= peak_size), false), coalesce(sum(p.reports), 0) = 0
    into confirmed_peak, silent
    from public.report_peaks(o.service, o.starts_at) p
    where p.barrio_id = any(o.barrio_ids);

    -- Reports from before the window stand in for "people here use the app".
    select exists (
      select 1 from public.reports h
      where h.barrio_id = any(o.barrio_ids)
        and h.service = o.service
        and h.received_at < o.starts_at - make_interval(mins => (t ->> 'accuracyBeforeMinutes')::int)
      group by h.barrio_id
      having count(distinct h.dedup_hash) >= peak_size
    ) into had_history;

    if confirmed_peak then
      update public.sources set trust = least(1, round((trust::numeric + (t ->> 'trustStep')::numeric), 4)) where id = o.source_id;
    elsif silent and had_history then
      update public.sources set trust = greatest(0, round((trust::numeric - (t ->> 'trustStep')::numeric), 4)) where id = o.source_id;
    end if;

    -- One coincidence per zone and start time, even if several outages of the zone share it.
    if o.zone_id is not null and not exists (
      select 1 from public.outages same
      where same.zone_id = o.zone_id and same.starts_at = o.starts_at and same.evaluated_at is not null
    ) then
      insert into public.zone_barrio as zb (zone_id, barrio_id, weight, origin)
      select o.zone_id, p.barrio_id, (t ->> 'zoneBarrioStep')::real, 'candidate'
      from public.report_peaks(o.service, o.starts_at) p
      where p.reports >= peak_size and not (p.barrio_id = any(o.barrio_ids))
      on conflict (zone_id, barrio_id) do update
        set weight = least(1, round((zb.weight::numeric + (t ->> 'zoneBarrioStep')::numeric), 4)),
            origin = case
              when round((zb.weight::numeric + (t ->> 'zoneBarrioStep')::numeric), 4) >= (t ->> 'learnedWeight')::numeric then 'learned'
              else zb.origin
            end,
            updated_at = now()
        where zb.origin in ('candidate', 'learned');
    end if;

    update public.outages set evaluated_at = now(), confirmed = confirmed_peak where id = o.id;
    evaluated := evaluated + 1;
  end loop;
  return evaluated;
end;
$$;
revoke execute on function evaluate_outages() from public, anon, authenticated;

select cron.schedule('evaluate-outages', '*/10 * * * *', 'select public.evaluate_outages()');

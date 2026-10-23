-- §5.4: report history counted per salt day, like every other device count since 0009.
/**
 * §5.4 and §5.5: for each high scheduled outage whose window has closed, compare it with
 * neighbor reports, nudge the source's trust and learn which barrios a zone really covers.
 */
create or replace function evaluate_outages() returns int
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

    -- Reports from before the window stand in for "people here use the app": one day with enough
    -- distinct devices, so a single person reporting on many days does not count as many.
    select exists (
      select 1 from public.reports h
      where h.barrio_id = any(o.barrio_ids)
        and h.service = o.service
        and h.received_at < o.starts_at - make_interval(mins => (t ->> 'accuracyBeforeMinutes')::int)
      group by h.barrio_id, h.salt_day
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

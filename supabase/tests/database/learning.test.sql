begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into barrios (id, name, geom, source) values
  ('a', 'A', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm'),
  ('b', 'B', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm'),
  ('c', 'C', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm');
insert into utility_zones (id, utility, service, name) values ('eeq_z', 'eeq', 'luz', 'Z');
insert into zone_barrio (zone_id, barrio_id, weight, origin) values ('eeq_z', 'a', 1, 'official');
insert into source_documents (id, source_id, sha256, status) values
  ('00000000-0000-0000-0000-0000000000d1', 'eeq', 'd1', 'extracted');

create function pg_temp.outage(p_id text, p_barrios text[], p_start interval, p_tier text default 'high', p_zone text default null)
returns void language sql as $$
  insert into outages (id, service, kind, zone_id, barrio_ids, starts_at, ends_at, confidence, tier, source_document_id, source_label)
  values (('00000000-0000-0000-0000-' || lpad(p_id, 12, '0'))::uuid, 'luz', 'scheduled', p_zone, p_barrios,
          now() - p_start, now() - p_start + interval '3 hours', 0.9, p_tier, '00000000-0000-0000-0000-0000000000d1', 'x')
$$;
create function pg_temp.reports(p_barrio text, p_count int, p_at timestamptz, p_tag text)
returns void language sql as $$
  insert into reports (barrio_id, service, status, dedup_hash, received_at)
  select p_barrio, 'luz', 'out', p_tag || g, p_at from generate_series(1, p_count) g
$$;
create function pg_temp.trust() returns real language sql as $$ select trust from sources where id = 'eeq' $$;

-- A confirmed outage raises trust.
select pg_temp.outage('1', '{a}', interval '2 hours');
select pg_temp.reports('a', 5, now() - interval '2 hours' + interval '5 minutes', 'x');
select is(evaluate_outages(), 1, 'evaluates outages whose window has closed');
select is(pg_temp.trust(), 0.52::real, 'a confirmed outage raises the source trust');
select is((select confirmed from outages where id = '00000000-0000-0000-0000-000000000001'), true, 'marks the outage confirmed');
select is(evaluate_outages(), 0, 'never evaluates an outage twice');

-- Silence lowers trust only where people already report.
select pg_temp.reports('b', 5, now() - interval '10 days', 'old');
select pg_temp.outage('2', '{b}', interval '2 hours');
select evaluate_outages();
select is(pg_temp.trust(), 0.50::real, 'silence in a barrio with report history lowers trust');
select pg_temp.outage('3', '{c}', interval '2 hours');
select evaluate_outages();
select is(pg_temp.trust(), 0.50::real, 'silence in a barrio with no history changes nothing');

-- Outages that are not evaluated.
select pg_temp.outage('4', '{a}', interval '5 minutes');
select pg_temp.outage('5', '{a}', interval '2 hours', 'medium');
select evaluate_outages();
select is(
  (select count(*)::int from outages where evaluated_at is null), 2,
  'skips outages still in their window and outages below high'
);

-- §5.5: a barrio outside the outage that peaks in a zone's window becomes a candidate, then learned.
select pg_temp.outage('6', '{a}', interval '3 hours', 'high', 'eeq_z');
select pg_temp.reports('c', 5, now() - interval '3 hours', 'z6');
select pg_temp.reports('a', 5, now() - interval '3 hours', 'a6');
select evaluate_outages();
select is(
  (select origin || ':' || weight from zone_barrio where zone_id = 'eeq_z' and barrio_id = 'c'), 'candidate:0.1',
  'a peaking barrio outside the outage becomes a candidate of the zone'
);
select is(
  (select origin || ':' || weight from zone_barrio where zone_id = 'eeq_z' and barrio_id = 'a'), 'official:1',
  'official links are never changed'
);
select pg_temp.outage('11', '{b}', interval '3 hours', 'high', 'eeq_z');
select evaluate_outages();
select is(
  (select weight from zone_barrio where zone_id = 'eeq_z' and barrio_id = 'c'), 0.1::real,
  'a second outage of the zone at the same time does not count the peak twice'
);
select pg_temp.outage(i::text, '{a}', make_interval(hours => 3 + i), 'high', 'eeq_z') from generate_series(7, 10) i;
select pg_temp.reports('c', 5, now() - make_interval(hours => 3 + i), 'z' || i) from generate_series(7, 10) i;
select evaluate_outages();
select is(
  (select origin from zone_barrio where zone_id = 'eeq_z' and barrio_id = 'c'), 'learned',
  'enough coincidences turn a candidate into a learned link'
);

select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('thresholds', 'report_peaks', 'evaluate_outages')
     and has_function_privilege('anon', p.oid, 'EXECUTE')),
  null, 'anon cannot run the learning functions'
);
select is((select count(*)::int from cron.job where jobname = 'evaluate-outages'), 1, 'evaluation runs on a schedule');

select * from finish();
rollback;

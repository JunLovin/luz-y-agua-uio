begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into barrios (id, name, geom, source) values
  ('small', 'Small', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm'),
  ('big', 'Big', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm');

insert into reports (barrio_id, service, status, dedup_hash)
select 'small', 'luz', 'out', 'h' || g from generate_series(1, 2) g
union all
select 'big', 'luz', 'out', 'h' || g from generate_series(1, 8) g
union all
select 'big', 'luz', 'out', 'h1'
union all
select 'big', 'luz', 'restored', 'r1'
union all
select 'big', 'luz', 'out', 'h' || g from generate_series(9, 11) g
union all
select 'big', 'agua', 'out', 'old' || g from generate_series(1, 4) g;
update reports set received_at = now() - interval '61 minutes' where dedup_hash like 'old%';
insert into reports (barrio_id, service, status, dedup_hash, received_at)
select 'big', 'luz', 'restored', 'h' || g, now() + interval '1 second' from generate_series(9, 11) g;

select is((select count(*)::int from public_crowd_live where barrio_id = 'small'), 0,
  'barrios with fewer than 3 distinct reports are hidden');
select is((select reports from public_crowd_live where barrio_id = 'big' and service = 'luz'), 10,
  'counts distinct devices whose latest status is out and rounds to a multiple of 5');
select is(
  (select count(*)::int from reports where barrio_id = 'big' and service = 'luz' and status = 'out'), 12,
  'fixture includes devices that later reported restored'
);
select is((select count(*)::int from public_crowd_live where service = 'agua'), 0,
  'reports older than 60 minutes are not live');

insert into outages (id, service, kind, barrio_ids, starts_at, ends_at, confidence, tier, source_label) values
  ('00000000-0000-0000-0000-000000000001', 'luz', 'scheduled', '{big}', now() + interval '1 hour', now() + interval '3 hours', 0.9, 'high', 'a'),
  ('00000000-0000-0000-0000-000000000003', 'luz', 'scheduled', '{big}', now() + interval '1 hour', now() + interval '3 hours', 0.3, 'low', 'c'),
  ('00000000-0000-0000-0000-000000000004', 'luz', 'scheduled', '{big}', now() - interval '30 hours', now() - interval '26 hours', 0.9, 'high', 'd'),
  ('00000000-0000-0000-0000-000000000005', 'agua', 'unscheduled', '{big}', now() - interval '2 hours', null, 0.6, 'medium', 'e'),
  ('00000000-0000-0000-0000-000000000006', 'agua', 'scheduled', '{big}', now() + interval '1 hour', now() + interval '2 hours', 0.9, 'high', 'f');
insert into outages (id, service, kind, barrio_ids, starts_at, ends_at, confidence, tier, source_label, supersedes) values
  ('00000000-0000-0000-0000-000000000002', 'luz', 'scheduled', '{big}', now() + interval '2 hours', now() + interval '4 hours', 0.9, 'high', 'b',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007', 'agua', 'scheduled', '{big}', now() + interval '1 hour', now() + interval '2 hours', 0.2, 'low', 'g',
   '00000000-0000-0000-0000-000000000006');

select bag_eq(
  $$select source_label from public_outages_active$$,
  $$values ('b'), ('e'), ('f')$$,
  'shows only high/medium, current outages not replaced by a visible correction'
);

select throws_ok(
  $$insert into utility_zones (id, utility, service, name) values ('eeq_san bartolo', 'eeq', 'luz', 'x')$$,
  '23514', null, 'zone ids must be topic-safe'
);

delete from barrios_releases;
insert into barrios_releases (version, url) values (1, 'v1'), (2, 'v2');
select is((select url from public_barrios_meta), 'v2', 'barrios meta returns the latest release');

insert into daily_salts (day, salt) values
  ((now() - interval '3 days')::date, 'a'), ((now() - interval '1 day')::date, 'b');
insert into rate_limits (ip_hash, window_start) values ('old', now() - interval '2 hours'), ('new', now());
insert into notifications_log (topic, kind, sent_at) values ('t', 'crowd', now() - interval '91 days');
update reports set received_at = now() - interval '31 days' where dedup_hash = 'r1';

select purge_expired_data();

select is((select array_agg(salt) from daily_salts where salt in ('a', 'b')), '{b}'::bytea[], 'purges salts older than 48 hours');
select is((select array_agg(ip_hash) from rate_limits where ip_hash in ('old', 'new')), '{new}', 'purges rate limit rows older than 1 hour');
select is((select count(*)::int from notifications_log), 0, 'purges notifications older than 90 days');
select is((select count(*)::int from reports where dedup_hash = 'r1'), 0, 'purges reports older than 30 days');

select * from finish();
rollback;

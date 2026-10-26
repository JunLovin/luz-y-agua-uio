begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into barrios (id, name, geom, source) values
  ('r_a', 'A', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm'),
  ('r_b', 'B', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm'),
  ('r_c', 'C', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm'),
  ('r_d', 'D', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm');

-- submit_report: hashing, dedup and rate limits

select is(submit_report('nope', 'luz', 'out', 'n-1', '10.0.0.1'), 'unknown_barrio', 'rejects an unknown barrio');

do $$ begin perform submit_report('r_a', 'luz', 'out', 'same-nonce', '10.1.0.' || g) from generate_series(1, 50) g; end $$;
select is(
  (select count(distinct dedup_hash)::int from reports where barrio_id = 'r_a'),
  1,
  '50 reports with the same nonce count as one device'
);
select ok(
  (select bool_and(dedup_hash ~ '^[0-9a-f]{64}$' and dedup_hash <> 'same-nonce') from reports where barrio_id = 'r_a'),
  'the nonce is stored only as an HMAC'
);
select ok(
  not exists (select 1 from rate_limits where ip_hash like '10.%'),
  'IPs are stored only as HMACs'
);
select is(
  (select count(*)::int from information_schema.columns
   where table_schema = 'public' and table_name in ('reports', 'rate_limits') and column_name ~ 'ip$|^ip_addr|nonce'),
  0,
  'no table keeps an IP or nonce column in clear'
);
select is(
  (select count(*)::int from daily_salts where day = (now() at time zone 'America/Guayaquil')::date),
  1,
  'the salt of the Quito day is created on first use'
);

do $$ begin perform submit_report('r_b', 'agua', 'out', 'ip-' || g, '10.2.0.1') from generate_series(1, 10) g; end $$;
select is(submit_report('r_b', 'agua', 'out', 'ip-11', '10.2.0.1'), 'rate_limited', 'the 11th report in an hour from one IP is refused');
select is((select count(*)::int from reports where barrio_id = 'r_b'), 10, 'a refused report is not stored');

-- aggregate_reports: crowd outages

do $$ begin perform submit_report('r_c', 'luz', 'out', 'dev-' || g, '10.3.0.' || g) from generate_series(1, 4) g; end $$;
do $$ begin perform aggregate_reports(); end $$;
select is((select count(*)::int from crowd_outages where barrio_id = 'r_c'), 0, '4 devices do not open a crowd outage');

do $$ begin perform submit_report('r_c', 'luz', 'out', 'dev-5', '10.3.0.5'); end $$;
do $$ begin perform aggregate_reports(); end $$;
select is(
  (select peak_reports from crowd_outages where barrio_id = 'r_c' and service = 'luz' and ended_at is null),
  5,
  '5 distinct devices open a crowd outage'
);
select is((select reports from public_crowd_live where barrio_id = 'r_c' and service = 'luz'), 5, 'and show in public_crowd_live');

do $$ begin perform aggregate_reports(); end $$;
select is((select count(*)::int from crowd_outages where barrio_id = 'r_c'), 1, 'one open crowd outage per barrio and service');

do $$ begin perform submit_report('r_c', 'luz', 'restored', 'dev-' || g, '10.4.0.' || g) from generate_series(1, 5) g; end $$;
do $$ begin perform aggregate_reports(); end $$;
select ok(
  (select ended_at is not null from crowd_outages where barrio_id = 'r_c'),
  'closes when restored outnumbers out'
);

-- Two phones reporting on both sides of midnight: four hashes, two devices.
insert into reports (barrio_id, service, status, dedup_hash, salt_day, received_at) values
  ('r_d', 'luz', 'out', 'p1-yesterday', current_date - 1, now() - interval '20 minutes'),
  ('r_d', 'luz', 'out', 'p2-yesterday', current_date - 1, now() - interval '20 minutes'),
  ('r_d', 'luz', 'out', 'p1-today', current_date, now() - interval '5 minutes'),
  ('r_d', 'luz', 'out', 'p2-today', current_date, now() - interval '5 minutes');
select ok(
  not exists (select 1 from public_crowd_live where barrio_id = 'r_d'),
  'a phone is not counted twice when the salt changes'
);

select is(
  (select reports::int from report_peaks('luz', now() - interval '10 minutes') where barrio_id = 'r_d'),
  2,
  'learning peaks do not count a phone twice across midnight either'
);

insert into outages (service, kind, barrio_ids, starts_at, ends_at, confidence, tier, source_label)
values ('agua', 'scheduled', '{r_d}', now() - interval '1 hour', now() + interval '2 hours', 0.9, 'high', 'test');
do $$ begin perform submit_report('r_d', 'agua', 'out', 'w-' || g, '10.5.0.' || g) from generate_series(1, 5) g; end $$;
do $$ begin perform aggregate_reports(); end $$;
select isnt(
  (select matched_outage_id from crowd_outages where barrio_id = 'r_d' and service = 'agua'),
  null,
  'a crowd outage during a scheduled one is matched, so no crowd push is sent'
);

insert into crowd_outages (barrio_id, service, started_at, peak_reports)
values ('r_a', 'agua', now() - interval '8 hours', 5);
do $$ begin perform aggregate_reports(); end $$;
select ok(
  (select ended_at is not null from crowd_outages where barrio_id = 'r_a' and service = 'agua'),
  'closes after 6 hours without reports'
);

select * from finish();
rollback;

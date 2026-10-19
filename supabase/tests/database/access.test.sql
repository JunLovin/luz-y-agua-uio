begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is(
  (select array_agg(c.relname order by c.relname) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'RLS is enabled on every public table'
);

select is(
  (select array_agg(t.tablename || ':' || r.role order by t.tablename) from pg_tables t
   cross join (values ('anon'), ('authenticated')) r(role)
   where t.schemaname = 'public'
     and has_table_privilege(r.role, format('public.%I', t.tablename),
                             'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  null,
  'anon and authenticated have no privileges on any public table'
);

select is(
  (select array_agg(p.proname order by p.proname) from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')),
  null,
  'anon cannot execute any public function'
);

set local role anon;

select throws_ok(
  $$insert into barrios (id, name, geom, source)
    values ('x', 'x', 'SRID=4326;MULTIPOLYGON(((0 0,0 1,1 1,0 0)))', 'osm')$$,
  '42501', null, 'anon cannot insert into barrios'
);
select throws_ok(
  $$insert into reports (barrio_id, service, status, dedup_hash) values ('x', 'luz', 'out', 'h')$$,
  '42501', null, 'anon cannot insert into reports'
);
select throws_ok($$select * from reports$$, '42501', null, 'anon cannot read raw reports');

select lives_ok($$select * from public_outages_active$$, 'anon reads public_outages_active');
select lives_ok($$select * from public_crowd_live$$, 'anon reads public_crowd_live');
select lives_ok($$select * from public_barrios_meta$$, 'anon reads public_barrios_meta');

select * from finish();
rollback;

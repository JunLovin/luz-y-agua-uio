begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into notifications_log (topic, outage_id, kind)
values ('v1_luz_b_test', '00000000-0000-0000-0000-0000000000a1', 'heads_up');

select throws_ok(
  $$insert into notifications_log (topic, outage_id, kind)
    values ('v1_luz_b_test', '00000000-0000-0000-0000-0000000000a1', 'heads_up')$$,
  '23505',
  null,
  'the same (topic, outage, kind) can only be claimed once'
);

insert into utility_zones (id, utility, service, name) values
  ('eeq_test', 'eeq', 'luz', 'Prueba EEQ'),
  ('epmaps_test', 'epmaps', 'agua', 'Prueba Epmaps');

set local role anon;

select ok(
  exists (select 1 from public_eeq_zones where id = 'eeq_test' and name = 'Prueba EEQ'),
  'anon reads EEQ zones'
);

select ok(
  not exists (select 1 from public_eeq_zones where id = 'epmaps_test'),
  'the zone list only has EEQ luz zones'
);

select * from finish();
rollback;

-- Minimal public data so CI prerenders the web against real views (see the `web` job).
insert into barrios (id, name, geom, source) values
  ('ci_norte', 'CI Norte', 'SRID=4326;MULTIPOLYGON(((-78.5 -0.2,-78.5 -0.1,-78.4 -0.1,-78.5 -0.2)))', 'osm'),
  ('ci_sur', 'CI Sur', 'SRID=4326;MULTIPOLYGON(((-78.6 -0.3,-78.6 -0.2,-78.5 -0.2,-78.6 -0.3)))', 'osm');

insert into outages (service, kind, barrio_ids, starts_at, ends_at, confidence, tier, source_label)
values ('luz', 'scheduled', '{ci_norte}', now() + interval '2 hours', now() + interval '5 hours', 0.9, 'high', 'Cronograma de prueba');

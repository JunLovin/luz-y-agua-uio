-- §9: barrio names for the public web, without the geometry (the GeoJSON already publishes both).
create view public_barrios as
select id, name
from barrios;

grant select on public_barrios to anon, authenticated;

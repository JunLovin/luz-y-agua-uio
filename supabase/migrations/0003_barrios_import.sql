insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barrios', 'barrios', true, 3145728, array['application/geo+json']);

create function import_barrios(features jsonb, new_version int, new_source text) returns int
language sql
set search_path = ''
as $$
  with upserted as (
    insert into public.barrios as b (id, name, parroquia, geom, source, version)
    select f -> 'properties' ->> 'id',
           f -> 'properties' ->> 'name',
           f -> 'properties' ->> 'parroquia',
           extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(f -> 'geometry'), 4326)),
           new_source,
           new_version
    from jsonb_array_elements(features) f
    on conflict (id) do update
      set name = excluded.name,
          parroquia = excluded.parroquia,
          geom = excluded.geom,
          source = excluded.source,
          version = excluded.version
    returning 1
  ),
  -- ponytail: fails loudly if a dropped barrio still has reports; handle when switching to the Geoportal layer.
  dropped as (
    delete from public.barrios where version < new_version and id not in (
      select f -> 'properties' ->> 'id' from jsonb_array_elements(features) f
    )
  )
  select count(*)::int from upserted
$$;
revoke execute on function import_barrios(jsonb, int, text) from public, anon, authenticated;

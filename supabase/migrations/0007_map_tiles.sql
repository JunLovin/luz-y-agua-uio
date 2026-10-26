-- Basemap served from our own storage (PRINCIPIOS.md rule 11): PMTiles extract, glyphs and style.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tiles',
  'tiles',
  true,
  52428800,
  array['application/vnd.pmtiles', 'application/x-protobuf', 'application/json']
);

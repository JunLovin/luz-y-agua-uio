-- CLAUDE.md rule 6: eeq.com.ec is never fetched automatically.
alter table sources add constraint sources_eeq_never_automated
  check (not (automated_allowed and coalesce(base_url, '') ilike '%eeq.com.ec%'));

insert into sources (id, name, automated_allowed, base_url) values
  ('eeq', 'Empresa Eléctrica Quito', false, 'https://www.eeq.com.ec'),
  ('epmaps', 'Epmaps', false, 'https://www.aguaquito.gob.ec');

alter table source_documents
  add column attempts int not null default 0,
  add column last_error text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-documents',
  'source-documents',
  false,
  20971520,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain']
);

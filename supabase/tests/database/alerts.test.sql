begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.doc(p_id text, p_source text, p_status text, p_age interval, p_tier text default null)
returns void language plpgsql as $$
declare doc_id uuid := ('00000000-0000-0000-0000-' || lpad(p_id, 12, '0'))::uuid;
begin
  insert into source_documents (id, source_id, sha256, status, received_at, last_error)
  values (doc_id, p_source, p_id, p_status, now() - p_age, case when p_status = 'failed' then 'API down' end);
  if p_tier is not null then
    insert into outages (service, kind, barrio_ids, starts_at, confidence, tier, source_document_id, source_label)
    values ('luz', 'scheduled', '{}', now() + interval '1 day', 0.5, p_tier, doc_id, 'x');
  end if;
end $$;

select is((select count(*)::int from pending_alerts()), 0, 'no alerts on an empty database');

-- 1 of 3 recent documents published nothing: 33 % > 30 %.
select pg_temp.doc('1', 'eeq', 'extracted', interval '2 hours', 'high');
select pg_temp.doc('2', 'eeq', 'extracted', interval '3 hours', 'medium');
select pg_temp.doc('3', 'eeq', 'extracted', interval '4 hours', 'low');
select is(
  (select detail from pending_alerts() where kind = 'low_share'), '{"documents": 3, "low": 1}'::jsonb,
  'alerts when more than 30 % of the day''s documents published nothing'
);
select pg_temp.doc('4', 'eeq', 'extracted', interval '5 hours', 'high');
select is((select count(*)::int from pending_alerts() where kind = 'low_share'), 0, 'no alert at 25 %');

-- Epmaps published 3 documents last week, then went silent for 4 days.
select pg_temp.doc('5', 'epmaps', 'extracted', interval '4 days', 'high');
select pg_temp.doc('6', 'epmaps', 'extracted', interval '6 days', 'high');
select pg_temp.doc('7', 'epmaps', 'extracted', interval '8 days', 'high');
select is(
  (select array_agg(detail ->> 'source') from pending_alerts() where kind = 'silent_source'), '{epmaps}',
  'alerts when an active source goes silent for 72 h'
);

select pg_temp.doc('8', 'eeq', 'failed', interval '1 hour');
select is(
  (select detail ->> 'error' from pending_alerts() where kind = 'failed_document'), 'API down',
  'alerts about a document that failed three times'
);
select mark_failures_alerted(array['00000000-0000-0000-0000-000000000008'::uuid]);
select is((select count(*)::int from pending_alerts() where kind = 'failed_document'), 0, 'reports each failure once');

select is(
  (select array_agg(p.proname::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('pending_alerts', 'mark_failures_alerted')
     and has_function_privilege('anon', p.oid, 'EXECUTE')),
  null, 'anon cannot read or clear alerts'
);

select * from finish();
rollback;

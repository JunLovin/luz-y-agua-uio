create extension if not exists pg_net with schema extensions;

create or replace function thresholds() returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '{
    "accuracyBeforeMinutes": 10,
    "accuracyAfterMinutes": 30,
    "peakDistinctReports": 5,
    "trustStep": 0.02,
    "zoneBarrioStep": 0.1,
    "learnedWeight": 0.5,
    "lowDocumentShare": 0.3,
    "silentSourceHours": 72,
    "activeSourceDocuments": 3,
    "activeSourceWindowDays": 14
  }'::jsonb
$$;

alter table source_documents add column failure_alerted_at timestamptz;

/** §5.6: what the daily alert email should report. Empty when everything is fine. */
create function pending_alerts() returns table (kind text, detail jsonb)
language sql
stable
set search_path = ''
as $$
  with t as (select public.thresholds() as v),
  recent as (
    select exists (
      select 1 from public.outages o where o.source_document_id = d.id and o.tier in ('high', 'medium')
    ) as published
    from public.source_documents d
    where d.status = 'extracted' and d.received_at > now() - interval '24 hours'
  )
  select 'low_share', jsonb_build_object('documents', count(*), 'low', count(*) filter (where not published))
  from recent
  having count(*) > 0
    and count(*) filter (where not published)::numeric / count(*)
      > (select (v ->> 'lowDocumentShare')::numeric from t)
  union all
  select 'silent_source', jsonb_build_object('source', d.source_id, 'lastReceivedAt', max(d.received_at))
  from public.source_documents d, t
  group by d.source_id, t.v
  having max(d.received_at) < now() - make_interval(hours => (t.v ->> 'silentSourceHours')::int)
    and count(*) filter (
      where d.received_at > now() - make_interval(hours => (t.v ->> 'silentSourceHours')::int)
        - make_interval(days => (t.v ->> 'activeSourceWindowDays')::int)
    ) >= (t.v ->> 'activeSourceDocuments')::int
  union all
  select 'failed_document', jsonb_build_object('id', d.id, 'source', d.source_id, 'error', d.last_error)
  from public.source_documents d
  where d.status = 'failed' and d.failure_alerted_at is null
$$;
revoke execute on function pending_alerts() from public, anon, authenticated;

create function mark_failures_alerted(ids uuid[]) returns void
language sql
set search_path = ''
as $$
  update public.source_documents set failure_alerted_at = now() where id = any(ids)
$$;
revoke execute on function mark_failures_alerted(uuid[]) from public, anon, authenticated;

-- 08:00 in Quito. Needs the Vault secrets `project_url` and `service_role_key` (see CLAUDE.md).
select cron.schedule('send-alerts', '0 13 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    timeout_milliseconds := 30000
  )
$$);

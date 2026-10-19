create extension if not exists pg_cron with schema pg_catalog;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

create table barrios (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  parroquia text,
  geom extensions.geometry(MultiPolygon, 4326) not null,
  source text not null check (source in ('geoportal', 'osm')),
  version int not null default 1
);
create index barrios_geom_idx on barrios using gist (geom);

create table barrios_releases (
  version int primary key,
  url text not null,
  published_at timestamptz not null default now()
);

create table utility_zones (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  utility text not null check (utility in ('eeq', 'epmaps')),
  service text not null check (service in ('luz', 'agua')),
  name text not null,
  aliases text[] not null default '{}',
  geom extensions.geometry(MultiPolygon, 4326)
);

create table zone_barrio (
  zone_id text references utility_zones (id) on delete cascade,
  barrio_id text references barrios (id) on delete cascade,
  weight real not null check (weight between 0 and 1),
  origin text not null check (origin in ('official', 'geometry', 'learned')),
  updated_at timestamptz not null default now(),
  primary key (zone_id, barrio_id)
);

create table sources (
  id text primary key,
  name text not null,
  automated_allowed boolean not null default false,
  base_url text,
  trust real not null default 0.5 check (trust between 0 and 1)
);

create table source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references sources (id),
  url text,
  storage_path text,
  sha256 text not null unique,
  received_at timestamptz not null default now(),
  status text not null check (status in ('pending', 'extracted', 'failed'))
);

create table outages (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('luz', 'agua')),
  kind text not null check (kind in ('scheduled', 'unscheduled')),
  zone_id text references utility_zones (id),
  barrio_ids text[] not null,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at > starts_at),
  confidence real not null check (confidence between 0 and 1),
  tier text not null check (tier in ('high', 'medium', 'low')),
  source_document_id uuid references source_documents (id),
  source_label text not null,
  supersedes uuid references outages (id),
  notes text,
  created_at timestamptz not null default now()
);
create index outages_supersedes_idx on outages (supersedes);

create table reports (
  id bigint generated always as identity primary key,
  barrio_id text not null references barrios (id),
  service text not null check (service in ('luz', 'agua')),
  status text not null check (status in ('out', 'restored')),
  dedup_hash text not null,
  received_at timestamptz not null default now()
);
create index reports_received_at_idx on reports (received_at);

create table crowd_outages (
  id uuid primary key default gen_random_uuid(),
  barrio_id text not null references barrios (id),
  service text not null check (service in ('luz', 'agua')),
  started_at timestamptz not null,
  ended_at timestamptz,
  peak_reports int not null,
  matched_outage_id uuid references outages (id)
);

create table daily_salts (
  day date primary key,
  salt bytea not null
);

create table rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (ip_hash, window_start)
);

create table notifications_log (
  id bigint generated always as identity primary key,
  topic text not null,
  outage_id uuid,
  kind text not null check (kind in ('heads_up', 'imminent', 'correction', 'crowd')),
  sent_at timestamptz not null default now()
);
create index notifications_log_sent_at_idx on notifications_log (sent_at);

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Views run with the owner's rights on purpose: they are the only read surface,
-- so anon reads them without any access to the underlying tables.
create view public_outages_active as
select o.id, o.service, o.kind, o.zone_id, o.barrio_ids, o.starts_at, o.ends_at,
       o.tier, o.source_label, o.supersedes, o.notes
from outages o
where o.tier in ('high', 'medium')
  and (o.ends_at > now() or o.starts_at > now() - interval '24 hours')
  and not exists (
    select 1 from outages n where n.supersedes = o.id and n.tier in ('high', 'medium')
  );

-- Mirrors config.crowd.liveWindowMs, displayMinimum and displayRoundTo in packages/shared.
create view public_crowd_live as
with latest as (
  select distinct on (barrio_id, service, dedup_hash) barrio_id, service, status
  from reports
  where received_at > now() - interval '60 minutes'
  order by barrio_id, service, dedup_hash, received_at desc
)
select barrio_id, service, (round(count(*) / 5.0) * 5)::int as reports
from latest
where status = 'out'
group by barrio_id, service
having count(*) >= 3;

create view public_barrios_meta as
select version, url, published_at
from barrios_releases
order by version desc
limit 1;

grant select on public_outages_active, public_crowd_live, public_barrios_meta to anon, authenticated;

-- Mirrors config.retention in packages/shared.
create function purge_expired_data() returns void
language sql
set search_path = ''
as $$
  delete from public.reports where received_at < now() - interval '30 days';
  delete from public.daily_salts where day <= ((now() - interval '48 hours') at time zone 'America/Guayaquil')::date;
  delete from public.rate_limits where window_start < now() - interval '1 hour';
  delete from public.notifications_log where sent_at < now() - interval '90 days';
$$;
revoke execute on function purge_expired_data() from public, anon, authenticated;

select cron.schedule('purge-expired-data', '*/5 * * * *', 'select public.purge_expired_data()');

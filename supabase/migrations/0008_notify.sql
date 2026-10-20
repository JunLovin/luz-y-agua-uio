-- §6: `notify` claims a row before each push, so the same (topic, outage, kind) is never sent twice.
-- For `crowd`, outage_id holds the crowd_outages id.
create unique index notifications_log_once_idx on notifications_log (topic, outage_id, kind);

-- §8.3: the whole list of EEQ zones, so the phone can offer the optional luz precision.
create view public_eeq_zones as
select id, name
from utility_zones
where utility = 'eeq' and service = 'luz';

grant select on public_eeq_zones to anon, authenticated;

-- Needs the Vault secrets `project_url` and `service_role_key` (see CLAUDE.md).
select cron.schedule('notify', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    timeout_milliseconds := 30000
  )
$$);

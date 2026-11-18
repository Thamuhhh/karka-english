-- Run after push-notifications.sql and setting PUSH_CRON_SECRET in Edge
-- Function secrets. Replace both placeholders before running this file.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  project_url_id uuid;
  push_secret_id uuid;
  publishable_key_id uuid;
begin
  select id into project_url_id from vault.secrets where name = 'elvate_project_url';
  if project_url_id is null then
    perform vault.create_secret('https://cvfnqiyxwhicizekomag.supabase.co', 'elvate_project_url');
  else
    perform vault.update_secret(project_url_id, 'https://cvfnqiyxwhicizekomag.supabase.co', 'elvate_project_url');
  end if;

  select id into push_secret_id from vault.secrets where name = 'elvate_push_cron_secret';
  if push_secret_id is null then
    perform vault.create_secret('REPLACE_WITH_THE_SAME_VALUE_AS_PUSH_CRON_SECRET', 'elvate_push_cron_secret');
  else
    perform vault.update_secret(push_secret_id, 'REPLACE_WITH_THE_SAME_VALUE_AS_PUSH_CRON_SECRET', 'elvate_push_cron_secret');
  end if;

  select id into publishable_key_id from vault.secrets where name = 'elvate_publishable_key';
  if publishable_key_id is null then
    perform vault.create_secret('REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY', 'elvate_publishable_key');
  else
    perform vault.update_secret(publishable_key_id, 'REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY', 'elvate_publishable_key');
  end if;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'elvate-ai-speaking-push-every-minute';

select cron.schedule(
  'elvate-ai-speaking-push-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'elvate_project_url') || '/functions/v1/ai-speaking-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'elvate_publishable_key'),
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'elvate_push_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);

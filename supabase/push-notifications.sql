-- Run once in Supabase SQL Editor to enable account-linked Expo push devices.
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  timezone text not null default 'UTC',
  last_reminder_local_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_devices_expo_token_format check (
    expo_push_token like 'ExpoPushToken[%]' or expo_push_token like 'ExponentPushToken[%]'
  )
);

alter table public.push_devices alter column user_id drop not null;
alter table public.push_devices enable row level security;
revoke all on public.push_devices from public, anon, authenticated;
grant select, insert, update, delete on public.push_devices to service_role;

create index if not exists push_devices_user_id_idx on public.push_devices (user_id);

create or replace function public.register_push_device(
  p_expo_push_token text,
  p_platform text,
  p_timezone text default 'UTC'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_token text := trim(coalesce(p_expo_push_token, ''));
  resolved_timezone text := coalesce(nullif(trim(p_timezone), ''), 'UTC');
begin
  if p_platform not in ('ios', 'android') then
    raise exception 'Unsupported notification platform';
  end if;

  -- Security Hardening: Expo push token format validation
  if clean_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_\-]+\]$' then
    raise exception 'Invalid Expo push token format';
  end if;

  -- Sanitize timezone input to prevent header injection or malformed data
  if length(resolved_timezone) > 64 or resolved_timezone ~ '[<>"'';\\]' then
    resolved_timezone := 'UTC';
  end if;

  -- Prevent device table bloat: Keep max 5 devices per registered user
  if current_user_id is not null then
    delete from public.push_devices
    where user_id = current_user_id
      and id in (
        select id from public.push_devices
        where user_id = current_user_id
        order by updated_at asc
        offset 4
      );
  end if;

  insert into public.push_devices (user_id, expo_push_token, platform, timezone, last_reminder_local_date)
  values (current_user_id, clean_token, p_platform, resolved_timezone, null)
  on conflict (expo_push_token) do update set
    user_id = coalesce(excluded.user_id, push_devices.user_id),
    platform = excluded.platform,
    timezone = excluded.timezone,
    updated_at = now();
end;
$$;

create or replace function public.unregister_push_device(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_devices
  where expo_push_token = p_expo_push_token
    and (user_id = auth.uid() or user_id is null);
end;
$$;

-- Service-only atomic claim prevents duplicate reminders when cron calls overlap.
create or replace function public.claim_push_reminder(p_device_id uuid, p_local_date date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_devices
  set last_reminder_local_date = p_local_date,
      updated_at = now()
  where id = p_device_id
    and last_reminder_local_date is distinct from p_local_date;
  return found;
end;
$$;

-- Admin Telemetry: Total Installs & Devices by Platform
create or replace function public.admin_get_push_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_android bigint;
  v_ios bigint;
begin
  perform private.require_admin();

  select count(*),
         count(*) filter (where platform = 'android'),
         count(*) filter (where platform = 'ios')
  into v_total, v_android, v_ios
  from public.push_devices;

  return jsonb_build_object(
    'total_installs', coalesce(v_total, 0),
    'android_installs', coalesce(v_android, 0),
    'ios_installs', coalesce(v_ios, 0)
  );
end;
$$;

-- Admin Broadcast: Get all active Expo tokens to dispatch notifications
create or replace function public.admin_broadcast_push(
  p_title text,
  p_body text,
  p_screen text default 'call',
  p_priority text default 'high'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tokens text[];
begin
  perform private.require_admin();

  select coalesce(array_agg(expo_push_token), array[]::text[])
  into v_tokens
  from public.push_devices;

  return jsonb_build_object(
    'recipient_count', cardinality(v_tokens),
    'tokens', v_tokens
  );
end;
$$;

revoke all on function public.register_push_device(text, text, text) from public, anon;
revoke all on function public.unregister_push_device(text) from public, anon;
revoke all on function public.claim_push_reminder(uuid, date) from public, anon, authenticated;
revoke all on function public.admin_get_push_stats() from public, anon, authenticated;
revoke all on function public.admin_broadcast_push(text, text, text, text) from public, anon, authenticated;

grant execute on function public.register_push_device(text, text, text) to anon, authenticated;
grant execute on function public.unregister_push_device(text) to anon, authenticated;
grant execute on function public.claim_push_reminder(uuid, date) to service_role;
grant execute on function public.admin_get_push_stats() to authenticated;
grant execute on function public.admin_broadcast_push(text, text, text, text) to authenticated;

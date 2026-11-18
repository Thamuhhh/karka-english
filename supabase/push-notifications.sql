-- Run once in Supabase SQL Editor to enable account-linked Expo push devices.
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  resolved_timezone text := coalesce(nullif(trim(p_timezone), ''), 'UTC');
begin
  if current_user_id is null then
    raise exception 'Sign in before registering push notifications' using errcode = '42501';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'Unsupported notification platform';
  end if;
  if length(resolved_timezone) > 80 then
    resolved_timezone := 'UTC';
  end if;
  if coalesce(p_expo_push_token, '') not like 'ExpoPushToken[%]'
     and coalesce(p_expo_push_token, '') not like 'ExponentPushToken[%]' then
    raise exception 'Invalid Expo push token';
  end if;

  insert into public.push_devices (user_id, expo_push_token, platform, timezone, last_reminder_local_date)
  values (current_user_id, p_expo_push_token, p_platform, resolved_timezone, null)
  on conflict (expo_push_token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    timezone = excluded.timezone,
    last_reminder_local_date = null,
    updated_at = now();
end;
$$;

create or replace function public.unregister_push_device(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_devices
  where expo_push_token = p_expo_push_token
    and user_id = auth.uid();
end;
$$;

-- Service-only atomic claim prevents duplicate reminders when cron calls overlap.
create or replace function public.claim_push_reminder(p_device_id uuid, p_local_date date)
returns boolean
language plpgsql
security definer
set search_path = ''
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

revoke all on function public.register_push_device(text, text, text) from public, anon;
revoke all on function public.unregister_push_device(text) from public, anon;
revoke all on function public.claim_push_reminder(uuid, date) from public, anon, authenticated;
grant execute on function public.register_push_device(text, text, text) to authenticated;
grant execute on function public.unregister_push_device(text) to authenticated;
grant execute on function public.claim_push_reminder(uuid, date) to service_role;

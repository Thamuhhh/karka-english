-- Elvate English (Supabase Postgres Schema + RLS + Protected Routes)
-- Run once in Supabase Dashboard -> SQL Editor (idempotent / safe to re-run).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1. User Profiles (Owner-only account preferences & display name; no PII shared publicly)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Elvate Learner',
  avatar_color text not null default '#7F43FE',
  avatar_id text default 'lion',
  preferred_accent text not null default 'en-US'
    check (preferred_accent in ('en-US', 'en-GB', 'en-AU')),
  speech_rate numeric(3, 2) not null default 0.95
    check (speech_rate >= 0.50 and speech_rate <= 1.50),
  daily_goal_xp integer not null default 100
    check (daily_goal_xp >= 10 and daily_goal_xp <= 2000),
  sound_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Study Progress (Owner-only XP, streak, hearts, gems, completed lessons)
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  streak_days integer not null default 0 check (streak_days >= 0),
  last_active_date date not null default current_date,
  stardust_xp integer not null default 0 check (stardust_xp >= 0),
  cosmic_rank text not null default 'Bronze League',
  gems integer not null default 450 check (gems >= 0),
  hearts integer not null default 5 check (hearts >= 0),
  max_hearts integer not null default 5 check (max_hearts >= 1),
  today_xp integer not null default 0 check (today_xp >= 0),
  today_date date not null default current_date,
  daily_goal_xp integer not null default 100 check (daily_goal_xp >= 10),
  words_mastered integer not null default 0 check (words_mastered >= 0),
  conversations_done integer not null default 0 check (conversations_done >= 0),
  sentences_checked integer not null default 0 check (sentences_checked >= 0),
  completed_classes text[] not null default '{}'::text[],
  mastered_words text[] not null default '{}'::text[],
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Existing installations used a minimum one-day seed. Streaks now begin only
-- after the learner completes the daily XP goal, so allow a true zero state.
alter table public.user_progress
  drop constraint if exists user_progress_streak_days_check;
alter table public.user_progress
  add constraint user_progress_streak_days_check check (streak_days >= 0);
alter table public.user_progress
  alter column streak_days set default 0;

-- 3. Saved & Custom Vocabulary (Owner-only Corporate Lexicon entries)
create table if not exists public.user_vocabulary (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  phonetic text,
  audio_url text,
  part_of_speech text not null default 'noun',
  definition text not null,
  example text not null default '',
  synonyms text[] not null default '{}'::text[],
  tamil_meaning text not null default '',
  cefr_level text not null default 'B1'
    check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  memorized boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, word)
);

-- 4. Protected Leaderboard Standings (Non-PII display standings visible only to authenticated users)
create table if not exists public.leaderboard_entries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Elvate Learner',
  avatar_initials text not null default 'KL',
  avatar_color text not null default '#7F43FE',
  avatar_id text default 'lion',
  stardust_xp integer not null default 120 check (stardust_xp >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  cosmic_rank text not null default 'Bronze League',
  updated_at timestamptz not null default now()
);

-- Indexes for fast RLS filters and ranked queries
create index if not exists user_vocabulary_user_updated_idx
  on public.user_vocabulary (user_id, updated_at desc);

create index if not exists leaderboard_entries_xp_rank_idx
  on public.leaderboard_entries (stardust_xp desc, streak_days desc);

-- Explicit least-privilege grants (unauthenticated `anon` gets zero access to protected app tables)
revoke all on public.profiles from public, anon;
revoke all on public.user_progress from public, anon;
revoke all on public.user_vocabulary from public, anon;
revoke all on public.leaderboard_entries from public, anon;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_progress to authenticated;
grant select, insert, update, delete on public.user_vocabulary to authenticated;
grant select, insert, update, delete on public.leaderboard_entries to authenticated;
grant usage, select on sequence public.user_vocabulary_id_seq to authenticated;

-- Enable Row Level Security on every exposed table
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.leaderboard_entries enable row level security;

-- Policies: public.profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Policies: public.user_progress
drop policy if exists "progress_select_own" on public.user_progress;
create policy "progress_select_own" on public.user_progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "progress_insert_own" on public.user_progress;
create policy "progress_insert_own" on public.user_progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "progress_update_own" on public.user_progress;
create policy "progress_update_own" on public.user_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "progress_delete_own" on public.user_progress;
create policy "progress_delete_own" on public.user_progress
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Policies: public.user_vocabulary
drop policy if exists "vocabulary_select_own" on public.user_vocabulary;
create policy "vocabulary_select_own" on public.user_vocabulary
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "vocabulary_insert_own" on public.user_vocabulary;
create policy "vocabulary_insert_own" on public.user_vocabulary
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "vocabulary_update_own" on public.user_vocabulary;
create policy "vocabulary_update_own" on public.user_vocabulary
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "vocabulary_delete_own" on public.user_vocabulary;
create policy "vocabulary_delete_own" on public.user_vocabulary
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Policies: public.leaderboard_entries
drop policy if exists "leaderboard_select_authenticated" on public.leaderboard_entries;
create policy "leaderboard_select_authenticated" on public.leaderboard_entries
  for select to authenticated
  using (true);

drop policy if exists "leaderboard_insert_own" on public.leaderboard_entries;
create policy "leaderboard_insert_own" on public.leaderboard_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaderboard_update_own" on public.leaderboard_entries;
create policy "leaderboard_update_own" on public.leaderboard_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaderboard_delete_own" on public.leaderboard_entries;
create policy "leaderboard_delete_own" on public.leaderboard_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Private helper: auto-update updated_at timestamp
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.touch_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

drop trigger if exists user_progress_touch_updated_at on public.user_progress;
create trigger user_progress_touch_updated_at
  before update on public.user_progress
  for each row execute function private.touch_updated_at();

drop trigger if exists user_vocabulary_touch_updated_at on public.user_vocabulary;
create trigger user_vocabulary_touch_updated_at
  before update on public.user_vocabulary
  for each row execute function private.touch_updated_at();

drop trigger if exists leaderboard_entries_touch_updated_at on public.leaderboard_entries;
create trigger leaderboard_entries_touch_updated_at
  before update on public.leaderboard_entries
  for each row execute function private.touch_updated_at();

-- Private signup trigger: automatically provision profile, progress, and leaderboard row on auth.users insert
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_name text;
  words text[];
  resolved_initials text;
  palette text[] := array[
    '#7F43FE', '#F59E0B', '#06B6D4', '#EC4899',
    '#10B981', '#8B5CF6', '#3B82F6', '#14B8A6'
  ];
  resolved_color text;
begin
  resolved_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    case when new.is_anonymous then 'Guest Learner' else 'Elvate Learner' end
  );

  words := regexp_split_to_array(trim(resolved_name), '\s+');
  if array_length(words, 1) >= 2 then
    resolved_initials := upper(substr(words[1], 1, 1) || substr(words[2], 1, 1));
  else
    resolved_initials := upper(substr(resolved_name, 1, 2));
  end if;
  if coalesce(resolved_initials, '') = '' then
    resolved_initials := 'KL';
  end if;

  resolved_color := palette[1 + (abs(hashtext(new.id::text)::bigint) % array_length(palette, 1))];

  insert into public.profiles (id, display_name, avatar_color)
  values (new.id, resolved_name, resolved_color)
  on conflict (id) do nothing;

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.leaderboard_entries (
    user_id,
    display_name,
    avatar_initials,
    avatar_color,
    stardust_xp,
    streak_days,
    cosmic_rank
  )
  values (new.id, resolved_name, resolved_initials, resolved_color, 0, 1, 'Bronze League')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backward-compatible columns for avatar pack
alter table public.profiles add column if not exists avatar_id text default 'lion';
alter table public.leaderboard_entries add column if not exists avatar_id text default 'lion';

-- Admin-only read access for the static website dashboard. Admin role must be
-- assigned in auth.users.raw_app_meta_data by a trusted Supabase operator.
create or replace function private.require_admin()
returns void
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_admin() from public, anon, authenticated;

create or replace function public.admin_get_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  return jsonb_build_object(
    'total_accounts', (select count(*) from auth.users),
    'new_accounts_7d', (
      select count(*) from auth.users where created_at >= now() - interval '7 days'
    ),
    'active_today', (
      select count(*) from public.user_progress where last_active_date = current_date
    ),
    'total_xp', (
      select coalesce(sum(stardust_xp), 0) from public.user_progress
    ),
    'completed_classes', (
      select coalesce(sum(cardinality(completed_classes)), 0) from public.user_progress
    ),
    'average_streak', (
      select coalesce(round(avg(streak_days)::numeric, 1), 0) from public.user_progress
    )
  );
end;
$$;

create or replace function public.admin_list_learners(
  p_query text default '',
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_active_date date,
  stardust_xp integer,
  streak_days integer,
  completed_classes integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  return query
    select
      u.id,
      coalesce(u.email, case when u.is_anonymous then 'Guest account' else '—' end)::text,
      coalesce(p.display_name, 'Elvate Learner')::text,
      u.created_at,
      pr.last_active_date,
      coalesce(pr.stardust_xp, 0)::integer,
      coalesce(pr.streak_days, 0)::integer,
      coalesce(cardinality(pr.completed_classes), 0)::integer
    from auth.users as u
    left join public.profiles as p on p.id = u.id
    left join public.user_progress as pr on pr.user_id = u.id
    where coalesce(p_query, '') = ''
      or coalesce(p.display_name, '') ilike '%' || p_query || '%'
      or coalesce(u.email, '') ilike '%' || p_query || '%'
    order by u.created_at desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_get_overview() from public, anon, authenticated;
revoke all on function public.admin_list_learners(text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_get_overview() to authenticated;
grant execute on function public.admin_list_learners(text, integer, integer) to authenticated;

-- Admin authored courses. Learners can read published units; only admin RPCs write.
create table if not exists public.custom_courses (
  id text primary key,
  level_data jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.custom_courses enable row level security;
revoke all on public.custom_courses from anon, authenticated;
grant select (id, level_data, status, updated_at, created_at) on public.custom_courses to anon, authenticated;
drop policy if exists published_custom_courses_read on public.custom_courses;
create policy published_custom_courses_read on public.custom_courses
  for select to anon, authenticated using (status = 'published');

create or replace function public.admin_save_course(p_level_data jsonb, p_status text default 'draft')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  saved public.custom_courses;
  level_to_save jsonb := p_level_data;
  classes_to_save jsonb;
  unit_title text;
  next_unit_number integer;
begin
  perform private.require_admin();
  if p_status not in ('draft', 'published') then raise exception 'Invalid course status'; end if;
  if jsonb_typeof(p_level_data) <> 'object'
     or coalesce(p_level_data ->> 'id', '') = ''
     or jsonb_typeof(p_level_data -> 'classes') <> 'array' then
    raise exception 'Invalid course content';
  end if;

  select 5 + count(*)::integer into next_unit_number
  from public.custom_courses
  where status = 'published' and id <> (p_level_data ->> 'id');
  unit_title := trim(regexp_replace(coalesce(level_to_save ->> 'levelName', ''), '^Unit[[:space:]]+[0-9]+:[[:space:]]*', '', 'i'));
  if unit_title = '' then unit_title := 'Custom Course'; end if;

  level_to_save := jsonb_set(level_to_save, '{levelNumber}', to_jsonb(next_unit_number), true);
  level_to_save := jsonb_set(level_to_save, '{levelName}', to_jsonb('Unit ' || next_unit_number || ': ' || unit_title), true);
  select coalesce(
    jsonb_agg(jsonb_set(lesson.content, '{levelNumber}', to_jsonb(next_unit_number), true) order by lesson.ordinality),
    '[]'::jsonb
  ) into classes_to_save
  from jsonb_array_elements(level_to_save -> 'classes') with ordinality as lesson(content, ordinality);
  level_to_save := jsonb_set(level_to_save, '{classes}', classes_to_save, true);

  insert into public.custom_courses(id, level_data, status, updated_at)
  values (level_to_save ->> 'id', level_to_save, p_status, now())
  on conflict (id) do update set level_data = excluded.level_data, status = excluded.status, updated_at = now()
  returning * into saved;
  return jsonb_build_object('id', saved.id, 'level_data', saved.level_data, 'status', saved.status, 'updated_at', saved.updated_at);
end; $$;

create or replace function public.admin_list_courses()
returns setof jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query select jsonb_build_object('id', c.id, 'level_data', c.level_data, 'status', c.status, 'updated_at', c.updated_at)
    from public.custom_courses c order by c.updated_at desc;
end; $$;

revoke all on function public.admin_save_course(jsonb, text) from public, anon, authenticated;
revoke all on function public.admin_list_courses() from public, anon, authenticated;
grant execute on function public.admin_save_course(jsonb, text) to authenticated;
grant execute on function public.admin_list_courses() to authenticated;

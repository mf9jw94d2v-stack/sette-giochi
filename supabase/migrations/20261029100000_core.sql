-- Sette Giochi — core schema: games, profiles, preferences.
--
-- Conventions used in every migration of this project:
--   * Supabase grants ALL on new tables and functions in `public` to `anon`
--     and `authenticated` by default. We revoke that first and grant back
--     only what each table needs: RLS decides WHICH rows, grants decide
--     WHICH operations. Both are needed.
--   * Functions run with `search_path = ''` and fully qualified names.
--   * Helpers that clients must never call live in the `private` schema,
--     which the Data API does not expose.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

-- ---------------------------------------------------------------------------
-- Games: the seven games, as reference data for foreign keys and bounds.
-- `max_score` and `rounds` mirror the engines in src/games/<id>/engine.ts;
-- src/backend/database.test.ts fails if they drift apart.
-- ---------------------------------------------------------------------------
create table public.games (
  id text primary key,
  name text not null,
  rounds smallint not null check (rounds between 1 and 20),
  max_score integer not null check (max_score > 0),
  constraint games_id_format check (id ~ '^[a-z][a-z-]{1,30}$')
);

insert into public.games (id, name, rounds, max_score) values
  ('krillion',   'Krillion',   7, 7000),
  ('plain',      'Plain',      7, 7000),
  ('fact-map',   'Fact Map',   5, 5000),
  ('estimania',  'Estimania',  5, 500),
  ('size-it-up', 'Size It Up', 5, 500),
  ('geoslice',   'GeoSlice',   3, 3000),
  ('gazillion',  'Gazillion',  5, 5000);

alter table public.games enable row level security;
revoke all on table public.games from anon, authenticated;
grant select on table public.games to anon, authenticated;
create policy "games: anyone can read"
  on public.games for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- The challenge day. One fixed timezone for everybody, decided here and not
-- by the device clock. Must match VITE_DAILY_TIMEZONE in the client (UTC).
-- ---------------------------------------------------------------------------
create function private.challenge_day(p_at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_at at time zone 'UTC')::date
$$;

create function private.challenge_today()
returns date
language sql
stable
set search_path = ''
as $$
  select private.challenge_day(now())
$$;

-- A daily challenge accepts results on its own day, plus the first hour of
-- the next one, so a game started just before midnight can still be saved.
-- `p_now` exists for tests; callers use the default.
create function private.is_open_challenge_date(d date, p_now timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select d = private.challenge_day(p_now)
      or (d = private.challenge_day(p_now) - 1
          and (p_now at time zone 'UTC')::time < time '01:00')
$$;

-- ---------------------------------------------------------------------------
-- Profiles: public identity of an account. No email, no password: those stay
-- in auth.users, which the Data API never exposes.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  show_in_leaderboards boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_username_not_reserved
    check (username not in ('admin', 'administrator', 'amministratore',
      'moderatore', 'moderator', 'root', 'support', 'supporto', 'staff',
      'settegiochi', 'sette_giochi', 'system', 'sistema')),
  constraint profiles_display_name_shape
    check (display_name is null
      or (char_length(btrim(display_name)) between 1 and 40
          and display_name !~ '[[:cntrl:]]'))
);
-- Usernames are lowercase by the format check, so this is case-insensitive.
create unique index profiles_username_key on public.profiles (username);

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
-- Column-level: id, created_at and updated_at can never be changed by a user.
grant update (username, display_name, show_in_leaderboards)
  on table public.profiles to authenticated;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Every new account gets a profile. The username chosen at sign-up (sent as
-- user metadata) is used when valid and free; otherwise a neutral one is
-- generated, and the player can change it from the account page.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  fallback text := 'giocatore_' || substr(replace(new.id::text, '-', ''), 1, 10);
begin
  if wanted !~ '^[a-z0-9_]{3,20}$' then
    wanted := fallback;
  end if;
  begin
    insert into public.profiles (id, username) values (new.id, wanted);
  exception when unique_violation or check_violation then
    insert into public.profiles (id, username) values (new.id, fallback);
  end;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Lets the sign-up form say "already taken" before submitting. Usernames are
-- public (they appear in leaderboards), so this reveals nothing new.
create function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[a-z0-9_]{3,20}$'
     and p_username not in ('admin', 'administrator', 'amministratore',
       'moderatore', 'moderator', 'root', 'support', 'supporto', 'staff',
       'settegiochi', 'sette_giochi', 'system', 'sistema')
     and not exists (select 1 from public.profiles where username = p_username)
$$;
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Preferences: small key/value settings that follow the account.
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint user_preferences_key_format check (key ~ '^[a-z0-9:._-]{1,64}$'),
  constraint user_preferences_value_length check (char_length(value) <= 2000)
);

create trigger user_preferences_touch_updated_at
  before update on public.user_preferences
  for each row execute function private.touch_updated_at();

create function private.limit_preferences()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.user_preferences where user_id = new.user_id) >= 50 then
    raise exception 'too_many_preferences' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger user_preferences_limit
  before insert on public.user_preferences
  for each row execute function private.limit_preferences();

alter table public.user_preferences enable row level security;
revoke all on table public.user_preferences from anon, authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

create policy "preferences: read own"
  on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "preferences: insert own"
  on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "preferences: update own"
  on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "preferences: delete own"
  on public.user_preferences for delete to authenticated
  using (user_id = (select auth.uid()));

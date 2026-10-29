-- Sette Giochi — game results.
--
-- Two tables on purpose, as in the local adapter:
--   daily_results  official results, one per (user, game, day). Users can READ
--                  their own rows and nothing else: rows are written only by
--                  the `submit-daily` Edge Function (service role), after it
--                  has replayed the answers and recomputed the score, or by
--                  the guest import below, which marks them as unverified.
--   free_results   practice and archive replays. Not competitive: the player
--                  writes their own rows directly, within bounds.

-- Shared bounds check: a score can never exceed what the game can award.
create function private.check_score_bounds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_max integer;
begin
  select max_score into v_max from public.games where id = new.game_id;
  if v_max is null then
    raise exception 'unknown_game' using errcode = 'P0001';
  end if;
  if new.score > v_max then
    raise exception 'score_out_of_bounds' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Official daily results
-- ---------------------------------------------------------------------------
create table public.daily_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id),
  challenge_date date not null,
  score integer not null check (score >= 0),
  won boolean not null,
  completed boolean not null,
  rounds smallint not null check (rounds between 1 and 20),
  -- What the player answered, round by round, exactly as the server replayed
  -- it. Kept so a result can be re-verified if a scoring bug is ever found.
  answers jsonb,
  detail jsonb not null default '{}'::jsonb,
  duration_ms integer,
  -- 'server_replay': score recomputed by the server from the answers.
  -- 'guest_import':  copied from a guest's browser; never used in rankings.
  verification text not null,
  generator_version text,
  created_at timestamptz not null default now(),
  constraint daily_results_one_per_day unique (user_id, game_id, challenge_date),
  constraint daily_results_verification check (verification in ('server_replay', 'guest_import')),
  constraint daily_results_replay_has_answers check (verification <> 'server_replay' or answers is not null),
  constraint daily_results_answers_shape check (answers is null
    or (jsonb_typeof(answers) = 'array' and pg_column_size(answers) <= 8192)),
  constraint daily_results_detail_shape check (jsonb_typeof(detail) = 'object'
    and pg_column_size(detail) <= 4096),
  constraint daily_results_duration check (duration_ms is null
    or duration_ms between 0 and 86400000),
  constraint daily_results_date_range check (challenge_date >= date '2025-01-01')
);

create index daily_results_ranking_idx
  on public.daily_results (game_id, challenge_date, score desc, created_at)
  where verification = 'server_replay';
create index daily_results_user_idx
  on public.daily_results (user_id, challenge_date desc);

create trigger daily_results_score_bounds
  before insert or update on public.daily_results
  for each row execute function private.check_score_bounds();

alter table public.daily_results enable row level security;
revoke all on table public.daily_results from anon, authenticated;
grant select on table public.daily_results to authenticated;
-- No insert, update or delete for players: an official result, once written,
-- cannot be changed or deleted and replayed. It goes away with the account.

create policy "daily results: read own"
  on public.daily_results for select to authenticated
  using (user_id = (select auth.uid()));

-- Called only by the submit-daily Edge Function, with the service role, after
-- it has verified the user's token and replayed the answers. Idempotent: a
-- second submission for the same day returns the stored row untouched.
create function public.record_verified_daily_result(
  p_user_id uuid,
  p_game_id text,
  p_challenge_date date,
  p_score integer,
  p_won boolean,
  p_rounds smallint,
  p_answers jsonb,
  p_detail jsonb,
  p_duration_ms integer,
  p_generator_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.daily_results;
begin
  if p_user_id is null then
    raise exception 'missing_user' using errcode = 'P0001';
  end if;
  if not private.is_open_challenge_date(p_challenge_date) then
    raise exception 'challenge_closed' using errcode = 'P0001';
  end if;

  insert into public.daily_results (user_id, game_id, challenge_date, score,
    won, completed, rounds, answers, detail, duration_ms, verification,
    generator_version)
  values (p_user_id, p_game_id, p_challenge_date, p_score, p_won, true,
    p_rounds, p_answers, coalesce(p_detail, '{}'::jsonb), p_duration_ms,
    'server_replay', p_generator_version)
  on conflict on constraint daily_results_one_per_day do nothing
  returning * into v_row;

  if found then
    return jsonb_build_object('created', true, 'result', to_jsonb(v_row));
  end if;

  select * into v_row from public.daily_results
   where user_id = p_user_id and game_id = p_game_id
     and challenge_date = p_challenge_date;
  return jsonb_build_object('created', false, 'result', to_jsonb(v_row));
end
$$;
revoke execute on function public.record_verified_daily_result(uuid, text, date,
  integer, boolean, smallint, jsonb, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.record_verified_daily_result(uuid, text, date,
  integer, boolean, smallint, jsonb, jsonb, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- Practice and archive results
-- ---------------------------------------------------------------------------
create table public.free_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null references public.games (id),
  level_id text not null,
  mode text not null,
  score integer not null check (score >= 0),
  won boolean not null,
  completed boolean not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint free_results_mode check (mode in ('archive', 'practice')),
  constraint free_results_level_id check (level_id ~ '^[a-z0-9:._-]{1,80}$'),
  constraint free_results_detail_shape check (jsonb_typeof(detail) = 'object'
    and pg_column_size(detail) <= 4096)
);

create index free_results_user_idx on public.free_results (user_id, created_at desc);

create trigger free_results_score_bounds
  before insert or update on public.free_results
  for each row execute function private.check_score_bounds();

-- Direct inserts are allowed, so cap their rate: a person finishes a game in
-- tens of seconds, a script in milliseconds. Only the player's own direct
-- inserts are limited (current_user = 'authenticated'); the guest import runs
-- as the function owner and is bounded by its own size limit instead.
create function private.limit_free_results()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (select count(*) from public.free_results
       where user_id = new.user_id
         and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger free_results_rate_limit
  before insert on public.free_results
  for each row execute function private.limit_free_results();

alter table public.free_results enable row level security;
revoke all on table public.free_results from anon, authenticated;
grant select, delete on table public.free_results to authenticated;
-- Column-level: created_at is always the server's clock.
grant insert (id, user_id, game_id, level_id, mode, score, won, completed, detail)
  on table public.free_results to authenticated;

create policy "free results: read own"
  on public.free_results for select to authenticated
  using (user_id = (select auth.uid()));
create policy "free results: insert own"
  on public.free_results for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "free results: delete own"
  on public.free_results for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Guest import: copy what a player did as a guest on this device into their
-- new account. Every row is re-checked here; nothing is trusted. Imported
-- daily results are marked 'guest_import' and never enter a ranking.
-- ---------------------------------------------------------------------------
create function private.try_date(p text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return p::date;
exception when others then
  return null;
end
$$;

create function private.try_timestamptz(p text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
begin
  if p is null or char_length(p) > 40 then
    return null;
  end if;
  return p::timestamptz;
exception when others then
  return null;
end
$$;

create function public.import_guest_results(p_daily jsonb, p_free jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_daily_in integer := 0;
  v_free_in integer := 0;
  v_daily_total integer := 0;
  v_free_total integer := 0;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_daily, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_free, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  v_daily_total := jsonb_array_length(coalesce(p_daily, '[]'::jsonb));
  v_free_total := jsonb_array_length(coalesce(p_free, '[]'::jsonb));
  if v_daily_total > 3000 or v_free_total > 3000 then
    raise exception 'payload_too_large' using errcode = '22023';
  end if;

  with src as (
    select e
      from jsonb_array_elements(coalesce(p_daily, '[]'::jsonb)) as t(e)
     where jsonb_typeof(e) = 'object'
  ), parsed as (
    select e ->> 'gameId' as game_id,
           private.try_date(e ->> 'challengeDate') as challenge_date,
           case when jsonb_typeof(e -> 'score') = 'number'
                 and (e ->> 'score') ~ '^\d{1,9}$'
                then (e ->> 'score')::integer end as score,
           case when jsonb_typeof(e -> 'won') = 'boolean'
                then (e ->> 'won')::boolean end as won,
           case when jsonb_typeof(e -> 'completed') = 'boolean'
                then (e ->> 'completed')::boolean end as completed,
           case when jsonb_typeof(e -> 'detail') = 'object'
                 and pg_column_size(e -> 'detail') <= 4096
                then e -> 'detail' else '{}'::jsonb end as detail,
           private.try_timestamptz(e ->> 'createdAt') as created_at
      from src
  ), valid as (
    select p.*, g.rounds
      from parsed p
      join public.games g on g.id = p.game_id
     where p.challenge_date between date '2025-01-01' and private.challenge_today()
       and p.score between 0 and g.max_score
       and p.won is not null and p.completed is not null
  ), inserted as (
    insert into public.daily_results (user_id, game_id, challenge_date, score,
      won, completed, rounds, answers, detail, verification, created_at)
    select v_user, game_id, challenge_date, score, won, completed, rounds,
           null, detail, 'guest_import',
           least(coalesce(created_at, now()), now())
      from valid
    on conflict on constraint daily_results_one_per_day do nothing
    returning 1
  )
  select count(*) into v_daily_in from inserted;

  with src as (
    select e
      from jsonb_array_elements(coalesce(p_free, '[]'::jsonb)) as t(e)
     where jsonb_typeof(e) = 'object'
  ), parsed as (
    select e ->> 'gameId' as game_id,
           e ->> 'levelId' as level_id,
           e ->> 'mode' as mode,
           case when jsonb_typeof(e -> 'score') = 'number'
                 and (e ->> 'score') ~ '^\d{1,9}$'
                then (e ->> 'score')::integer end as score,
           case when jsonb_typeof(e -> 'won') = 'boolean'
                then (e ->> 'won')::boolean end as won,
           case when jsonb_typeof(e -> 'completed') = 'boolean'
                then (e ->> 'completed')::boolean end as completed,
           case when jsonb_typeof(e -> 'detail') = 'object'
                 and pg_column_size(e -> 'detail') <= 4096
                then e -> 'detail' else '{}'::jsonb end as detail,
           private.try_timestamptz(e ->> 'createdAt') as created_at
      from src
  ), valid as (
    select p.*
      from parsed p
      join public.games g on g.id = p.game_id
     where p.level_id ~ '^[a-z0-9:._-]{1,80}$'
       and p.mode in ('archive', 'practice')
       and p.score between 0 and g.max_score
       and p.won is not null and p.completed is not null
  ), inserted as (
    insert into public.free_results (user_id, game_id, level_id, mode, score,
      won, completed, detail, created_at)
    select v_user, game_id, level_id, mode, score, won, completed, detail,
           least(coalesce(created_at, now()), now())
      from valid
    returning 1
  )
  select count(*) into v_free_in from inserted;

  return jsonb_build_object(
    'dailyImported', v_daily_in,
    'freeImported', v_free_in,
    'skipped', (v_daily_total - v_daily_in) + (v_free_total - v_free_in)
  );
end
$$;
revoke execute on function public.import_guest_results(jsonb, jsonb) from public, anon;
grant execute on function public.import_guest_results(jsonb, jsonb) to authenticated;

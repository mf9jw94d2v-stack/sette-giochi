-- Sette Giochi — leaderboards.
--
-- Rules, stated once:
--   * Only results whose score the server recomputed ('server_replay') count.
--     Guest imports never do.
--   * One leaderboard per game: the seven games score on different scales
--     (500 to 7000 points), so adding them up would rank the games, not the
--     players. There is no cross-game ranking on purpose.
--   * Ties share the rank (1, 1, 3). Among equals, the earlier submission is
--     listed first; it does not change the rank.
--   * Ranks are computed over everybody who played; players who chose not to
--     appear are simply not listed, so the ranks shown stay true.
--   * Only username and display name leave the database. Never the email.

create function public.daily_leaderboard(
  p_game_id text,
  p_challenge_date date,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  rank bigint,
  username text,
  display_name text,
  score integer,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select r.user_id, r.score, r.created_at, r.id,
           rank() over (order by r.score desc) as rank
      from public.daily_results r
     where r.game_id = p_game_id
       and r.challenge_date = p_challenge_date
       and r.verification = 'server_replay'
       and r.challenge_date <= private.challenge_today()
  )
  select k.rank, p.username, p.display_name, k.score,
         coalesce(k.user_id = (select auth.uid()), false) as is_me
    from ranked k
    join public.profiles p on p.id = k.user_id
   where p.show_in_leaderboards or k.user_id = (select auth.uid())
   order by k.rank, k.created_at, k.id
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Where the signed-in player stands on a day, even if they are not listed.
create function public.my_daily_standing(p_game_id text, p_challenge_date date)
returns table (rank bigint, participants bigint, score integer)
language sql
stable
security definer
set search_path = ''
as $$
  with day as (
    select r.user_id, r.score
      from public.daily_results r
     where r.game_id = p_game_id
       and r.challenge_date = p_challenge_date
       and r.verification = 'server_replay'
  ), me as (
    select d.score from day d where d.user_id = (select auth.uid())
  )
  select (select count(*) from day d where d.score > me.score) + 1,
         (select count(*) from day),
         me.score
    from me
$$;

-- A week is Monday to Sunday. The total is the sum of the seven daily scores
-- of ONE game: the same scale, so it can be added up.
create function public.weekly_leaderboard(
  p_game_id text,
  p_week_start date,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  rank bigint,
  username text,
  display_name text,
  total integer,
  days_played integer,
  is_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_week_start is null or extract(isodow from p_week_start) <> 1 then
    raise exception 'week_must_start_on_monday' using errcode = '22023';
  end if;
  return query
  with totals as (
    select r.user_id,
           sum(r.score)::integer as total,
           count(*)::integer as days_played,
           max(r.created_at) as last_at
      from public.daily_results r
     where r.game_id = p_game_id
       and r.challenge_date between p_week_start and p_week_start + 6
       and r.verification = 'server_replay'
     group by r.user_id
  ), ranked as (
    select t.*, rank() over (order by t.total desc) as rank from totals t
  )
  select k.rank, p.username, p.display_name, k.total, k.days_played,
         coalesce(k.user_id = (select auth.uid()), false)
    from ranked k
    join public.profiles p on p.id = k.user_id
   where p.show_in_leaderboards or k.user_id = (select auth.uid())
   order by k.rank, k.last_at, p.username
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end
$$;

revoke execute on function public.daily_leaderboard(text, date, integer, integer) from public;
revoke execute on function public.my_daily_standing(text, date) from public;
revoke execute on function public.weekly_leaderboard(text, date, integer, integer) from public;
grant execute on function public.daily_leaderboard(text, date, integer, integer) to anon, authenticated;
grant execute on function public.my_daily_standing(text, date) to authenticated;
grant execute on function public.weekly_leaderboard(text, date, integer, integer) to anon, authenticated;

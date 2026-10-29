-- Test-only stand-in for the parts of Supabase our migrations rely on.
-- NOT a migration and never applied to a real project.
--
-- It reproduces, as faithfully as needed:
--   * the three API roles (anon, authenticated, service_role with BYPASSRLS);
--   * auth.users (only the columns we read) and auth.uid(), which reads the
--     `sub` claim of the request JWT exactly like Supabase's own definition;
--   * Supabase's default privileges: everything new in `public` is granted to
--     anon, authenticated and service_role, which is why every migration has
--     to revoke before it grants.
-- What it does NOT reproduce: GoTrue, PostgREST, Storage, Realtime.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

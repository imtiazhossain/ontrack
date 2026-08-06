-- Privileged account flags (developer tools, analytics admin).
-- Grant/revoke with the service role only — never hardcode personal emails in app code.

create table if not exists public.account_flags (
  user_id uuid primary key references auth.users on delete cascade,
  developer_tools boolean not null default false,
  analytics_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.account_flags enable row level security;

drop policy if exists "users read own account_flags" on public.account_flags;
create policy "users read own account_flags"
on public.account_flags for select
using (user_id = auth.uid());

-- Authenticated clients can read their own row; they cannot self-grant.
-- Service role bypasses RLS for admin grants/revokes by user_id.
grant select on public.account_flags to authenticated;

create or replace function public.set_account_flags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists account_flags_updated_at on public.account_flags;
create trigger account_flags_updated_at
before update on public.account_flags
for each row execute function public.set_account_flags_updated_at();

-- Prefer the flags table over any email allowlist for product analytics.
create or replace function public.analytics_product_summary(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  allowed boolean := false;
  window_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  since_day date := (timezone('utc', now()))::date - (window_days - 1);
  total_users bigint := 0;
  active_users bigint := 0;
  total_sessions bigint := 0;
  total_active_ms bigint := 0;
  top_surfaces jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(f.analytics_admin, false)
  into allowed
  from public.account_flags f
  where f.user_id = uid;

  if not coalesce(allowed, false) then
    raise exception 'not authorized';
  end if;

  select count(*) into total_users from auth.users;

  select
    count(distinct d.user_id),
    coalesce(sum(d.session_count), 0),
    coalesce(sum(d.active_ms), 0)
  into active_users, total_sessions, total_active_ms
  from public.analytics_daily d
  where d.day >= since_day;

  with exploded as (
    select key as surface, sum((value)::bigint) as active_ms
    from public.analytics_daily d,
      lateral jsonb_each_text(d.surfaces)
    where d.day >= since_day
    group by key
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object('surface', surface, 'activeMs', active_ms)
      order by active_ms desc
    ),
    '[]'::jsonb
  )
  into top_surfaces
  from (
    select surface, active_ms
    from exploded
    order by active_ms desc
    limit 12
  ) ranked;

  return jsonb_build_object(
    'windowDays', window_days,
    'sinceDay', since_day,
    'totalUsers', total_users,
    'activeUsers', active_users,
    'totalSessions', total_sessions,
    'totalActiveMs', total_active_ms,
    'topSurfaces', top_surfaces
  );
end;
$$;

revoke all on function public.analytics_product_summary(integer) from public;
grant execute on function public.analytics_product_summary(integer) to authenticated;

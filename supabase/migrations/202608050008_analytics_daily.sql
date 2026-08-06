-- First-party usage rollups for product insights (no PII / no Health content).

create table if not exists public.analytics_daily (
  user_id uuid references auth.users on delete cascade not null,
  day date not null,
  session_count integer not null default 0 check (session_count >= 0),
  active_ms bigint not null default 0 check (active_ms >= 0),
  surfaces jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists analytics_daily_day_idx on public.analytics_daily (day desc);

alter table public.analytics_daily enable row level security;

create policy "users read own analytics_daily"
on public.analytics_daily for select
using (user_id = auth.uid());

create policy "users insert own analytics_daily"
on public.analytics_daily for insert
with check (user_id = auth.uid());

create policy "users update own analytics_daily"
on public.analytics_daily for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.set_analytics_daily_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists analytics_daily_updated_at on public.analytics_daily;
create trigger analytics_daily_updated_at
before update on public.analytics_daily
for each row execute function public.set_analytics_daily_updated_at();

-- Merge daily rollups from the signed-in device (additive upsert).
create or replace function public.upsert_analytics_daily(
  p_day date,
  p_session_count integer,
  p_active_ms bigint,
  p_surfaces jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_surfaces jsonb;
  merged jsonb := '{}'::jsonb;
  key text;
  next_ms bigint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_day is null or p_session_count is null or p_active_ms is null then
    raise exception 'invalid payload';
  end if;
  if p_session_count < 0 or p_active_ms < 0 then
    raise exception 'invalid counters';
  end if;
  if p_surfaces is null or jsonb_typeof(p_surfaces) <> 'object' then
    p_surfaces := '{}'::jsonb;
  end if;

  select surfaces into existing_surfaces
  from public.analytics_daily
  where user_id = uid and day = p_day;

  if existing_surfaces is null then
    merged := p_surfaces;
  else
    merged := existing_surfaces;
    for key in select jsonb_object_keys(p_surfaces)
    loop
      next_ms := coalesce((merged ->> key)::bigint, 0)
        + coalesce((p_surfaces ->> key)::bigint, 0);
      merged := jsonb_set(merged, array[key], to_jsonb(next_ms), true);
    end loop;
  end if;

  insert into public.analytics_daily as d (user_id, day, session_count, active_ms, surfaces)
  values (uid, p_day, p_session_count, p_active_ms, merged)
  on conflict (user_id, day) do update
  set
    session_count = d.session_count + excluded.session_count,
    active_ms = d.active_ms + excluded.active_ms,
    surfaces = merged,
    updated_at = now();
end;
$$;

revoke all on function public.upsert_analytics_daily(date, integer, bigint, jsonb) from public;
grant execute on function public.upsert_analytics_daily(date, integer, bigint, jsonb) to authenticated;

-- Product summary for the founder allowlist only (aggregate, no per-user rows).
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

  -- Email allowlists are forbidden; superseded by public.account_flags in a later migration.
  select false into allowed;

  if not allowed then
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

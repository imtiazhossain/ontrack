-- Shared trip expenses: host + accepted members read/write a single document
-- keyed by the host's trip_id. Invite URL payloads stay itinerary-only.

create table if not exists public.travel_trip_expenses (
  trip_id text primary key check (length(btrim(trip_id)) between 1 and 200),
  expenses jsonb not null default '[]'::jsonb,
  people jsonb not null default '[]'::jsonb,
  base_currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  owner_user_id uuid not null references auth.users(id) on delete cascade
);

alter table public.travel_trip_expenses enable row level security;
revoke all on public.travel_trip_expenses from anon, authenticated;

create or replace function public.is_travel_trip_host(requested_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.travel_invites as invite
    where invite.trip_id = btrim(requested_trip_id)
      and invite.inviter_user_id = auth.uid()
      and invite.revoked_at is null
    union all
    select 1
    from public.travel_open_join_links as link
    where link.trip_id = btrim(requested_trip_id)
      and link.host_user_id = auth.uid()
      and link.revoked_at is null
      and link.expires_at > now()
  );
$$;

create or replace function public.is_travel_trip_member(requested_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.travel_invites as invite
    where invite.trip_id = btrim(requested_trip_id)
      and invite.accepted_by_user_id = auth.uid()
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
  );
$$;

create or replace function public.travel_trip_id_for_access(access_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select invite.trip_id
  from public.travel_invites as invite
  where invite.code = access_code
    and invite.expires_at > now()
    and invite.revoked_at is null
    and auth.uid() is not null
    and (
      invite.inviter_user_id = auth.uid()
      or (
        invite.accepted_by_user_id = auth.uid()
        and invite.accepted_at is not null
      )
    )
  limit 1;
$$;

create or replace function public.publish_travel_trip_expenses(
  requested_trip_id text,
  requested_expenses jsonb,
  requested_people jsonb,
  requested_base_currency text,
  requested_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
  normalized_currency text := upper(btrim(coalesce(requested_base_currency, 'USD')));
  existing public.travel_trip_expenses%rowtype;
begin
  if actor is null
    or length(normalized_trip) not between 1 and 200
    or jsonb_typeof(requested_expenses) <> 'array'
    or jsonb_typeof(requested_people) <> 'array'
    or octet_length(requested_expenses::text) > 200000
    or octet_length(requested_people::text) > 50000
    or length(normalized_currency) <> 3
    or requested_updated_at is null then
    raise exception 'Invalid travel expense snapshot.';
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or public.is_travel_trip_member(normalized_trip)
  ) then
    raise exception 'You do not have access to this trip’s expenses.';
  end if;

  select * into existing
  from public.travel_trip_expenses as row
  where row.trip_id = normalized_trip
  limit 1;

  if existing.trip_id is not null and existing.updated_at > requested_updated_at then
    return jsonb_build_object(
      'tripId', existing.trip_id,
      'expenses', existing.expenses,
      'people', existing.people,
      'baseCurrency', existing.base_currency,
      'updatedAt', existing.updated_at,
      'stale', true
    );
  end if;

  insert into public.travel_trip_expenses (
    trip_id,
    expenses,
    people,
    base_currency,
    updated_at,
    owner_user_id
  )
  values (
    normalized_trip,
    requested_expenses,
    requested_people,
    normalized_currency,
    requested_updated_at,
    coalesce(existing.owner_user_id, actor)
  )
  on conflict (trip_id) do update
  set
    expenses = excluded.expenses,
    people = excluded.people,
    base_currency = excluded.base_currency,
    updated_at = excluded.updated_at
  where public.travel_trip_expenses.updated_at <= excluded.updated_at;

  select * into existing
  from public.travel_trip_expenses as row
  where row.trip_id = normalized_trip
  limit 1;

  return jsonb_build_object(
    'tripId', existing.trip_id,
    'expenses', existing.expenses,
    'people', existing.people,
    'baseCurrency', existing.base_currency,
    'updatedAt', existing.updated_at,
    'stale', false
  );
end;
$$;

create or replace function public.fetch_travel_trip_expenses(requested_trip_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_trip text := btrim(requested_trip_id);
  existing public.travel_trip_expenses%rowtype;
begin
  if auth.uid() is null or length(normalized_trip) not between 1 and 200 then
    return null;
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or public.is_travel_trip_member(normalized_trip)
  ) then
    raise exception 'You do not have access to this trip’s expenses.';
  end if;

  select * into existing
  from public.travel_trip_expenses as row
  where row.trip_id = normalized_trip
  limit 1;

  if existing.trip_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'tripId', existing.trip_id,
    'expenses', existing.expenses,
    'people', existing.people,
    'baseCurrency', existing.base_currency,
    'updatedAt', existing.updated_at
  );
end;
$$;

create or replace function public.fetch_travel_trip_expenses_by_access(access_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  trip text;
begin
  trip := public.travel_trip_id_for_access(access_code);
  if trip is null then
    return null;
  end if;
  return public.fetch_travel_trip_expenses(trip);
end;
$$;

-- Include tripId alongside invite payload so joiners can store hostTripId.
create or replace function public.resolve_travel_invite(invite_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select invite.payload || jsonb_build_object('tripId', invite.trip_id)
  from public.travel_invites as invite
  where invite.code = invite_code
    and invite.expires_at > now()
    and invite.revoked_at is null
    and auth.uid() is not null
    and invite.invitee_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

revoke all on function public.is_travel_trip_host(text) from public;
revoke all on function public.is_travel_trip_member(text) from public;
revoke all on function public.travel_trip_id_for_access(text) from public;
revoke all on function public.publish_travel_trip_expenses(text, jsonb, jsonb, text, timestamptz) from public;
revoke all on function public.fetch_travel_trip_expenses(text) from public;
revoke all on function public.fetch_travel_trip_expenses_by_access(text) from public;

grant execute on function public.is_travel_trip_host(text) to authenticated;
grant execute on function public.is_travel_trip_member(text) to authenticated;
grant execute on function public.travel_trip_id_for_access(text) to authenticated;
grant execute on function public.publish_travel_trip_expenses(text, jsonb, jsonb, text, timestamptz) to authenticated;
grant execute on function public.fetch_travel_trip_expenses(text) to authenticated;
grant execute on function public.fetch_travel_trip_expenses_by_access(text) to authenticated;

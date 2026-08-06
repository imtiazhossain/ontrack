-- Prevent clients from winning LWW forever with a far-future updated_at.

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
  -- Cap clock skew; never accept timestamps far in the future.
  publish_at timestamptz := least(
    requested_updated_at,
    now() + interval '2 minutes'
  );
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

  if existing.trip_id is not null and existing.updated_at > publish_at then
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
    publish_at,
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

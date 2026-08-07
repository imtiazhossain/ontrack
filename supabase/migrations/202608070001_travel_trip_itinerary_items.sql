-- Per-user trip itinerary items with selective share visibility.
-- Unlike expenses (one shared document), rows are filtered server-side so
-- private stops never reach other travelers.

create table if not exists public.travel_trip_itinerary_items (
  trip_id text not null check (length(btrim(trip_id)) between 1 and 200),
  item_id text not null check (length(btrim(item_id)) between 1 and 200),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  share_mode text not null default 'private'
    check (share_mode in ('private', 'trip', 'selected')),
  shared_with_user_ids uuid[] not null default '{}'::uuid[],
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (trip_id, item_id)
);

create index if not exists travel_trip_itinerary_items_trip_owner_idx
  on public.travel_trip_itinerary_items (trip_id, owner_user_id);

create index if not exists travel_trip_itinerary_items_trip_share_idx
  on public.travel_trip_itinerary_items (trip_id, share_mode);

alter table public.travel_trip_itinerary_items enable row level security;
revoke all on public.travel_trip_itinerary_items from anon, authenticated;

create or replace function public.travel_trip_itinerary_item_visible(
  owner_user_id uuid,
  share_mode text,
  shared_with_user_ids uuid[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      owner_user_id = auth.uid()
      or share_mode = 'trip'
      or (
        share_mode = 'selected'
        and auth.uid() = any (coalesce(shared_with_user_ids, '{}'::uuid[]))
      )
    );
$$;

create or replace function public.upsert_travel_trip_itinerary_items(
  requested_trip_id text,
  requested_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
  entry jsonb;
  item_id text;
  share_mode text;
  shared_with uuid[];
  payload jsonb;
  updated_at timestamptz;
  upserted int := 0;
begin
  if actor is null
    or length(normalized_trip) not between 1 and 200
    or jsonb_typeof(requested_items) <> 'array'
    or octet_length(requested_items::text) > 800000 then
    raise exception 'Invalid travel itinerary upsert.';
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or public.is_travel_trip_member(normalized_trip)
  ) then
    raise exception 'You do not have access to this trip’s itinerary.';
  end if;

  for entry in
    select value
    from jsonb_array_elements(requested_items) as value
  loop
    item_id := nullif(btrim(coalesce(entry ->> 'itemId', entry ->> 'id', '')), '');
    if item_id is null or length(item_id) > 200 then
      continue;
    end if;

    share_mode := lower(btrim(coalesce(entry ->> 'shareMode', 'private')));
    if share_mode not in ('private', 'trip', 'selected') then
      share_mode := 'private';
    end if;

    shared_with := coalesce(
      (
        select array_agg(distinct id)
        from (
          select nullif(btrim(value #>> '{}'), '')::uuid as id
          from jsonb_array_elements(
            case
              when jsonb_typeof(entry -> 'sharedWithUserIds') = 'array'
                then entry -> 'sharedWithUserIds'
              else '[]'::jsonb
            end
          ) as value
          where nullif(btrim(value #>> '{}'), '') ~*
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ) as parsed
        where id is not null
      ),
      '{}'::uuid[]
    );
    if share_mode <> 'selected' then
      shared_with := '{}'::uuid[];
    end if;

    payload := coalesce(entry -> 'payload', entry - 'itemId' - 'shareMode' - 'sharedWithUserIds' - 'updatedAt');
    if jsonb_typeof(payload) <> 'object' then
      continue;
    end if;
    if octet_length(payload::text) > 100000 then
      raise exception 'Itinerary item payload too large.';
    end if;

    begin
      updated_at := coalesce((entry ->> 'updatedAt')::timestamptz, now());
    exception
      when others then
        updated_at := now();
    end;

    insert into public.travel_trip_itinerary_items (
      trip_id,
      item_id,
      owner_user_id,
      share_mode,
      shared_with_user_ids,
      payload,
      updated_at
    )
    values (
      normalized_trip,
      item_id,
      actor,
      share_mode,
      shared_with,
      payload,
      updated_at
    )
    on conflict (trip_id, item_id) do update
    set
      share_mode = excluded.share_mode,
      shared_with_user_ids = excluded.shared_with_user_ids,
      payload = excluded.payload,
      updated_at = excluded.updated_at
    where public.travel_trip_itinerary_items.owner_user_id = actor
      and public.travel_trip_itinerary_items.updated_at <= excluded.updated_at;

    if found then
      upserted := upserted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'tripId', normalized_trip,
    'upserted', upserted
  );
end;
$$;

create or replace function public.delete_travel_trip_itinerary_items(
  requested_trip_id text,
  requested_item_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
  deleted_count int := 0;
begin
  if actor is null
    or length(normalized_trip) not between 1 and 200
    or requested_item_ids is null
    or cardinality(requested_item_ids) = 0 then
    raise exception 'Invalid travel itinerary delete.';
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or public.is_travel_trip_member(normalized_trip)
  ) then
    raise exception 'You do not have access to this trip’s itinerary.';
  end if;

  with removed as (
    delete from public.travel_trip_itinerary_items as row
    where row.trip_id = normalized_trip
      and row.item_id = any (requested_item_ids)
      and (
        row.owner_user_id = actor
        or public.is_travel_trip_manager(normalized_trip)
      )
    returning 1
  )
  select count(*)::int into deleted_count from removed;

  return jsonb_build_object(
    'tripId', normalized_trip,
    'deleted', deleted_count
  );
end;
$$;

create or replace function public.fetch_travel_trip_itinerary(requested_trip_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_trip text := btrim(requested_trip_id);
begin
  if auth.uid() is null or length(normalized_trip) not between 1 and 200 then
    return null;
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or public.is_travel_trip_member(normalized_trip)
  ) then
    raise exception 'You do not have access to this trip’s itinerary.';
  end if;

  return jsonb_build_object(
    'tripId', normalized_trip,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'itemId', row.item_id,
            'ownerUserId', row.owner_user_id,
            'shareMode', row.share_mode,
            'sharedWithUserIds', to_jsonb(row.shared_with_user_ids),
            'updatedAt', row.updated_at,
            'payload', row.payload
          )
          order by row.updated_at asc, row.item_id asc
        )
        from public.travel_trip_itinerary_items as row
        where row.trip_id = normalized_trip
          and public.travel_trip_itinerary_item_visible(
            row.owner_user_id,
            row.share_mode,
            row.shared_with_user_ids
          )
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.fetch_travel_trip_itinerary_by_access(access_code text)
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
  return public.fetch_travel_trip_itinerary(trip);
end;
$$;

revoke all on function public.travel_trip_itinerary_item_visible(uuid, text, uuid[]) from public;
revoke all on function public.upsert_travel_trip_itinerary_items(text, jsonb) from public;
revoke all on function public.delete_travel_trip_itinerary_items(text, text[]) from public;
revoke all on function public.fetch_travel_trip_itinerary(text) from public;
revoke all on function public.fetch_travel_trip_itinerary_by_access(text) from public;

grant execute on function public.travel_trip_itinerary_item_visible(uuid, text, uuid[]) to authenticated;
grant execute on function public.upsert_travel_trip_itinerary_items(text, jsonb) to authenticated;
grant execute on function public.delete_travel_trip_itinerary_items(text, text[]) to authenticated;
grant execute on function public.fetch_travel_trip_itinerary(text) to authenticated;
grant execute on function public.fetch_travel_trip_itinerary_by_access(text) to authenticated;

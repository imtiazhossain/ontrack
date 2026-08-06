-- Keep trip hostship durable after invites/open-join links are revoked or expire,
-- so a stranger who knows the local trip id cannot claim host and recreate the join link.

create or replace function public.travel_trip_host_user_id(requested_trip_id text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select link.host_user_id
      from public.travel_open_join_links as link
      where link.trip_id = btrim(requested_trip_id)
        and link.revoked_at is null
        and link.expires_at > now()
      order by link.created_at desc
      limit 1
    ),
    (
      select invite.inviter_user_id
      from public.travel_invites as invite
      where invite.trip_id = btrim(requested_trip_id)
        and invite.revoked_at is null
        and invite.inviter_user_id is not null
      order by invite.created_at desc
      limit 1
    ),
    (
      select link.host_user_id
      from public.travel_open_join_links as link
      where link.trip_id = btrim(requested_trip_id)
      order by link.created_at desc
      limit 1
    ),
    (
      select invite.inviter_user_id
      from public.travel_invites as invite
      where invite.trip_id = btrim(requested_trip_id)
        and invite.inviter_user_id is not null
      order by invite.created_at desc
      limit 1
    )
  );
$$;

create or replace function public.is_travel_trip_host(requested_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.travel_trip_host_user_id(btrim(requested_trip_id)) = auth.uid();
$$;

create or replace function public.create_travel_open_join_link(
  invite_trip_id text,
  invite_title text,
  invite_destination text,
  invite_start_date text,
  invite_end_date text,
  invite_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(invite_trip_id);
  normalized_title text := btrim(invite_title);
  normalized_destination text := btrim(invite_destination);
  normalized_start text := btrim(invite_start_date);
  normalized_end text := btrim(invite_end_date);
  host_id uuid;
  existing_code text;
  generated_code text;
begin
  if actor is null
    or length(normalized_trip) not between 1 and 200
    or length(normalized_title) not between 1 and 200
    or length(normalized_destination) not between 1 and 200
    or length(normalized_start) not between 8 and 32
    or length(normalized_end) not between 8 and 32
    or jsonb_typeof(invite_payload) <> 'object'
    or jsonb_typeof(invite_payload -> 'invite') <> 'string'
    or octet_length(invite_payload::text) > 50000 then
    raise exception 'A signed-in host and a valid trip preview are required.';
  end if;

  host_id := public.travel_trip_host_user_id(normalized_trip);
  if host_id is null then
    -- First server identity for this local trip id: the caller becomes host.
    host_id := actor;
  elsif not public.is_travel_trip_manager(normalized_trip) then
    raise exception 'Only the trip host or a co-host can manage the join link.';
  end if;

  select link.code into existing_code
  from public.travel_open_join_links as link
  where link.trip_id = normalized_trip
    and link.revoked_at is null
    and link.expires_at > now()
  order by link.created_at desc
  limit 1;

  if existing_code is not null then
    update public.travel_open_join_links
    set
      title = normalized_title,
      destination = normalized_destination,
      start_date = normalized_start,
      end_date = normalized_end,
      payload = invite_payload,
      expires_at = greatest(expires_at, now() + interval '365 days')
    where code = existing_code;
    return existing_code;
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(10), 'hex');
    begin
      insert into public.travel_open_join_links (
        code,
        trip_id,
        host_user_id,
        title,
        destination,
        start_date,
        end_date,
        payload
      )
      values (
        generated_code,
        normalized_trip,
        host_id,
        normalized_title,
        normalized_destination,
        normalized_start,
        normalized_end,
        invite_payload
      );
      return generated_code;
    exception when unique_violation then
      -- Retry rare code collisions.
    end;
  end loop;
end;
$$;

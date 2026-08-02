-- Fix ambiguous link_code references in open-join RPCs.
-- PL/pgSQL treats unqualified link_code as both the parameter and
-- travel_open_join_requests.link_code, which breaks status/request/resolve.

create or replace function public.request_travel_open_join(link_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Local copy avoids PL/pgSQL ambiguity with requests.link_code.
  v_link_code text := link_code;
  requester_id uuid := auth.uid();
  requester_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  requester_name text := public.travel_open_join_display_name();
  link public.travel_open_join_links%rowtype;
  existing public.travel_open_join_requests%rowtype;
  created public.travel_open_join_requests%rowtype;
begin
  if requester_id is null or length(requester_email) < 3 then
    raise exception 'Sign in to request to join this trip.';
  end if;

  select * into link
  from public.travel_open_join_links as candidate
  where candidate.code = v_link_code
    and candidate.revoked_at is null
    and candidate.expires_at > now()
  for share;
  if link.code is null then
    raise exception 'This join link is invalid or has expired.';
  end if;

  if link.host_user_id = requester_id then
    return jsonb_build_object(
      'status', 'host',
      'tripId', link.trip_id
    );
  end if;

  select * into existing
  from public.travel_open_join_requests as request
  where request.link_code = v_link_code
    and request.requester_user_id = requester_id
    and request.status in ('pending', 'approved')
  order by case when request.status = 'approved' then 0 else 1 end
  limit 1;

  if existing.id is not null then
    return jsonb_build_object(
      'status', existing.status,
      'requestId', existing.id,
      'tripId', existing.trip_id,
      'grantedInviteCode', existing.granted_invite_code
    );
  end if;

  insert into public.travel_open_join_requests (
    link_code,
    trip_id,
    requester_user_id,
    requester_name,
    requester_email
  )
  values (
    link.code,
    link.trip_id,
    requester_id,
    left(requester_name, 120),
    left(requester_email, 320)
  )
  returning * into created;

  return jsonb_build_object(
    'status', created.status,
    'requestId', created.id,
    'tripId', created.trip_id
  );
end;
$$;

create or replace function public.travel_open_join_status(link_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Local copy avoids PL/pgSQL ambiguity with requests.link_code.
  v_link_code text := link_code;
  requester_id uuid := auth.uid();
  link public.travel_open_join_links%rowtype;
  existing public.travel_open_join_requests%rowtype;
begin
  if requester_id is null then
    raise exception 'Sign in required.';
  end if;

  select * into link
  from public.travel_open_join_links as candidate
  where candidate.code = v_link_code
    and candidate.revoked_at is null
    and candidate.expires_at > now()
  limit 1;
  if link.code is null then
    return null;
  end if;

  if link.host_user_id = requester_id then
    return jsonb_build_object('status', 'host', 'tripId', link.trip_id);
  end if;

  select * into existing
  from public.travel_open_join_requests as request
  where request.link_code = v_link_code
    and request.requester_user_id = requester_id
  order by
    case request.status
      when 'approved' then 0
      when 'pending' then 1
      else 2
    end,
    request.created_at desc
  limit 1;

  if existing.id is null then
    return jsonb_build_object('status', 'none', 'tripId', link.trip_id);
  end if;

  return jsonb_build_object(
    'status', existing.status,
    'requestId', existing.id,
    'tripId', existing.trip_id,
    'grantedInviteCode', existing.granted_invite_code
  );
end;
$$;

create or replace function public.resolve_travel_open_join(link_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Local copy avoids PL/pgSQL ambiguity with requests.link_code.
  v_link_code text := link_code;
  requester_id uuid := auth.uid();
  link public.travel_open_join_links%rowtype;
  approved public.travel_open_join_requests%rowtype;
begin
  if requester_id is null then
    raise exception 'Sign in required.';
  end if;

  select * into link
  from public.travel_open_join_links as candidate
  where candidate.code = v_link_code
    and candidate.revoked_at is null
    and candidate.expires_at > now()
  limit 1;
  if link.code is null then
    return null;
  end if;

  if link.host_user_id = requester_id then
    return jsonb_build_object(
      'invite', link.payload ->> 'invite',
      'tripId', link.trip_id,
      'status', 'host'
    );
  end if;

  select * into approved
  from public.travel_open_join_requests as request
  where request.link_code = v_link_code
    and request.requester_user_id = requester_id
    and request.status = 'approved'
  limit 1;
  if approved.id is null then
    raise exception 'The trip host has not approved your join request yet.';
  end if;

  return jsonb_build_object(
    'invite', link.payload ->> 'invite',
    'tripId', link.trip_id,
    'status', 'approved',
    'grantedInviteCode', approved.granted_invite_code
  );
end;
$$;

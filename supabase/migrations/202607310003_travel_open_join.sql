-- Open trip join links: anyone with the link can request to join;
-- only the host can approve. Full itinerary payloads stay private until approved.

create table if not exists public.travel_open_join_links (
  code text primary key check (code ~ '^[a-f0-9]{20}$'),
  trip_id text not null,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date text not null,
  end_date text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days'),
  revoked_at timestamptz
);

create unique index if not exists travel_open_join_links_active_trip_idx
  on public.travel_open_join_links (trip_id)
  where revoked_at is null;

create index if not exists travel_open_join_links_host_idx
  on public.travel_open_join_links (host_user_id);

create table if not exists public.travel_open_join_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  link_code text not null references public.travel_open_join_links(code) on delete cascade,
  trip_id text not null,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  granted_invite_code text references public.travel_invites(code) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_user_id uuid references auth.users(id) on delete set null
);

create unique index if not exists travel_open_join_requests_pending_requester_idx
  on public.travel_open_join_requests (link_code, requester_user_id)
  where status = 'pending';

create unique index if not exists travel_open_join_requests_approved_requester_idx
  on public.travel_open_join_requests (link_code, requester_user_id)
  where status = 'approved';

create index if not exists travel_open_join_requests_trip_idx
  on public.travel_open_join_requests (trip_id, status, created_at desc);

alter table public.travel_open_join_links enable row level security;
alter table public.travel_open_join_requests enable row level security;

revoke all on public.travel_open_join_links from anon, authenticated;
revoke all on public.travel_open_join_requests from anon, authenticated;

create or replace function public.travel_open_join_display_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
    'onTrack member'
  );
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
  host_id uuid := auth.uid();
  normalized_trip text := btrim(invite_trip_id);
  normalized_title text := btrim(invite_title);
  normalized_destination text := btrim(invite_destination);
  normalized_start text := btrim(invite_start_date);
  normalized_end text := btrim(invite_end_date);
  existing_code text;
  generated_code text;
begin
  if host_id is null
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

  select link.code into existing_code
  from public.travel_open_join_links as link
  where link.trip_id = normalized_trip
    and link.host_user_id = host_id
    and link.revoked_at is null
    and link.expires_at > now()
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
      -- Extremely unlikely collision; try another code.
    end;
  end loop;
end;
$$;

create or replace function public.preview_travel_open_join(link_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', link.title,
    'destination', link.destination,
    'startDate', link.start_date,
    'endDate', link.end_date,
    'tripId', link.trip_id
  )
  from public.travel_open_join_links as link
  where link.code = link_code
    and link.revoked_at is null
    and link.expires_at > now()
  limit 1;
$$;

create or replace function public.request_travel_open_join(link_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
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
  where candidate.code = link_code
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
  where request.link_code = link_code
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
  requester_id uuid := auth.uid();
  link public.travel_open_join_links%rowtype;
  existing public.travel_open_join_requests%rowtype;
begin
  if requester_id is null then
    raise exception 'Sign in required.';
  end if;

  select * into link
  from public.travel_open_join_links as candidate
  where candidate.code = link_code
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
  where request.link_code = link_code
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

create or replace function public.list_travel_open_join_requests(invite_trip_id text)
returns table(
  id uuid,
  requester_name text,
  requester_email text,
  status text,
  created_at timestamptz,
  granted_invite_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    request.requester_name,
    request.requester_email,
    request.status,
    request.created_at,
    request.granted_invite_code
  from public.travel_open_join_requests as request
  join public.travel_open_join_links as link
    on link.code = request.link_code
  where request.trip_id = btrim(invite_trip_id)
    and link.host_user_id = auth.uid()
    and link.revoked_at is null
    and request.status = 'pending'
  order by request.created_at asc;
$$;

create or replace function public.decide_travel_open_join(
  request_id uuid,
  approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  host_id uuid := auth.uid();
  request public.travel_open_join_requests%rowtype;
  link public.travel_open_join_links%rowtype;
  generated_code text;
begin
  if host_id is null then
    raise exception 'Sign in required.';
  end if;

  select * into request
  from public.travel_open_join_requests as candidate
  where candidate.id = request_id
  for update;
  if request.id is null then
    raise exception 'Join request not found.';
  end if;

  select * into link
  from public.travel_open_join_links as candidate
  where candidate.code = request.link_code
  for update;
  if link.code is null
    or link.host_user_id <> host_id
    or link.revoked_at is not null
    or link.expires_at <= now() then
    raise exception 'Only the trip host can decide join requests.';
  end if;

  if request.status <> 'pending' then
    return jsonb_build_object(
      'status', request.status,
      'requestId', request.id,
      'grantedInviteCode', request.granted_invite_code,
      'requesterName', request.requester_name,
      'requesterEmail', request.requester_email
    );
  end if;

  if not approve then
    update public.travel_open_join_requests
    set
      status = 'rejected',
      decided_at = now(),
      decided_by_user_id = host_id
    where id = request.id;
    return jsonb_build_object(
      'status', 'rejected',
      'requestId', request.id,
      'requesterName', request.requester_name,
      'requesterEmail', request.requester_email
    );
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(10), 'hex');
    begin
      insert into public.travel_invites (
        code,
        payload,
        trip_id,
        invitee_name,
        invitee_email,
        inviter_user_id,
        accepted_at,
        accepted_by_user_id
      )
      values (
        generated_code,
        link.payload,
        link.trip_id,
        request.requester_name,
        request.requester_email,
        host_id,
        now(),
        request.requester_user_id
      );
      exit;
    exception when unique_violation then
      -- Retry rare code collisions.
    end;
  end loop;

  update public.travel_open_join_requests
  set
    status = 'approved',
    granted_invite_code = generated_code,
    decided_at = now(),
    decided_by_user_id = host_id
  where id = request.id;

  return jsonb_build_object(
    'status', 'approved',
    'requestId', request.id,
    'grantedInviteCode', generated_code,
    'requesterName', request.requester_name,
    'requesterEmail', request.requester_email
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
  requester_id uuid := auth.uid();
  link public.travel_open_join_links%rowtype;
  approved public.travel_open_join_requests%rowtype;
begin
  if requester_id is null then
    raise exception 'Sign in required.';
  end if;

  select * into link
  from public.travel_open_join_links as candidate
  where candidate.code = link_code
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
  where request.link_code = link_code
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

create or replace function public.revoke_travel_open_join_link(invite_trip_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.travel_open_join_links
  set revoked_at = coalesce(revoked_at, now())
  where trip_id = btrim(invite_trip_id)
    and host_user_id = auth.uid()
    and revoked_at is null;
$$;

revoke all on function public.travel_open_join_display_name() from public;
revoke all on function public.create_travel_open_join_link(text, text, text, text, text, jsonb) from public;
revoke all on function public.preview_travel_open_join(text) from public;
revoke all on function public.request_travel_open_join(text) from public;
revoke all on function public.travel_open_join_status(text) from public;
revoke all on function public.list_travel_open_join_requests(text) from public;
revoke all on function public.decide_travel_open_join(uuid, boolean) from public;
revoke all on function public.resolve_travel_open_join(text) from public;
revoke all on function public.revoke_travel_open_join_link(text) from public;

-- Preview is safe public metadata (title/destination/dates) so the web landing
-- can show the trip and prompt App Store download without signing in.
grant execute on function public.preview_travel_open_join(text) to anon, authenticated;

grant execute on function public.create_travel_open_join_link(text, text, text, text, text, jsonb)
  to authenticated;
grant execute on function public.request_travel_open_join(text) to authenticated;
grant execute on function public.travel_open_join_status(text) to authenticated;
grant execute on function public.list_travel_open_join_requests(text) to authenticated;
grant execute on function public.decide_travel_open_join(uuid, boolean) to authenticated;
grant execute on function public.resolve_travel_open_join(text) to authenticated;
grant execute on function public.revoke_travel_open_join_link(text) to authenticated;

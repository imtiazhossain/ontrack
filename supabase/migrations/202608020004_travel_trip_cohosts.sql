-- Trip co-hosts: shared friend/invite management without transferring sole hostship.
-- Sole host stays inferred from invites / open-join; cohosts are an explicit table.

create table if not exists public.travel_trip_cohosts (
  trip_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_by_user_id uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index if not exists travel_trip_cohosts_user_idx
  on public.travel_trip_cohosts (user_id);

alter table public.travel_trip_cohosts enable row level security;

revoke all on public.travel_trip_cohosts from anon, authenticated;

create or replace function public.is_travel_trip_cohost(requested_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.travel_trip_cohosts as cohost
    where cohost.trip_id = btrim(requested_trip_id)
      and cohost.user_id = auth.uid()
  );
$$;

create or replace function public.is_travel_trip_manager(requested_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_travel_trip_host(btrim(requested_trip_id))
    or public.is_travel_trip_cohost(btrim(requested_trip_id));
$$;

create or replace function public.grant_travel_trip_cohost(
  requested_trip_id text,
  cohost_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
  host_id uuid;
begin
  if actor is null or length(normalized_trip) not between 1 and 200 then
    raise exception 'Sign in required.';
  end if;
  if not public.is_travel_trip_host(normalized_trip) then
    raise exception 'Only the trip host can make someone a co-host.';
  end if;

  host_id := public.travel_trip_host_user_id(normalized_trip);
  if cohost_user_id is null or cohost_user_id = actor or cohost_user_id = host_id then
    raise exception 'Pick a trip friend to make co-host.';
  end if;

  if not exists (
    select 1
    from public.travel_invites as invite
    where invite.trip_id = normalized_trip
      and invite.accepted_by_user_id = cohost_user_id
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
  ) then
    raise exception 'Co-host status can only be given to a current trip friend.';
  end if;

  insert into public.travel_trip_cohosts (trip_id, user_id, granted_by_user_id)
  values (normalized_trip, cohost_user_id, actor)
  on conflict (trip_id, user_id) do nothing;
end;
$$;

create or replace function public.revoke_travel_trip_cohost(
  requested_trip_id text,
  cohost_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
begin
  if actor is null or length(normalized_trip) not between 1 and 200 then
    raise exception 'Sign in required.';
  end if;
  if cohost_user_id is null then
    raise exception 'Pick a co-host to remove.';
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or (cohost_user_id = actor and public.is_travel_trip_cohost(normalized_trip))
  ) then
    raise exception 'Only the trip host can remove a co-host.';
  end if;

  delete from public.travel_trip_cohosts
  where trip_id = normalized_trip
    and user_id = cohost_user_id;
end;
$$;

create or replace function public.list_travel_trip_roster(requested_trip_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
  host_id uuid;
  host_email text;
  host_name text;
  roster jsonb := '[]'::jsonb;
  member_row record;
  is_cohost boolean;
begin
  if actor is null or length(normalized_trip) not between 1 and 200 then
    raise exception 'Sign in required.';
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or public.is_travel_trip_member(normalized_trip)
  ) then
    raise exception 'You do not have access to this trip’s friends.';
  end if;

  host_id := public.travel_trip_host_user_id(normalized_trip);
  if host_id is null then
    return '[]'::jsonb;
  end if;

  select account.email into host_email
  from auth.users as account
  where account.id = host_id
  limit 1;

  host_name := coalesce(
    public.travel_user_display_name(host_id),
    'Host'
  );

  roster := roster || jsonb_build_array(
    jsonb_build_object(
      'userId', host_id,
      'displayName', host_name,
      'email', host_email,
      'role', 'host'
    )
  );

  for member_row in
    select distinct on (invite.accepted_by_user_id)
      invite.accepted_by_user_id as user_id,
      invite.invitee_name as display_name,
      invite.invitee_email as email,
      invite.code as invite_code,
      invite.accepted_at
    from public.travel_invites as invite
    where invite.trip_id = normalized_trip
      and invite.accepted_by_user_id is not null
      and invite.accepted_by_user_id <> host_id
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
    order by invite.accepted_by_user_id, invite.accepted_at desc
  loop
    select exists (
      select 1
      from public.travel_trip_cohosts as cohost
      where cohost.trip_id = normalized_trip
        and cohost.user_id = member_row.user_id
    ) into is_cohost;

    roster := roster || jsonb_build_array(
      jsonb_build_object(
        'userId', member_row.user_id,
        'displayName', coalesce(nullif(btrim(member_row.display_name), ''), 'Traveler'),
        'email', member_row.email,
        'role', case when is_cohost then 'cohost' else 'member' end,
        'inviteCode', member_row.invite_code,
        'acceptedAt', member_row.accepted_at
      )
    );
  end loop;

  return roster;
end;
$$;

-- Attribute new invites to the sole host so cohosts cannot become inferred hosts.
create or replace function public.create_travel_invite(
  invite_payload jsonb,
  invite_trip_id text,
  invitee_name text,
  invitee_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
  normalized_name text := btrim(invitee_name);
  normalized_email text := lower(btrim(invitee_email));
  actor uuid := auth.uid();
  normalized_trip text := btrim(invite_trip_id);
  host_id uuid;
  inviter_id uuid;
begin
  if actor is null
    or jsonb_typeof(invite_payload) <> 'object'
    or jsonb_typeof(invite_payload -> 'invite') <> 'string'
    or octet_length(invite_payload::text) > 50000
    or length(normalized_trip) not between 1 and 200
    or length(normalized_name) not between 1 and 120
    or length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A signed-in account and a valid invitee email are required.';
  end if;

  host_id := public.travel_trip_host_user_id(normalized_trip);
  if host_id is null then
    inviter_id := actor;
  else
    if not public.is_travel_trip_manager(normalized_trip) then
      raise exception 'Only the trip host or a co-host can invite friends.';
    end if;
    inviter_id := host_id;
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
        inviter_user_id
      )
      values (
        generated_code,
        invite_payload,
        normalized_trip,
        normalized_name,
        normalized_email,
        inviter_id
      );
      return generated_code;
    exception when unique_violation then
      -- Retry rare code collisions.
    end;
  end loop;
end;
$$;

create or replace function public.revoke_travel_invite(invite_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.travel_invites%rowtype;
begin
  select * into invite
  from public.travel_invites as candidate
  where candidate.code = invite_code
  limit 1;

  if invite.code is null then
    return;
  end if;

  if not (
    invite.inviter_user_id = auth.uid()
    or public.is_travel_trip_manager(invite.trip_id)
  ) then
    raise exception 'Only the trip host or a co-host can remove this invite.';
  end if;

  update public.travel_invites
  set revoked_at = coalesce(revoked_at, now())
  where code = invite_code;

  if invite.accepted_by_user_id is not null then
    delete from public.travel_trip_cohosts
    where trip_id = invite.trip_id
      and user_id = invite.accepted_by_user_id;
  end if;
end;
$$;

create or replace function public.travel_invite_statuses(invite_codes text[])
returns table(code text, accepted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select invite.code, invite.accepted_at
  from public.travel_invites as invite
  where invite.code = any(invite_codes)
    and invite.expires_at > now()
    and invite.revoked_at is null
    and invite.accepted_at is not null
    and (
      invite.inviter_user_id = auth.uid()
      or public.is_travel_trip_manager(invite.trip_id)
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
  where request.trip_id = btrim(invite_trip_id)
    and public.is_travel_trip_manager(request.trip_id)
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
  actor uuid := auth.uid();
  request public.travel_open_join_requests%rowtype;
  link public.travel_open_join_links%rowtype;
  host_id uuid;
  generated_code text;
begin
  if actor is null then
    raise exception 'Sign in required.';
  end if;

  select * into request
  from public.travel_open_join_requests as candidate
  where candidate.id = request_id
  for update;
  if request.id is null then
    raise exception 'Join request not found.';
  end if;

  if not public.is_travel_trip_manager(request.trip_id) then
    raise exception 'Only the trip host or a co-host can decide join requests.';
  end if;

  select * into link
  from public.travel_open_join_links as candidate
  where candidate.code = request.link_code
  for update;
  if link.code is null
    or link.revoked_at is not null
    or link.expires_at <= now() then
    raise exception 'Only the trip host or a co-host can decide join requests.';
  end if;

  host_id := coalesce(public.travel_trip_host_user_id(request.trip_id), link.host_user_id);

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
      decided_by_user_id = actor
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
        request.trip_id,
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
    decided_at = now(),
    decided_by_user_id = actor,
    granted_invite_code = generated_code
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

-- Clear cohost row when someone becomes sole host or leaves.
create or replace function public.transfer_travel_trip_host(
  requested_trip_id text,
  new_host_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
  old_host uuid;
  sample_payload jsonb;
  sample_title text;
  sample_destination text;
  sample_start text;
  sample_end text;
  generated_code text;
  remapped jsonb;
  expense_row public.travel_trip_expenses%rowtype;
  old_host_name text;
  old_host_email text;
  new_host_name text;
begin
  if actor is null or length(normalized_trip) not between 1 and 200 then
    raise exception 'Sign in required.';
  end if;
  if not public.is_travel_trip_host(normalized_trip) then
    raise exception 'Only the trip host can transfer host status.';
  end if;
  if new_host_user_id = actor then
    raise exception 'That person is already the host.';
  end if;
  if not exists (
    select 1
    from public.travel_invites as invite
    where invite.trip_id = normalized_trip
      and invite.accepted_by_user_id = new_host_user_id
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
  ) then
    raise exception 'Host status can only be transferred to a current trip friend.';
  end if;

  old_host := actor;
  old_host_name := coalesce(public.travel_user_display_name(old_host), 'Traveler');
  new_host_name := coalesce(public.travel_user_display_name(new_host_user_id), 'Traveler');

  select account.email into old_host_email
  from auth.users as account
  where account.id = old_host
  limit 1;

  select invite.payload into sample_payload
  from public.travel_invites as invite
  where invite.trip_id = normalized_trip
    and invite.revoked_at is null
  order by invite.created_at desc
  limit 1;

  if sample_payload is null then
    select link.payload into sample_payload
    from public.travel_open_join_links as link
    where link.trip_id = normalized_trip
      and link.revoked_at is null
    order by link.created_at desc
    limit 1;
  end if;

  if sample_payload is null then
    sample_payload := jsonb_build_object('invite', '');
  end if;

  update public.travel_invites
  set inviter_user_id = new_host_user_id
  where trip_id = normalized_trip
    and revoked_at is null
    and inviter_user_id = old_host;

  update public.travel_open_join_links
  set host_user_id = new_host_user_id
  where trip_id = normalized_trip
    and revoked_at is null
    and host_user_id = old_host;

  update public.travel_trip_expenses
  set owner_user_id = new_host_user_id
  where trip_id = normalized_trip
    and owner_user_id = old_host;

  select * into expense_row
  from public.travel_trip_expenses as row
  where row.trip_id = normalized_trip
  limit 1;

  if expense_row.trip_id is not null then
    remapped := public.remap_travel_trip_expense_snapshot(
      expense_row.expenses,
      expense_row.people,
      old_host,
      new_host_user_id
    );
    update public.travel_trip_expenses
    set
      expenses = remapped -> 'expenses',
      people = remapped -> 'people',
      updated_at = now()
    where trip_id = normalized_trip;
  end if;

  delete from public.travel_trip_cohosts
  where trip_id = normalized_trip
    and user_id in (old_host, new_host_user_id);

  if not exists (
    select 1
    from public.travel_invites as invite
    where invite.trip_id = normalized_trip
      and invite.accepted_by_user_id = old_host
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
  ) then
    select
      link.title,
      link.destination,
      link.start_date,
      link.end_date
    into sample_title, sample_destination, sample_start, sample_end
    from public.travel_open_join_links as link
    where link.trip_id = normalized_trip
      and link.revoked_at is null
    order by link.created_at desc
    limit 1;

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
          sample_payload,
          normalized_trip,
          old_host_name,
          coalesce(nullif(lower(btrim(old_host_email)), ''), 'host@ontrack.local'),
          new_host_user_id,
          now(),
          old_host
        );
        exit;
      exception when unique_violation then
        -- Retry rare code collisions.
      end;
    end loop;
  else
    select invite.code into generated_code
    from public.travel_invites as invite
    where invite.trip_id = normalized_trip
      and invite.accepted_by_user_id = old_host
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
    order by invite.accepted_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'formerHostInviteCode', generated_code,
    'newHostUserId', new_host_user_id,
    'newHostDisplayName', new_host_name
  );
end;
$$;

create or replace function public.leave_travel_trip(requested_trip_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
begin
  if actor is null or length(normalized_trip) not between 1 and 200 then
    raise exception 'Sign in required.';
  end if;
  if public.is_travel_trip_host(normalized_trip) then
    raise exception 'Transfer host status first, or delete the trip instead.';
  end if;
  if not (
    public.is_travel_trip_member(normalized_trip)
    or public.is_travel_trip_cohost(normalized_trip)
  ) then
    raise exception 'You are not on this trip.';
  end if;

  delete from public.travel_trip_cohosts
  where trip_id = normalized_trip
    and user_id = actor;

  update public.travel_invites
  set revoked_at = coalesce(revoked_at, now())
  where trip_id = normalized_trip
    and accepted_by_user_id = actor
    and revoked_at is null;
end;
$$;

create or replace function public.revoke_travel_open_join_link(invite_trip_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_trip text := btrim(invite_trip_id);
begin
  if auth.uid() is null or length(normalized_trip) not between 1 and 200 then
    raise exception 'Sign in required.';
  end if;
  if not public.is_travel_trip_manager(normalized_trip) then
    raise exception 'Only the trip host or a co-host can revoke the join link.';
  end if;

  update public.travel_open_join_links
  set revoked_at = coalesce(revoked_at, now())
  where trip_id = normalized_trip
    and revoked_at is null;
end;
$$;

revoke all on function public.is_travel_trip_cohost(text) from public;
revoke all on function public.is_travel_trip_manager(text) from public;
revoke all on function public.grant_travel_trip_cohost(text, uuid) from public;
revoke all on function public.revoke_travel_trip_cohost(text, uuid) from public;

grant execute on function public.is_travel_trip_cohost(text) to authenticated;
grant execute on function public.is_travel_trip_manager(text) to authenticated;
grant execute on function public.grant_travel_trip_cohost(text, uuid) to authenticated;
grant execute on function public.revoke_travel_trip_cohost(text, uuid) to authenticated;

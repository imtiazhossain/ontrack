-- Vehicle tracker: private vehicles stay in app_state; shared vehicles use
-- relational membership + a JSON document payload for co-editing.
alter table public.app_state
drop constraint if exists app_state_domain_check;

alter table public.app_state
add constraint app_state_domain_check
check (
  domain in (
    'addons',
    'agents',
    'preferences',
    'schedule',
    'plants',
    'travel',
    'todos',
    'vision-board',
    'vehicles'
  )
);

alter table public.addon_entitlements
drop constraint if exists addon_entitlements_addon_id_check;

alter table public.addon_entitlements
add constraint addon_entitlements_addon_id_check
check (
  addon_id in (
    'food',
    'fitness',
    'plants',
    'travel',
    'vision-board',
    'games',
    'vehicles'
  )
);

create table public.vehicles (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (length(btrim(nickname)) between 1 and 120),
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_members (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (vehicle_id, user_id)
);

create index vehicle_members_user_idx
  on public.vehicle_members(user_id, joined_at desc);

create table public.vehicle_activity_events (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_display_name text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index vehicle_activity_vehicle_idx
  on public.vehicle_activity_events(vehicle_id, created_at desc);

create table public.vehicle_share_links (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  token_hash bytea not null unique,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz
);

create unique index vehicle_share_links_active_idx
  on public.vehicle_share_links(vehicle_id)
  where revoked_at is null;

create table public.vehicle_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);

alter table public.vehicles enable row level security;
alter table public.vehicle_members enable row level security;
alter table public.vehicle_activity_events enable row level security;
alter table public.vehicle_share_links enable row level security;
alter table public.vehicle_mutation_receipts enable row level security;

revoke all on public.vehicles from anon, authenticated;
revoke all on public.vehicle_members from anon, authenticated;
revoke all on public.vehicle_activity_events from anon, authenticated;
revoke all on public.vehicle_share_links from anon, authenticated;
revoke all on public.vehicle_mutation_receipts from anon, authenticated;

create or replace function public.vehicle_display_name()
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

create or replace function public.is_vehicle_member(requested_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vehicle_members as member
    where member.vehicle_id = requested_vehicle_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.is_vehicle_owner(requested_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vehicles as vehicle
    where vehicle.id = requested_vehicle_id
      and vehicle.owner_user_id = auth.uid()
  );
$$;

create policy "members read vehicles"
on public.vehicles for select to authenticated
using (public.is_vehicle_member(id));

create policy "members read vehicle membership"
on public.vehicle_members for select to authenticated
using (public.is_vehicle_member(vehicle_id));

create policy "members read vehicle activity"
on public.vehicle_activity_events for select to authenticated
using (public.is_vehicle_member(vehicle_id));

create or replace function public.vehicle_hash_token(token text)
returns bytea
language sql
immutable
security definer
set search_path = ''
as $$
  select extensions.digest(convert_to(token, 'UTF8'), 'sha256');
$$;

create or replace function public.append_vehicle_activity(
  requested_vehicle_id uuid,
  requested_action text,
  requested_entity_type text,
  requested_summary text,
  requested_entity_id text default null,
  requested_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.vehicle_activity_events (
    vehicle_id,
    actor_user_id,
    actor_display_name,
    action,
    entity_type,
    entity_id,
    summary,
    meta
  ) values (
    requested_vehicle_id,
    auth.uid(),
    public.vehicle_display_name(),
    requested_action,
    requested_entity_type,
    requested_entity_id,
    requested_summary,
    requested_meta
  );
end;
$$;

create or replace function public.broadcast_vehicle_changed(requested_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('vehicle_id', requested_vehicle_id),
    'changed',
    'vehicle:' || requested_vehicle_id::text,
    true
  );
exception
  when others then
    null;
end;
$$;

create or replace function public.publish_vehicle(vehicle_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  vehicle_id uuid;
  nickname text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;
  vehicle_id := nullif(vehicle_payload ->> 'id', '')::uuid;
  nickname := nullif(btrim(coalesce(vehicle_payload ->> 'nickname', '')), '');
  if vehicle_id is null or nickname is null then
    raise exception 'Vehicle id and nickname are required.';
  end if;
  if exists (select 1 from public.vehicles where id = vehicle_id) then
    raise exception 'This vehicle is already shared.';
  end if;

  insert into public.vehicles (id, owner_user_id, nickname, payload)
  values (vehicle_id, auth.uid(), nickname, vehicle_payload);

  insert into public.vehicle_members (vehicle_id, user_id, display_name, role)
  values (vehicle_id, auth.uid(), public.vehicle_display_name(), 'owner');

  perform public.append_vehicle_activity(
    vehicle_id,
    'publish',
    'vehicle',
    'Shared “' || nickname || '”',
    vehicle_id::text
  );

  return public.vehicle_snapshot(vehicle_id);
end;
$$;

create or replace function public.vehicle_snapshot(requested_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  row public.vehicles%rowtype;
  payload jsonb;
  members jsonb;
  activity jsonb;
  my_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;
  if not public.is_vehicle_member(requested_vehicle_id) then
    raise exception 'Vehicle not found.';
  end if;

  select * into row from public.vehicles where id = requested_vehicle_id;
  select member.role into my_role
  from public.vehicle_members as member
  where member.vehicle_id = requested_vehicle_id
    and member.user_id = auth.uid();

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', member.user_id,
    'displayName', member.display_name,
    'role', member.role,
    'joinedAt', member.joined_at
  ) order by member.joined_at), '[]'::jsonb)
  into members
  from public.vehicle_members as member
  where member.vehicle_id = requested_vehicle_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', event.id,
    'actorUserId', event.actor_user_id,
    'actorDisplayName', event.actor_display_name,
    'action', event.action,
    'entityType', event.entity_type,
    'entityId', event.entity_id,
    'summary', event.summary,
    'meta', event.meta,
    'createdAt', event.created_at
  ) order by event.created_at desc), '[]'::jsonb)
  into activity
  from (
    select *
    from public.vehicle_activity_events
    where vehicle_id = requested_vehicle_id
    order by created_at desc
    limit 100
  ) as event;

  payload := coalesce(row.payload, '{}'::jsonb)
    || jsonb_build_object(
      'id', row.id,
      'nickname', row.nickname,
      'mode', 'shared',
      'role', my_role,
      'members', members,
      'activity', activity,
      'createdAt', row.created_at,
      'updatedAt', row.updated_at
    );

  return payload;
end;
$$;

create or replace function public.vehicle_shared_ids()
returns table (vehicle_id uuid)
language sql
security definer
set search_path = ''
as $$
  select member.vehicle_id
  from public.vehicle_members as member
  where member.user_id = auth.uid()
  order by member.joined_at desc;
$$;

create or replace function public.apply_vehicle_mutations(requested_mutations jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mutation jsonb;
  mutation_id uuid;
  vehicle_id uuid;
  op_type text;
  payload jsonb;
  nickname text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;
  if jsonb_typeof(requested_mutations) <> 'array' then
    raise exception 'Mutations must be an array.';
  end if;

  for mutation in
    select value from jsonb_array_elements(requested_mutations)
  loop
    mutation_id := nullif(mutation ->> 'id', '')::uuid;
    vehicle_id := nullif(mutation ->> 'vehicleId', '')::uuid;
    op_type := mutation #>> '{op,type}';
    if mutation_id is null or vehicle_id is null or op_type is null then
      continue;
    end if;
    if exists (
      select 1
      from public.vehicle_mutation_receipts as receipt
      where receipt.user_id = auth.uid()
        and receipt.mutation_id = mutation_id
    ) then
      continue;
    end if;
    if not public.is_vehicle_member(vehicle_id) then
      raise exception 'Only members can edit this vehicle.';
    end if;

    if op_type = 'upsert_vehicle' then
      payload := mutation -> 'op' -> 'vehicle';
      nickname := nullif(btrim(coalesce(payload ->> 'nickname', '')), '');
      if nickname is null then
        raise exception 'Nickname is required.';
      end if;
      update public.vehicles
      set nickname = nickname,
          payload = payload,
          version = version + 1,
          updated_at = now()
      where id = vehicle_id;
      perform public.append_vehicle_activity(
        vehicle_id,
        'update',
        'vehicle',
        coalesce(nullif(btrim(coalesce(mutation ->> 'summary', '')), ''), 'Updated vehicle'),
        vehicle_id::text
      );
    elsif op_type = 'delete_vehicle' then
      if not public.is_vehicle_owner(vehicle_id) then
        raise exception 'Only the owner can delete this vehicle.';
      end if;
      delete from public.vehicles where id = vehicle_id;
    else
      -- Nested entity ops are applied via full vehicle upserts from the client.
      continue;
    end if;

    insert into public.vehicle_mutation_receipts (user_id, mutation_id, vehicle_id)
    values (auth.uid(), mutation_id, vehicle_id)
    on conflict do nothing;

    perform public.broadcast_vehicle_changed(vehicle_id);
  end loop;
end;
$$;

create or replace function public.create_vehicle_share_link(requested_vehicle_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  if not public.is_vehicle_owner(requested_vehicle_id) then
    raise exception 'Only the owner can create a share link.';
  end if;
  token := encode(extensions.gen_random_bytes(18), 'hex');
  update public.vehicle_share_links
  set revoked_at = now()
  where vehicle_id = requested_vehicle_id
    and revoked_at is null;
  insert into public.vehicle_share_links (
    vehicle_id,
    token_hash,
    created_by_user_id,
    expires_at
  ) values (
    requested_vehicle_id,
    public.vehicle_hash_token(token),
    auth.uid(),
    now() + interval '30 days'
  );
  return token;
end;
$$;

create or replace function public.revoke_vehicle_share_link(requested_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vehicle_owner(requested_vehicle_id) then
    raise exception 'Only the owner can revoke the share link.';
  end if;
  update public.vehicle_share_links
  set revoked_at = now()
  where vehicle_id = requested_vehicle_id
    and revoked_at is null;
end;
$$;

create or replace function public.resolve_vehicle_share_link(link_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.vehicle_share_links%rowtype;
  vehicle public.vehicles%rowtype;
begin
  select * into link
  from public.vehicle_share_links
  where token_hash = public.vehicle_hash_token(link_code)
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;
  if link.id is null then
    raise exception 'This invite link is invalid or has expired.';
  end if;
  select * into vehicle from public.vehicles where id = link.vehicle_id;
  return jsonb_build_object(
    'vehicleId', vehicle.id,
    'nickname', vehicle.nickname,
    'ownerName', (
      select member.display_name
      from public.vehicle_members as member
      where member.vehicle_id = vehicle.id
        and member.role = 'owner'
      limit 1
    )
  );
end;
$$;

create or replace function public.accept_vehicle_share_link(link_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.vehicle_share_links%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;
  select * into link
  from public.vehicle_share_links
  where token_hash = public.vehicle_hash_token(link_code)
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;
  if link.id is null then
    raise exception 'This invite link is invalid or has expired.';
  end if;
  insert into public.vehicle_members (vehicle_id, user_id, display_name, role)
  values (link.vehicle_id, auth.uid(), public.vehicle_display_name(), 'member')
  on conflict (vehicle_id, user_id) do nothing;

  perform public.append_vehicle_activity(
    link.vehicle_id,
    'join',
    'member',
    public.vehicle_display_name() || ' joined',
    auth.uid()::text
  );
  perform public.broadcast_vehicle_changed(link.vehicle_id);
  return link.vehicle_id;
end;
$$;

create or replace function public.remove_vehicle_member(
  requested_vehicle_id uuid,
  requested_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vehicle_owner(requested_vehicle_id) then
    raise exception 'Only the owner can remove members.';
  end if;
  if requested_user_id = auth.uid() then
    raise exception 'Transfer ownership or delete the vehicle instead.';
  end if;
  delete from public.vehicle_members
  where vehicle_id = requested_vehicle_id
    and user_id = requested_user_id
    and role = 'member';
  perform public.append_vehicle_activity(
    requested_vehicle_id,
    'remove_member',
    'member',
    'Removed a collaborator',
    requested_user_id::text
  );
  perform public.broadcast_vehicle_changed(requested_vehicle_id);
end;
$$;

create or replace function public.transfer_vehicle_ownership(
  requested_vehicle_id uuid,
  new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;
  if not public.is_vehicle_owner(requested_vehicle_id) then
    raise exception 'Only the owner can transfer ownership.';
  end if;
  if new_owner_user_id = auth.uid() then
    raise exception 'That person already owns this vehicle.';
  end if;
  if not exists (
    select 1
    from public.vehicle_members as member
    where member.vehicle_id = requested_vehicle_id
      and member.user_id = new_owner_user_id
      and member.role = 'member'
  ) then
    raise exception 'Ownership can only be transferred to a current member.';
  end if;

  update public.vehicles
  set owner_user_id = new_owner_user_id,
      updated_at = now(),
      version = version + 1
  where id = requested_vehicle_id;

  update public.vehicle_members
  set role = 'member'
  where vehicle_id = requested_vehicle_id
    and user_id = auth.uid();

  update public.vehicle_members
  set role = 'owner'
  where vehicle_id = requested_vehicle_id
    and user_id = new_owner_user_id;

  perform public.append_vehicle_activity(
    requested_vehicle_id,
    'transfer',
    'member',
    'Transferred ownership',
    new_owner_user_id::text
  );
  perform public.broadcast_vehicle_changed(requested_vehicle_id);
end;
$$;

create or replace function public.leave_vehicle(requested_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_vehicle_owner(requested_vehicle_id) then
    raise exception 'Transfer ownership first, or delete the vehicle instead.';
  end if;
  delete from public.vehicle_members
  where vehicle_id = requested_vehicle_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.delete_shared_vehicle(requested_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vehicle_owner(requested_vehicle_id) then
    raise exception 'Only the owner can delete this vehicle.';
  end if;
  delete from public.vehicles where id = requested_vehicle_id;
end;
$$;

revoke all on function public.vehicle_display_name() from public;
revoke all on function public.is_vehicle_member(uuid) from public;
revoke all on function public.is_vehicle_owner(uuid) from public;
revoke all on function public.vehicle_hash_token(text) from public;
revoke all on function public.append_vehicle_activity(uuid, text, text, text, text, jsonb) from public;
revoke all on function public.broadcast_vehicle_changed(uuid) from public;
revoke all on function public.publish_vehicle(jsonb) from public;
revoke all on function public.vehicle_snapshot(uuid) from public;
revoke all on function public.vehicle_shared_ids() from public;
revoke all on function public.apply_vehicle_mutations(jsonb) from public;
revoke all on function public.create_vehicle_share_link(uuid) from public;
revoke all on function public.revoke_vehicle_share_link(uuid) from public;
revoke all on function public.resolve_vehicle_share_link(text) from public;
revoke all on function public.accept_vehicle_share_link(text) from public;
revoke all on function public.remove_vehicle_member(uuid, uuid) from public;
revoke all on function public.transfer_vehicle_ownership(uuid, uuid) from public;
revoke all on function public.leave_vehicle(uuid) from public;
revoke all on function public.delete_shared_vehicle(uuid) from public;

grant execute on function public.publish_vehicle(jsonb) to authenticated;
grant execute on function public.vehicle_snapshot(uuid) to authenticated;
grant execute on function public.vehicle_shared_ids() to authenticated;
grant execute on function public.apply_vehicle_mutations(jsonb) to authenticated;
grant execute on function public.create_vehicle_share_link(uuid) to authenticated;
grant execute on function public.revoke_vehicle_share_link(uuid) to authenticated;
grant execute on function public.resolve_vehicle_share_link(text) to authenticated;
grant execute on function public.accept_vehicle_share_link(text) to authenticated;
grant execute on function public.remove_vehicle_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_vehicle_ownership(uuid, uuid) to authenticated;
grant execute on function public.leave_vehicle(uuid) to authenticated;
grant execute on function public.delete_shared_vehicle(uuid) to authenticated;

-- Security hardening: close anonymous test-trip chat, invite expiry/revoke,
-- meal PHI write scope, clinical search_path, push without capability tokens,
-- and chat rate limits keyed on auth.uid().

-- ---------------------------------------------------------------------------
-- F1: Remove never-expiring anonymous test-trip chat fixture
-- ---------------------------------------------------------------------------
delete from public.travel_invites
where code = '00000000000000000001';

create or replace function public.travel_chat_trip_id(chat_access_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select invite.trip_id
  from public.travel_invites as invite
  where invite.code = chat_access_code
    and invite.accepted_at is not null
    and invite.revoked_at is null
    and invite.expires_at > now()
    and auth.uid() is not null
    and (
      invite.inviter_user_id = auth.uid()
      or invite.accepted_by_user_id = auth.uid()
    )
  limit 1;
$$;

revoke all on function public.travel_chat_trip_id(text) from public;
revoke all on function public.travel_chat_messages(text) from public, anon;
revoke all on function public.send_travel_chat_message(text, uuid, text, text) from public, anon;
revoke all on function public.register_travel_chat_device(text, uuid, text) from public, anon;

grant execute on function public.travel_chat_messages(text) to authenticated;
grant execute on function public.send_travel_chat_message(text, uuid, text, text) to authenticated;
grant execute on function public.register_travel_chat_device(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- F12: Rate-limit chat by authenticated user (not client-chosen device id)
-- ---------------------------------------------------------------------------
create or replace function public.send_travel_chat_message(
  chat_access_code text,
  chat_sender_device_id uuid,
  chat_sender_name text,
  chat_body text
)
returns public.travel_chat_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  chat_trip_id text;
  inserted public.travel_chat_messages;
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in to send trip chat messages.';
  end if;
  chat_trip_id := public.travel_chat_trip_id(chat_access_code);
  if chat_trip_id is null
    or length(btrim(chat_sender_name)) not between 1 and 120
    or length(btrim(chat_body)) not between 1 and 2000 then
    raise exception 'This trip chat is unavailable.';
  end if;
  -- Bound floods by the authenticated principal: this device, plus any device
  -- already registered under this user's invites for the trip.
  if exists (
    select 1
    from public.travel_chat_messages as message
    where message.trip_id = chat_trip_id
      and message.created_at > now() - interval '1 second'
      and (
        message.sender_device_id = chat_sender_device_id
        or message.sender_device_id in (
          select device.device_id
          from public.travel_chat_devices as device
          join public.travel_invites as invite on invite.code = device.access_code
          where device.trip_id = chat_trip_id
            and (
              invite.inviter_user_id = actor
              or invite.accepted_by_user_id = actor
            )
        )
      )
  ) then
    raise exception 'Please wait a moment before sending another message.';
  end if;

  insert into public.travel_chat_messages (
    trip_id,
    sender_device_id,
    sender_name,
    body
  )
  values (
    chat_trip_id,
    chat_sender_device_id,
    btrim(chat_sender_name),
    btrim(chat_body)
  )
  returning * into inserted;
  return inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- F8: Do not put reusable chat capability tokens in push payloads
-- ---------------------------------------------------------------------------
create or replace function public.notify_travel_chat_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notifications jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'to', device.expo_push_token,
      'title', new.sender_name,
      'body', case
        when length(new.body) > 140 then left(new.body, 137) || '...'
        else new.body
      end,
      'sound', 'default',
      'channelId', 'event-chat',
      'data', jsonb_build_object(
        'url', '/travel-chat',
        'tripId', new.trip_id
      )
    )
  )
  into notifications
  from public.travel_chat_devices as device
  join public.travel_invites as invite on invite.code = device.access_code
  where device.trip_id = new.trip_id
    and device.device_id <> new.sender_device_id
    and invite.revoked_at is null
    and invite.expires_at > now();

  if notifications is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
      body := notifications
    );
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- F4: Collaborator links — expiry + revoke RPC
-- ---------------------------------------------------------------------------
alter table public.todo_collaborator_links
  add column if not exists expires_at timestamptz;

update public.todo_collaborator_links
set expires_at = created_at + interval '30 days'
where expires_at is null;

alter table public.todo_collaborator_links
  alter column expires_at set default (now() + interval '30 days');

alter table public.todo_collaborator_links
  alter column expires_at set not null;

create or replace function public.create_todo_collaborator_link(
  requested_list_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
  new_link_id uuid;
  requested_count integer;
  owned_count integer;
begin
  select count(*) into requested_count
  from (
    select distinct value
    from unnest(requested_list_ids) as value
  ) as requested;

  if requested_count < 1 or requested_count > 100 then
    raise exception 'Choose between 1 and 100 checklists.';
  end if;

  select count(*) into owned_count
  from (
    select distinct value
    from unnest(requested_list_ids) as value
  ) as requested
  where public.is_todo_owner(requested.value);

  if owned_count <> requested_count then
    raise exception 'You can only invite collaborators to checklists you own.';
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(18), 'hex');
    begin
      insert into public.todo_collaborator_links(token_hash, created_by_user_id, expires_at)
      values (
        extensions.digest(generated_code, 'sha256'),
        auth.uid(),
        now() + interval '30 days'
      )
      returning id into new_link_id;
      exit;
    exception when unique_violation then
    end;
  end loop;

  insert into public.todo_collaborator_link_lists(link_id, list_id)
  select new_link_id, value
  from (
    select distinct value
    from unnest(requested_list_ids) as value
  ) as requested;

  return generated_code;
end;
$$;

create or replace function public.resolve_todo_collaborator_link(link_code text)
returns table(inviter_name text, list_names text[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    max(owner.display_name),
    array_agg(list.name order by list.name)
  from public.todo_collaborator_links as link
  join public.todo_collaborator_link_lists as linked on linked.link_id = link.id
  join public.todo_lists as list on list.id = linked.list_id
  join public.todo_list_members as owner
    on owner.list_id = list.id and owner.role = 'owner'
  where link.token_hash = extensions.digest(link_code, 'sha256')
    and link.revoked_at is null
    and link.expires_at > now()
    and auth.uid() is not null
  group by link.id
  limit 1;
$$;

create or replace function public.accept_todo_collaborator_link(link_code text)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_list_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Sign in to join these checklists.';
  end if;

  select array_agg(linked.list_id order by linked.list_id)
  into accepted_list_ids
  from public.todo_collaborator_links as link
  join public.todo_collaborator_link_lists as linked on linked.link_id = link.id
  where link.token_hash = extensions.digest(link_code, 'sha256')
    and link.revoked_at is null
    and link.expires_at > now();

  if coalesce(cardinality(accepted_list_ids), 0) = 0 then
    raise exception 'This collaborator link is invalid, expired, or has been revoked.';
  end if;

  insert into public.todo_list_members(list_id, user_id, display_name, role)
  select
    requested_list_id,
    auth.uid(),
    public.todo_display_name(),
    'member'
  from unnest(accepted_list_ids) as requested_list_id
  on conflict (list_id, user_id) do nothing;

  return accepted_list_ids;
end;
$$;

create or replace function public.revoke_todo_collaborator_link(link_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.todo_collaborator_links as link
  set revoked_at = coalesce(link.revoked_at, now())
  where link.token_hash = extensions.digest(link_code, 'sha256')
    and link.created_by_user_id = auth.uid();
$$;

revoke all on function public.revoke_todo_collaborator_link(text) from public;
grant execute on function public.revoke_todo_collaborator_link(text) to authenticated;

-- ---------------------------------------------------------------------------
-- F5: Share links + email invites — expiry
-- ---------------------------------------------------------------------------
alter table public.todo_share_links
  add column if not exists expires_at timestamptz;

update public.todo_share_links
set expires_at = created_at + interval '30 days'
where expires_at is null;

alter table public.todo_share_links
  alter column expires_at set default (now() + interval '30 days');

alter table public.todo_share_links
  alter column expires_at set not null;

alter table public.todo_email_invites
  add column if not exists expires_at timestamptz;

update public.todo_email_invites
set expires_at = created_at + interval '14 days'
where expires_at is null;

alter table public.todo_email_invites
  alter column expires_at set default (now() + interval '14 days');

alter table public.todo_email_invites
  alter column expires_at set not null;

create or replace function public.create_todo_email_invite(
  requested_list_id uuid,
  requested_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(requested_email));
  invite_id uuid;
begin
  if not public.is_todo_owner(requested_list_id)
    or length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Only the owner can invite a valid account email.';
  end if;

  insert into public.todo_email_invites(
    list_id,
    inviter_user_id,
    inviter_name,
    invitee_email,
    expires_at
  )
  values (
    requested_list_id,
    auth.uid(),
    public.todo_display_name(),
    normalized_email,
    now() + interval '14 days'
  )
  on conflict (list_id, invitee_email)
    where accepted_at is null and revoked_at is null
  do update set
    created_at = now(),
    inviter_name = excluded.inviter_name,
    expires_at = now() + interval '14 days'
  returning id into invite_id;
  return invite_id;
end;
$$;

create or replace function public.list_todo_email_invites()
returns table(
  id uuid,
  list_id uuid,
  list_name text,
  inviter_name text,
  invitee_email text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invite.id,
    invite.list_id,
    list.name,
    invite.inviter_name,
    invite.invitee_email,
    invite.created_at
  from public.todo_email_invites as invite
  join public.todo_lists as list on list.id = invite.list_id
  where invite.invitee_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and invite.accepted_at is null
    and invite.revoked_at is null
    and invite.expires_at > now()
  order by invite.created_at desc;
$$;

create or replace function public.todo_list_pending_invites(requested_list_id uuid)
returns table(id uuid, invitee_email text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select invite.id, invite.invitee_email, invite.created_at
  from public.todo_email_invites as invite
  where invite.list_id = requested_list_id
    and invite.inviter_user_id = auth.uid()
    and invite.accepted_at is null
    and invite.revoked_at is null
    and invite.expires_at > now()
    and public.is_todo_owner(requested_list_id)
  order by invite.created_at desc;
$$;

create or replace function public.accept_todo_email_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_invite public.todo_email_invites;
begin
  select * into requested_invite
  from public.todo_email_invites as invite
  where invite.id = invite_id
    and invite.invitee_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and invite.accepted_at is null
    and invite.revoked_at is null
    and invite.expires_at > now()
  for update;
  if requested_invite.id is null or auth.uid() is null then
    raise exception 'This invitation is unavailable for this account.';
  end if;

  insert into public.todo_list_members(list_id, user_id, display_name, role)
  values (
    requested_invite.list_id,
    auth.uid(),
    public.todo_display_name(),
    'member'
  )
  on conflict (list_id, user_id) do nothing;

  update public.todo_email_invites
  set accepted_at = now(), accepted_by_user_id = auth.uid()
  where id = invite_id;
  return requested_invite.list_id;
end;
$$;

create or replace function public.create_todo_share_link(requested_list_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  if not public.is_todo_owner(requested_list_id) then
    raise exception 'Only the owner can create a share link.';
  end if;
  update public.todo_share_links
  set revoked_at = coalesce(revoked_at, now())
  where list_id = requested_list_id and revoked_at is null;

  loop
    generated_code := encode(extensions.gen_random_bytes(18), 'hex');
    begin
      insert into public.todo_share_links(
        list_id,
        token_hash,
        created_by_user_id,
        expires_at
      )
      values (
        requested_list_id,
        extensions.digest(generated_code, 'sha256'),
        auth.uid(),
        now() + interval '30 days'
      );
      return generated_code;
    exception when unique_violation then
    end;
  end loop;
end;
$$;

create or replace function public.resolve_todo_share_link(link_code text)
returns table(list_id uuid, list_name text, owner_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select list.id, list.name, owner.display_name
  from public.todo_share_links as link
  join public.todo_lists as list on list.id = link.list_id
  join public.todo_list_members as owner
    on owner.list_id = list.id and owner.role = 'owner'
  where link.token_hash = extensions.digest(link_code, 'sha256')
    and link.revoked_at is null
    and link.expires_at > now()
    and auth.uid() is not null
  limit 1;
$$;

create or replace function public.accept_todo_share_link(link_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join this list.';
  end if;
  select link.list_id into requested_list_id
  from public.todo_share_links as link
  where link.token_hash = extensions.digest(link_code, 'sha256')
    and link.revoked_at is null
    and link.expires_at > now()
  limit 1;
  if requested_list_id is null then
    raise exception 'This list link is invalid, expired, or has been revoked.';
  end if;

  insert into public.todo_list_members(list_id, user_id, display_name, role)
  values (requested_list_id, auth.uid(), public.todo_display_name(), 'member')
  on conflict (list_id, user_id) do nothing;
  return requested_list_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- F7: Clinical SECURITY DEFINER helpers — empty search_path
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_verified_clinician()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.clinician_profiles
    where user_id = auth.uid() and verified_at is not null
  );
$$;

create or replace function public.can_access_profile(requested_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.nutrition_profiles
    where id = requested_profile and owner_id = auth.uid()
  )
  or exists(
    select 1 from public.guardian_relationships
    where profile_id = requested_profile and guardian_id = auth.uid()
  )
  or exists(
    select 1 from public.care_team_memberships
    where profile_id = requested_profile
      and clinician_id = auth.uid()
      and revoked_at is null
  )
  or public.is_admin();
$$;

create or replace function public.owns_profile(requested_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.nutrition_profiles
    where id = requested_profile and owner_id = auth.uid()
  )
  or public.is_admin();
$$;

create or replace function public.stamp_target_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if not public.is_verified_clinician() or not exists(
      select 1 from public.care_team_memberships
      where profile_id = new.profile_id
        and clinician_id = auth.uid()
        and revoked_at is null
    ) then
      raise exception 'verified assigned clinician required';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.record_clinical_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id text;
  affected_profile uuid;
begin
  record_id := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'));
  if tg_table_name = 'nutrition_profiles' then
    affected_profile := case when tg_op = 'DELETE' then null else (to_jsonb(new)->>'id')::uuid end;
  else
    affected_profile := coalesce((to_jsonb(new)->>'profile_id')::uuid, (to_jsonb(old)->>'profile_id')::uuid);
  end if;
  insert into public.audit_events(actor_id, profile_id, action, entity_type, entity_id)
  values (auth.uid(), affected_profile, lower(tg_op), tg_table_name, record_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- F6: Meal PHI — care team can read; only owners/guardians/admins can write
-- ---------------------------------------------------------------------------
drop policy if exists "meal access" on public.meals;
drop policy if exists "meal item access" on public.meal_items;
drop policy if exists "source access" on public.nutrition_sources;
drop policy if exists "nutrient access" on public.nutrient_values;

create policy "meal read" on public.meals
  for select using (public.can_access_profile(profile_id));
create policy "meal write" on public.meals
  for all using (public.owns_profile(profile_id) or exists(
    select 1 from public.guardian_relationships
    where profile_id = meals.profile_id and guardian_id = auth.uid()
  ))
  with check (public.owns_profile(profile_id) or exists(
    select 1 from public.guardian_relationships
    where profile_id = meals.profile_id and guardian_id = auth.uid()
  ));

create policy "meal item read" on public.meal_items
  for select using (exists(
    select 1 from public.meals
    where id = meal_id and public.can_access_profile(profile_id)
  ));
create policy "meal item write" on public.meal_items
  for all using (exists(
    select 1 from public.meals
    where id = meal_id and (
      public.owns_profile(profile_id)
      or exists(
        select 1 from public.guardian_relationships
        where profile_id = meals.profile_id and guardian_id = auth.uid()
      )
    )
  ))
  with check (exists(
    select 1 from public.meals
    where id = meal_id and (
      public.owns_profile(profile_id)
      or exists(
        select 1 from public.guardian_relationships
        where profile_id = meals.profile_id and guardian_id = auth.uid()
      )
    )
  ));

create policy "source read" on public.nutrition_sources
  for select using (exists(
    select 1 from public.meals
    where id = meal_id and public.can_access_profile(profile_id)
  ));
create policy "source write" on public.nutrition_sources
  for all using (exists(
    select 1 from public.meals
    where id = meal_id and (
      public.owns_profile(profile_id)
      or exists(
        select 1 from public.guardian_relationships
        where profile_id = meals.profile_id and guardian_id = auth.uid()
      )
    )
  ))
  with check (exists(
    select 1 from public.meals
    where id = meal_id and (
      public.owns_profile(profile_id)
      or exists(
        select 1 from public.guardian_relationships
        where profile_id = meals.profile_id and guardian_id = auth.uid()
      )
    )
  ));

create policy "nutrient read" on public.nutrient_values
  for select using (exists(
    select 1
    from public.meal_items
    join public.meals on meals.id = meal_items.meal_id
    where meal_items.id = meal_item_id
      and public.can_access_profile(meals.profile_id)
  ));
create policy "nutrient write" on public.nutrient_values
  for all using (exists(
    select 1
    from public.meal_items
    join public.meals on meals.id = meal_items.meal_id
    where meal_items.id = meal_item_id
      and (
        public.owns_profile(meals.profile_id)
        or exists(
          select 1 from public.guardian_relationships
          where profile_id = meals.profile_id and guardian_id = auth.uid()
        )
      )
  ))
  with check (exists(
    select 1
    from public.meal_items
    join public.meals on meals.id = meal_items.meal_id
    where meal_items.id = meal_item_id
      and (
        public.owns_profile(meals.profile_id)
        or exists(
          select 1 from public.guardian_relationships
          where profile_id = meals.profile_id and guardian_id = auth.uid()
        )
      )
  ));

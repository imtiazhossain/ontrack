-- Trip friends roster (host + accepted members) and host transfer.
-- Hostship stays inferred from invites / open-join links; transfer rewrites
-- those rows and remaps shared expense `self` ↔ `member:<uid>` ids.

create or replace function public.travel_user_display_name(requested_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(account.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(account.email, ''), '@', 1), ''),
    'Traveler'
  )
  from auth.users as account
  where account.id = requested_user_id
  limit 1;
$$;

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
    )
  );
$$;

create or replace function public.remap_travel_expense_person_id(
  person_id text,
  old_host_user_id uuid,
  new_host_user_id uuid
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when person_id = 'self' then 'member:' || old_host_user_id::text
    when person_id = 'member:' || new_host_user_id::text then 'self'
    else person_id
  end;
$$;

create or replace function public.remap_travel_trip_expense_snapshot(
  expenses jsonb,
  people jsonb,
  old_host_user_id uuid,
  new_host_user_id uuid
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  remapped_people jsonb := '[]'::jsonb;
  remapped_expenses jsonb := '[]'::jsonb;
  person jsonb;
  expense jsonb;
  person_id text;
  mapped_id text;
  split_ids jsonb;
  split_id text;
  remapped_splits jsonb;
begin
  if jsonb_typeof(people) = 'array' then
    for person in select * from jsonb_array_elements(people)
    loop
      person_id := person ->> 'id';
      mapped_id := public.remap_travel_expense_person_id(
        person_id,
        old_host_user_id,
        new_host_user_id
      );
      remapped_people := remapped_people || jsonb_build_array(
        jsonb_set(person, '{id}', to_jsonb(mapped_id))
      );
    end loop;
  end if;

  if jsonb_typeof(expenses) = 'array' then
    for expense in select * from jsonb_array_elements(expenses)
    loop
      remapped_splits := '[]'::jsonb;
      if jsonb_typeof(expense -> 'splitWithIds') = 'array' then
        for split_id in
          select jsonb_array_elements_text(expense -> 'splitWithIds')
        loop
          remapped_splits := remapped_splits || jsonb_build_array(
            public.remap_travel_expense_person_id(
              split_id,
              old_host_user_id,
              new_host_user_id
            )
          );
        end loop;
      end if;

      remapped_expenses := remapped_expenses || jsonb_build_array(
        jsonb_set(
          jsonb_set(
            expense,
            '{paidById}',
            to_jsonb(
              public.remap_travel_expense_person_id(
                expense ->> 'paidById',
                old_host_user_id,
                new_host_user_id
              )
            )
          ),
          '{splitWithIds}',
          remapped_splits
        )
      );
    end loop;
  end if;

  return jsonb_build_object(
    'expenses', remapped_expenses,
    'people', remapped_people
  );
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
    roster := roster || jsonb_build_array(
      jsonb_build_object(
        'userId', member_row.user_id,
        'displayName', coalesce(nullif(btrim(member_row.display_name), ''), 'Traveler'),
        'email', member_row.email,
        'role', 'member',
        'inviteCode', member_row.invite_code,
        'acceptedAt', member_row.accepted_at
      )
    );
  end loop;

  return roster;
end;
$$;

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
  if not public.is_travel_trip_member(normalized_trip) then
    raise exception 'You are not on this trip.';
  end if;

  update public.travel_invites
  set revoked_at = coalesce(revoked_at, now())
  where trip_id = normalized_trip
    and accepted_by_user_id = actor
    and revoked_at is null;
end;
$$;

create or replace function public.transfer_travel_trip_host_by_invite(
  requested_trip_id text,
  invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_trip text := btrim(requested_trip_id);
  normalized_code text := lower(btrim(invite_code));
  target uuid;
begin
  if auth.uid() is null
    or length(normalized_trip) not between 1 and 200
    or normalized_code !~ '^[a-f0-9]{20}$' then
    raise exception 'Sign in required.';
  end if;

  select invite.accepted_by_user_id into target
  from public.travel_invites as invite
  where invite.code = normalized_code
    and invite.trip_id = normalized_trip
    and invite.accepted_by_user_id is not null
    and invite.accepted_at is not null
    and invite.revoked_at is null
    and invite.expires_at > now()
  limit 1;

  if target is null then
    raise exception 'Host status can only be transferred to a current trip friend.';
  end if;

  return public.transfer_travel_trip_host(normalized_trip, target);
end;
$$;

revoke all on function public.travel_user_display_name(uuid) from public;
revoke all on function public.travel_trip_host_user_id(text) from public;
revoke all on function public.remap_travel_expense_person_id(text, uuid, uuid) from public;
revoke all on function public.remap_travel_trip_expense_snapshot(jsonb, jsonb, uuid, uuid) from public;
revoke all on function public.list_travel_trip_roster(text) from public;
revoke all on function public.transfer_travel_trip_host(text, uuid) from public;
revoke all on function public.transfer_travel_trip_host_by_invite(text, text) from public;
revoke all on function public.leave_travel_trip(text) from public;

grant execute on function public.list_travel_trip_roster(text) to authenticated;
grant execute on function public.transfer_travel_trip_host(text, uuid) to authenticated;
grant execute on function public.transfer_travel_trip_host_by_invite(text, text) to authenticated;
grant execute on function public.leave_travel_trip(text) to authenticated;

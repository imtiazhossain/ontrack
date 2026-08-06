-- Serialize concurrent host transfers so two requests cannot both authorize
-- against the same pre-transfer host snapshot and remap expenses incorrectly.

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

  -- One transfer at a time per trip (transaction-scoped advisory lock).
  perform pg_advisory_xact_lock(87201433, hashtext(normalized_trip));

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

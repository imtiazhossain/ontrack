-- List chat capabilities for the signed-in user across every trip they host
-- or have accepted. Lets orphan local copies (same title/dates, wrong trip id)
-- recover chatAccessCode + hostTripId without reopening the join link.

create or replace function public.list_my_travel_chat_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  result jsonb := '[]'::jsonb;
  member_row record;
  host_row record;
  access_code text;
  meta record;
begin
  if actor is null then
    raise exception 'Sign in required.';
  end if;

  for member_row in
    select distinct on (invite.trip_id)
      invite.trip_id,
      invite.code as access_code,
      invite.accepted_at
    from public.travel_invites as invite
    where invite.accepted_by_user_id = actor
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
      and public.travel_trip_host_user_id(invite.trip_id) is distinct from actor
    order by invite.trip_id, invite.accepted_at desc
  loop
    select
      link.title,
      link.destination,
      link.start_date,
      link.end_date
    into meta
    from public.travel_open_join_links as link
    where link.trip_id = member_row.trip_id
    order by
      case when link.revoked_at is null and link.expires_at > now() then 0 else 1 end,
      link.created_at desc
    limit 1;

    result := result || jsonb_build_array(
      jsonb_build_object(
        'tripId', member_row.trip_id,
        'accessCode', member_row.access_code,
        'role', 'member',
        'title', coalesce(meta.title, ''),
        'destination', coalesce(meta.destination, ''),
        'startDate', coalesce(meta.start_date, ''),
        'endDate', coalesce(meta.end_date, '')
      )
    );
  end loop;

  for host_row in
    select distinct trip_id
    from (
      select link.trip_id
      from public.travel_open_join_links as link
      where link.host_user_id = actor
      union
      select invite.trip_id
      from public.travel_invites as invite
      where invite.inviter_user_id = actor
        and invite.revoked_at is null
    ) as hosted
  loop
    if public.travel_trip_host_user_id(host_row.trip_id) is distinct from actor then
      continue;
    end if;

    select invite.code
    into access_code
    from public.travel_invites as invite
    where invite.trip_id = host_row.trip_id
      and invite.accepted_by_user_id is not null
      and invite.accepted_by_user_id <> actor
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
    order by invite.accepted_at desc
    limit 1;

    if access_code is null then
      continue;
    end if;

    select
      link.title,
      link.destination,
      link.start_date,
      link.end_date
    into meta
    from public.travel_open_join_links as link
    where link.trip_id = host_row.trip_id
    order by
      case when link.revoked_at is null and link.expires_at > now() then 0 else 1 end,
      link.created_at desc
    limit 1;

    result := result || jsonb_build_array(
      jsonb_build_object(
        'tripId', host_row.trip_id,
        'accessCode', access_code,
        'role', 'host',
        'title', coalesce(meta.title, ''),
        'destination', coalesce(meta.destination, ''),
        'startDate', coalesce(meta.start_date, ''),
        'endDate', coalesce(meta.end_date, '')
      )
    );
  end loop;

  return result;
end;
$$;

revoke all on function public.list_my_travel_chat_access() from public;
grant execute on function public.list_my_travel_chat_access() to authenticated;

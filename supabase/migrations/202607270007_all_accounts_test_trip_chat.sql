-- Temporary shared chat capability for the all-accounts travel fixture.
-- The RPCs remain authenticated-only; this exception does not make other trip
-- chats public or expose invitation payloads.
insert into public.travel_invites (
  code,
  payload,
  trip_id,
  invitee_name,
  invitee_email,
  accepted_at,
  expires_at,
  revoked_at
)
values (
  '00000000000000000001',
  '{"invite":"all-accounts-test-trip-chat"}'::jsonb,
  'trip-all-accounts-test',
  'All test accounts',
  'all-accounts-test@ontrack.invalid',
  now(),
  'infinity'::timestamptz,
  null
)
on conflict (code) do update
set
  trip_id = excluded.trip_id,
  accepted_at = coalesce(public.travel_invites.accepted_at, excluded.accepted_at),
  expires_at = excluded.expires_at,
  revoked_at = null;

create or replace function public.travel_chat_trip_id(chat_access_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select accessible.trip_id
  from (
    select 'trip-all-accounts-test'::text as trip_id
    where chat_access_code = '00000000000000000001'
      and auth.uid() is not null

    union all

    select invite.trip_id
    from public.travel_invites as invite
    where invite.code = chat_access_code
      and invite.code <> '00000000000000000001'
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
      and auth.uid() is not null
      and (
        invite.inviter_user_id = auth.uid()
        or invite.accepted_by_user_id = auth.uid()
      )
  ) as accessible
  limit 1;
$$;

revoke all on function public.travel_chat_trip_id(text) from public;

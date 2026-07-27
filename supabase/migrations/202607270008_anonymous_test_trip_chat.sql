-- The all-accounts fixture is also present before an account signs in. Allow
-- those app sessions to use only its fixed chat capability. Normal trip chat
-- capabilities still require an authenticated organizer or accepted member.
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

grant execute on function public.travel_chat_messages(text)
  to anon;
grant execute on function public.send_travel_chat_message(text, uuid, text, text)
  to anon;
grant execute on function public.register_travel_chat_device(text, uuid, text)
  to anon;

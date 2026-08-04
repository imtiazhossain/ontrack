-- Report whether the recipient still has a valid invite at acceptance time.
-- A void RPC cannot distinguish a successful update from a revoked/expired link.

drop function if exists public.accept_travel_invite(text);

create function public.accept_travel_invite(invite_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted boolean;
begin
  update public.travel_invites as invite
  set
    accepted_at = coalesce(invite.accepted_at, now()),
    accepted_by_user_id = coalesce(invite.accepted_by_user_id, auth.uid())
  where invite.code = invite_code
    and invite.expires_at > now()
    and invite.revoked_at is null
    and auth.uid() is not null
    and invite.invitee_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (
      invite.accepted_by_user_id is null
      or invite.accepted_by_user_id = auth.uid()
    )
  returning true into accepted;

  return coalesce(accepted, false);
end;
$$;

revoke all on function public.accept_travel_invite(text) from public;
grant execute on function public.accept_travel_invite(text) to authenticated;

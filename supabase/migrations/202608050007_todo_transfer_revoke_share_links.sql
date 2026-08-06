-- Revoke active join links when ownership transfers so the former owner's
-- plaintext link cannot keep admitting members after they lose control.

create or replace function public.transfer_todo_list_ownership(
  requested_list_id uuid,
  new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in required.';
  end if;

  perform pg_advisory_xact_lock(
    87201435,
    hashtext(requested_list_id::text)
  );

  if not public.is_todo_owner(requested_list_id) then
    raise exception 'Only the owner can transfer ownership.';
  end if;
  if new_owner_user_id = actor then
    raise exception 'That person already owns this list.';
  end if;
  if not exists (
    select 1
    from public.todo_list_members as member
    where member.list_id = requested_list_id
      and member.user_id = new_owner_user_id
      and member.role = 'member'
  ) then
    raise exception 'Ownership can only be transferred to a current member.';
  end if;

  update public.todo_lists
  set owner_user_id = new_owner_user_id,
      updated_at = now()
  where id = requested_list_id;

  update public.todo_list_members
  set role = 'member'
  where list_id = requested_list_id
    and user_id = actor;

  update public.todo_list_members
  set role = 'owner'
  where list_id = requested_list_id
    and user_id = new_owner_user_id;

  -- New owner can see/revoke pending email invites created by the former owner.
  update public.todo_email_invites
  set inviter_user_id = new_owner_user_id
  where list_id = requested_list_id
    and accepted_at is null
    and revoked_at is null
    and inviter_user_id = actor;

  -- Former-owner collaborator capabilities covering this list stop working.
  update public.todo_collaborator_links as link
  set revoked_at = coalesce(link.revoked_at, now())
  where link.created_by_user_id = actor
    and link.revoked_at is null
    and exists (
      select 1
      from public.todo_collaborator_link_lists as linked
      where linked.link_id = link.id
        and linked.list_id = requested_list_id
    );

  -- Active share links were created under the former owner; revoke so they
  -- cannot keep admitting members after transfer.
  update public.todo_share_links
  set revoked_at = coalesce(revoked_at, now())
  where list_id = requested_list_id
    and revoked_at is null;
end;
$$;

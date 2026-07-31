-- Allow the current owner to hand a shared list to another member, then leave.
create or replace function public.transfer_todo_list_ownership(
  requested_list_id uuid,
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
  if not public.is_todo_owner(requested_list_id) then
    raise exception 'Only the owner can transfer ownership.';
  end if;
  if new_owner_user_id = auth.uid() then
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
    and user_id = auth.uid();

  update public.todo_list_members
  set role = 'owner'
  where list_id = requested_list_id
    and user_id = new_owner_user_id;
end;
$$;

create or replace function public.leave_todo_list(requested_list_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_todo_owner(requested_list_id) then
    raise exception 'Transfer ownership first, or delete the list instead.';
  end if;
  update public.todo_items
  set assignee_user_id = null, updated_at = now(), version = version + 1
  where list_id = requested_list_id and assignee_user_id = auth.uid();
  delete from public.todo_list_members
  where list_id = requested_list_id and user_id = auth.uid();
end;
$$;

revoke all on function public.transfer_todo_list_ownership(uuid, uuid) from public;
grant execute on function public.transfer_todo_list_ownership(uuid, uuid) to authenticated;

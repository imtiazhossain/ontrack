-- Multiple private lists continue to use app_state. Shared lists use the
-- relational schema below so membership can be enforced row by row.
alter table public.app_state
drop constraint if exists app_state_domain_check;

alter table public.app_state
add constraint app_state_domain_check
check (domain in ('addons', 'agents', 'preferences', 'schedule', 'plants', 'travel', 'todos'));

create table public.todo_lists (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.todo_list_members (
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table public.todo_items (
  id uuid primary key,
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  completed boolean not null default false,
  important boolean not null default false,
  assignee_user_id uuid references auth.users(id) on delete set null,
  completed_by_user_id uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todo_items_list_idx on public.todo_items(list_id, created_at desc);
create index todo_members_user_idx on public.todo_list_members(user_id, joined_at desc);

create table public.todo_email_invites (
  id uuid primary key default extensions.gen_random_uuid(),
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  inviter_name text not null,
  invitee_email text not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);

create unique index todo_email_invites_pending_idx
  on public.todo_email_invites(list_id, invitee_email)
  where accepted_at is null and revoked_at is null;

create table public.todo_share_links (
  id uuid primary key default extensions.gen_random_uuid(),
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  token_hash bytea not null unique,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index todo_share_links_active_idx
  on public.todo_share_links(list_id)
  where revoked_at is null;

create table public.todo_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);

alter table public.todo_lists enable row level security;
alter table public.todo_list_members enable row level security;
alter table public.todo_items enable row level security;
alter table public.todo_email_invites enable row level security;
alter table public.todo_share_links enable row level security;
alter table public.todo_mutation_receipts enable row level security;

revoke all on public.todo_lists from anon, authenticated;
revoke all on public.todo_list_members from anon, authenticated;
revoke all on public.todo_items from anon, authenticated;
revoke all on public.todo_email_invites from anon, authenticated;
revoke all on public.todo_share_links from anon, authenticated;
revoke all on public.todo_mutation_receipts from anon, authenticated;

create or replace function public.todo_display_name()
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

create or replace function public.is_todo_member(requested_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.todo_list_members as member
    where member.list_id = requested_list_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.is_todo_owner(requested_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.todo_lists as list
    where list.id = requested_list_id
      and list.owner_user_id = auth.uid()
  );
$$;

create policy "members read todo lists"
on public.todo_lists for select to authenticated
using (public.is_todo_member(id));

create policy "members read todo membership"
on public.todo_list_members for select to authenticated
using (public.is_todo_member(list_id));

create policy "members read todo items"
on public.todo_items for select to authenticated
using (public.is_todo_member(list_id));

grant select on public.todo_lists to authenticated;
grant select on public.todo_list_members to authenticated;
grant select on public.todo_items to authenticated;

create or replace function public.publish_todo_list(list_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_id uuid;
  requested_name text;
  task jsonb;
  actor uuid := auth.uid();
begin
  if actor is null or jsonb_typeof(list_payload) <> 'object' then
    raise exception 'Sign in to share this list.';
  end if;

  requested_id := (list_payload ->> 'id')::uuid;
  requested_name := btrim(list_payload ->> 'name');
  if length(requested_name) not between 1 and 80 then
    raise exception 'List name must be between 1 and 80 characters.';
  end if;

  insert into public.todo_lists(id, owner_user_id, name)
  values (requested_id, actor, requested_name);

  insert into public.todo_list_members(list_id, user_id, display_name, role)
  values (requested_id, actor, public.todo_display_name(), 'owner');

  for task in
    select value from jsonb_array_elements(coalesce(list_payload -> 'tasks', '[]'::jsonb))
  loop
    insert into public.todo_items(
      id,
      list_id,
      title,
      completed,
      important,
      completed_by_user_id,
      completed_at,
      created_at,
      updated_at
    )
    values (
      (task ->> 'id')::uuid,
      requested_id,
      left(btrim(task ->> 'title'), 160),
      coalesce((task ->> 'completed')::boolean, false),
      coalesce((task ->> 'important')::boolean, false),
      case
        when coalesce((task ->> 'completed')::boolean, false) then actor
        else null
      end,
      case
        when coalesce((task ->> 'completed')::boolean, false)
          then coalesce((task ->> 'completedAt')::timestamptz, now())
        else null
      end,
      coalesce((task ->> 'createdAt')::timestamptz, now()),
      coalesce((task ->> 'updatedAt')::timestamptz, now())
    );
  end loop;

  return requested_id;
end;
$$;

create or replace function public.todo_shared_list_ids()
returns table(list_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select member.list_id
  from public.todo_list_members as member
  where member.user_id = auth.uid()
  order by member.joined_at desc;
$$;

create or replace function public.todo_list_snapshot(requested_list_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_todo_member(requested_list_id) then
      jsonb_build_object(
        'list', jsonb_build_object(
          'id', list.id,
          'name', list.name,
          'mode', 'shared',
          'role', current_member.role,
          'ownerUserId', list.owner_user_id,
          'ownerName', owner_member.display_name,
          'createdAt', list.created_at,
          'updatedAt', list.updated_at
        ),
        'tasks', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', item.id,
              'listId', item.list_id,
              'title', item.title,
              'completed', item.completed,
              'important', item.important,
              'assigneeUserId', item.assignee_user_id,
              'completedByUserId', item.completed_by_user_id,
              'completedAt', item.completed_at,
              'version', item.version,
              'createdAt', item.created_at,
              'updatedAt', item.updated_at
            )
            order by item.created_at desc
          )
          from public.todo_items as item
          where item.list_id = list.id
        ), '[]'::jsonb),
        'members', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'listId', member.list_id,
              'userId', member.user_id,
              'displayName', member.display_name,
              'role', member.role,
              'joinedAt', member.joined_at
            )
            order by member.role, member.joined_at
          )
          from public.todo_list_members as member
          where member.list_id = list.id
        ), '[]'::jsonb)
      )
    else null
  end
  from public.todo_lists as list
  join public.todo_list_members as current_member
    on current_member.list_id = list.id
   and current_member.user_id = auth.uid()
  join public.todo_list_members as owner_member
    on owner_member.list_id = list.id
   and owner_member.user_id = list.owner_user_id
  where list.id = requested_list_id;
$$;

create or replace function public.apply_todo_mutation(
  mutation_id uuid,
  requested_list_id uuid,
  operation text,
  mutation_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  requested_task_id uuid;
  requested_assignee uuid;
  requested_completed boolean;
  existing_item public.todo_items;
begin
  if actor is null or not public.is_todo_member(requested_list_id) then
    raise exception 'You no longer have access to this list.';
  end if;
  if exists (
    select 1 from public.todo_mutation_receipts as receipt
    where receipt.user_id = actor and receipt.mutation_id = apply_todo_mutation.mutation_id
  ) then
    return;
  end if;

  if operation = 'set_completion' then
    requested_task_id := (mutation_payload ->> 'taskId')::uuid;
    requested_completed := (mutation_payload ->> 'completed')::boolean;
    select * into existing_item
    from public.todo_items as item
    where item.id = requested_task_id and item.list_id = requested_list_id
    for update;

    if existing_item.id is null or (
      not public.is_todo_owner(requested_list_id)
      and existing_item.assignee_user_id is not null
      and existing_item.assignee_user_id <> actor
    ) then
      raise exception 'This item is assigned to someone else.';
    end if;

    update public.todo_items
    set
      completed = requested_completed,
      completed_by_user_id = case when requested_completed then actor else null end,
      completed_at = case when requested_completed then now() else null end,
      updated_at = now(),
      version = version + 1
    where id = requested_task_id and list_id = requested_list_id;
  else
    if not public.is_todo_owner(requested_list_id) then
      raise exception 'Only the list owner can make that change.';
    end if;

    if operation = 'rename_list' then
      update public.todo_lists
      set name = left(btrim(mutation_payload ->> 'name'), 80), updated_at = now()
      where id = requested_list_id;
    elsif operation = 'add_task' then
      insert into public.todo_items(id, list_id, title, completed, important, created_at, updated_at)
      values (
        (mutation_payload -> 'task' ->> 'id')::uuid,
        requested_list_id,
        left(btrim(mutation_payload -> 'task' ->> 'title'), 160),
        false,
        coalesce((mutation_payload -> 'task' ->> 'important')::boolean, false),
        now(),
        now()
      )
      on conflict (id) do nothing;
    elsif operation = 'update_task' then
      requested_task_id := (mutation_payload ->> 'taskId')::uuid;
      update public.todo_items
      set
        title = case
          when mutation_payload ? 'title' then left(btrim(mutation_payload ->> 'title'), 160)
          else title
        end,
        important = case
          when mutation_payload ? 'important'
            then (mutation_payload ->> 'important')::boolean
          else important
        end,
        updated_at = now(),
        version = version + 1
      where id = requested_task_id and list_id = requested_list_id;
    elsif operation = 'delete_task' then
      delete from public.todo_items
      where id = (mutation_payload ->> 'taskId')::uuid
        and list_id = requested_list_id;
    elsif operation = 'set_assignee' then
      requested_task_id := (mutation_payload ->> 'taskId')::uuid;
      requested_assignee := nullif(mutation_payload ->> 'assigneeUserId', '')::uuid;
      if requested_assignee is not null and not exists (
        select 1 from public.todo_list_members as member
        where member.list_id = requested_list_id
          and member.user_id = requested_assignee
      ) then
        raise exception 'The assignee is not a member of this list.';
      end if;
      update public.todo_items
      set assignee_user_id = requested_assignee, updated_at = now(), version = version + 1
      where id = requested_task_id and list_id = requested_list_id;
    elsif operation = 'clear_completed' then
      delete from public.todo_items
      where list_id = requested_list_id and completed;
    else
      raise exception 'Unsupported to-do mutation.';
    end if;
  end if;

  update public.todo_lists
  set updated_at = now()
  where id = requested_list_id;

  insert into public.todo_mutation_receipts(user_id, mutation_id, list_id)
  values (actor, mutation_id, requested_list_id);
end;
$$;

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
    invitee_email
  )
  values (
    requested_list_id,
    auth.uid(),
    public.todo_display_name(),
    normalized_email
  )
  on conflict (list_id, invitee_email)
    where accepted_at is null and revoked_at is null
  do update set created_at = now(), inviter_name = excluded.inviter_name
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
    and public.is_todo_owner(requested_list_id)
  order by invite.created_at desc;
$$;

create or replace function public.revoke_todo_email_invite(invite_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.todo_email_invites
  set revoked_at = coalesce(revoked_at, now())
  where id = invite_id and inviter_user_id = auth.uid();
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
        created_by_user_id
      )
      values (
        requested_list_id,
        extensions.digest(generated_code, 'sha256'),
        auth.uid()
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
  limit 1;
  if requested_list_id is null then
    raise exception 'This list link is invalid or has been revoked.';
  end if;

  insert into public.todo_list_members(list_id, user_id, display_name, role)
  values (requested_list_id, auth.uid(), public.todo_display_name(), 'member')
  on conflict (list_id, user_id) do nothing;
  return requested_list_id;
end;
$$;

create or replace function public.revoke_todo_share_link(requested_list_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.todo_share_links
  set revoked_at = coalesce(revoked_at, now())
  where list_id = requested_list_id
    and revoked_at is null
    and public.is_todo_owner(requested_list_id);
$$;

create or replace function public.remove_todo_member(
  requested_list_id uuid,
  requested_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_todo_owner(requested_list_id) then
    raise exception 'Only the owner can remove members.';
  end if;
  if requested_user_id = auth.uid() then
    raise exception 'The owner cannot remove themselves.';
  end if;
  update public.todo_items
  set assignee_user_id = null, updated_at = now(), version = version + 1
  where list_id = requested_list_id and assignee_user_id = requested_user_id;
  delete from public.todo_list_members
  where list_id = requested_list_id and user_id = requested_user_id and role = 'member';
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
    raise exception 'The owner must delete the list instead.';
  end if;
  update public.todo_items
  set assignee_user_id = null, updated_at = now(), version = version + 1
  where list_id = requested_list_id and assignee_user_id = auth.uid();
  delete from public.todo_list_members
  where list_id = requested_list_id and user_id = auth.uid();
end;
$$;

create or replace function public.delete_todo_list(requested_list_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.todo_lists
  where id = requested_list_id and owner_user_id = auth.uid();
$$;

-- Private broadcasts invalidate client caches without exposing row payloads.
create or replace function public.broadcast_todo_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_list_id uuid;
begin
  if tg_table_name = 'todo_lists' then
    changed_list_id := coalesce(new.id, old.id);
  else
    changed_list_id := coalesce(new.list_id, old.list_id);
  end if;
  perform realtime.broadcast_changes(
    'todo:list:' || changed_list_id::text,
    'changed',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger todo_lists_broadcast
after insert or update or delete on public.todo_lists
for each row execute function public.broadcast_todo_change();

create trigger todo_items_broadcast
after insert or update or delete on public.todo_items
for each row execute function public.broadcast_todo_change();

create trigger todo_members_broadcast
after insert or update or delete on public.todo_list_members
for each row execute function public.broadcast_todo_change();

create policy "todo members receive private broadcasts"
on realtime.messages for select to authenticated
using (
  split_part(realtime.topic(), ':', 1) = 'todo'
  and split_part(realtime.topic(), ':', 2) = 'list'
  and public.is_todo_member(split_part(realtime.topic(), ':', 3)::uuid)
);

revoke all on function public.todo_display_name() from public;
revoke all on function public.is_todo_member(uuid) from public;
revoke all on function public.is_todo_owner(uuid) from public;
revoke all on function public.publish_todo_list(jsonb) from public;
revoke all on function public.todo_shared_list_ids() from public;
revoke all on function public.todo_list_snapshot(uuid) from public;
revoke all on function public.apply_todo_mutation(uuid, uuid, text, jsonb) from public;
revoke all on function public.create_todo_email_invite(uuid, text) from public;
revoke all on function public.list_todo_email_invites() from public;
revoke all on function public.todo_list_pending_invites(uuid) from public;
revoke all on function public.revoke_todo_email_invite(uuid) from public;
revoke all on function public.accept_todo_email_invite(uuid) from public;
revoke all on function public.create_todo_share_link(uuid) from public;
revoke all on function public.resolve_todo_share_link(text) from public;
revoke all on function public.accept_todo_share_link(text) from public;
revoke all on function public.revoke_todo_share_link(uuid) from public;
revoke all on function public.remove_todo_member(uuid, uuid) from public;
revoke all on function public.leave_todo_list(uuid) from public;
revoke all on function public.delete_todo_list(uuid) from public;

grant execute on function public.publish_todo_list(jsonb) to authenticated;
grant execute on function public.is_todo_member(uuid) to authenticated;
grant execute on function public.todo_shared_list_ids() to authenticated;
grant execute on function public.todo_list_snapshot(uuid) to authenticated;
grant execute on function public.apply_todo_mutation(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.create_todo_email_invite(uuid, text) to authenticated;
grant execute on function public.list_todo_email_invites() to authenticated;
grant execute on function public.todo_list_pending_invites(uuid) to authenticated;
grant execute on function public.revoke_todo_email_invite(uuid) to authenticated;
grant execute on function public.accept_todo_email_invite(uuid) to authenticated;
grant execute on function public.create_todo_share_link(uuid) to authenticated;
grant execute on function public.resolve_todo_share_link(text) to authenticated;
grant execute on function public.accept_todo_share_link(text) to authenticated;
grant execute on function public.revoke_todo_share_link(uuid) to authenticated;
grant execute on function public.remove_todo_member(uuid, uuid) to authenticated;
grant execute on function public.leave_todo_list(uuid) to authenticated;
grant execute on function public.delete_todo_list(uuid) to authenticated;

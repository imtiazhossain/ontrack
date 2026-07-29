-- One secure link can grant access to a selected set of collaborative checklists.
create table public.todo_collaborator_links (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.todo_collaborator_link_lists (
  link_id uuid not null references public.todo_collaborator_links(id) on delete cascade,
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  primary key (link_id, list_id)
);

alter table public.todo_collaborator_links enable row level security;
alter table public.todo_collaborator_link_lists enable row level security;

revoke all on public.todo_collaborator_links from anon, authenticated;
revoke all on public.todo_collaborator_link_lists from anon, authenticated;

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
      insert into public.todo_collaborator_links(token_hash, created_by_user_id)
      values (extensions.digest(generated_code, 'sha256'), auth.uid())
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
    and link.revoked_at is null;

  if coalesce(cardinality(accepted_list_ids), 0) = 0 then
    raise exception 'This collaborator link is invalid or has been revoked.';
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

revoke all on function public.create_todo_collaborator_link(uuid[]) from public;
revoke all on function public.resolve_todo_collaborator_link(text) from public;
revoke all on function public.accept_todo_collaborator_link(text) from public;

grant execute on function public.create_todo_collaborator_link(uuid[]) to authenticated;
grant execute on function public.resolve_todo_collaborator_link(text) to authenticated;
grant execute on function public.accept_todo_collaborator_link(text) to authenticated;

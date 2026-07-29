-- Publish a list with one set-based task insert instead of one INSERT per task.
create or replace function public.publish_todo_list(list_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_id uuid;
  requested_name text;
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
  select
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
  from jsonb_array_elements(coalesce(list_payload -> 'tasks', '[]'::jsonb))
    as expanded(task);

  return requested_id;
end;
$$;

-- Apply heterogeneous offline mutations in one network round trip and one
-- database transaction. A savepoint around each item keeps one invalid
-- mutation from preventing independent mutations in the same chunk.
create or replace function public.apply_todo_mutations(mutations jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mutation jsonb;
  mutation_id uuid;
  results jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or jsonb_typeof(mutations) <> 'array' then
    raise exception 'Sign in to sync list changes.';
  end if;
  if jsonb_array_length(mutations) < 1 or jsonb_array_length(mutations) > 50 then
    raise exception 'Mutation batches must contain between 1 and 50 changes.';
  end if;

  for mutation in select value from jsonb_array_elements(mutations)
  loop
    mutation_id := (mutation ->> 'id')::uuid;
    begin
      perform public.apply_todo_mutation(
        mutation_id,
        (mutation ->> 'listId')::uuid,
        mutation ->> 'operation',
        coalesce(mutation -> 'payload', '{}'::jsonb)
      );
      results := results || jsonb_build_array(jsonb_build_object(
        'id', mutation_id,
        'ok', true
      ));
    exception when others then
      results := results || jsonb_build_array(jsonb_build_object(
        'id', mutation_id,
        'ok', false,
        'error', sqlerrm
      ));
    end;
  end loop;

  return results;
end;
$$;

revoke all on function public.apply_todo_mutations(jsonb) from public;
grant execute on function public.apply_todo_mutations(jsonb) to authenticated;

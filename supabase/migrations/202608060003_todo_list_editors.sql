-- Checklist/grocery list editors: friends who can edit items without owning the list.

alter table public.todo_list_members
  drop constraint if exists todo_list_members_role_check;

alter table public.todo_list_members
  add constraint todo_list_members_role_check
  check (role in ('owner', 'editor', 'member'));

create or replace function public.is_todo_editor(requested_list_id uuid)
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
      and member.role in ('owner', 'editor')
  );
$$;

create or replace function public.set_todo_member_role(
  requested_list_id uuid,
  requested_user_id uuid,
  requested_role text
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
    raise exception 'Only the owner can change member roles.';
  end if;
  if requested_user_id is null or requested_user_id = auth.uid() then
    raise exception 'Pick a collaborator to update.';
  end if;
  if requested_role not in ('editor', 'member') then
    raise exception 'Role must be editor or member.';
  end if;
  if not exists (
    select 1
    from public.todo_list_members as member
    where member.list_id = requested_list_id
      and member.user_id = requested_user_id
      and member.role in ('editor', 'member')
  ) then
    raise exception 'That person is not a collaborator on this list.';
  end if;

  update public.todo_list_members
  set role = requested_role
  where list_id = requested_list_id
    and user_id = requested_user_id
    and role in ('editor', 'member');
end;
$$;

create or replace function public.add_todo_friend_editors(
  requested_list_id uuid,
  requested_user_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  friend_id uuid;
  friend_name text;
begin
  if actor is null then
    raise exception 'Sign in required.';
  end if;
  if not public.is_todo_owner(requested_list_id) then
    raise exception 'Only the owner can add editors.';
  end if;
  if requested_user_ids is null or cardinality(requested_user_ids) = 0 then
    raise exception 'Pick at least one friend.';
  end if;

  foreach friend_id in array requested_user_ids
  loop
    if friend_id is null or friend_id = actor then
      continue;
    end if;
    if not public.are_friends(actor, friend_id) then
      raise exception 'Editors can only be added from your friends.';
    end if;

    select coalesce(nullif(btrim(profile.display_name), ''), 'onTrack member')
      into friend_name
    from public.profiles as profile
    where profile.user_id = friend_id;

    if friend_name is null then
      friend_name := 'onTrack member';
    end if;

    insert into public.todo_list_members(list_id, user_id, display_name, role)
    values (requested_list_id, friend_id, friend_name, 'editor')
    on conflict (list_id, user_id) do update
      set
        role = case
          when public.todo_list_members.role = 'owner' then 'owner'
          else 'editor'
        end,
        display_name = excluded.display_name;
  end loop;
end;
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
  where list_id = requested_list_id
    and user_id = requested_user_id
    and role in ('editor', 'member');
end;
$$;

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
      and member.role in ('editor', 'member')
  ) then
    raise exception 'Ownership can only be transferred to a current collaborator.';
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

  update public.todo_email_invites
  set inviter_user_id = new_owner_user_id
  where list_id = requested_list_id
    and accepted_at is null
    and revoked_at is null
    and inviter_user_id = actor;

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

  update public.todo_share_links
  set revoked_at = coalesce(revoked_at, now())
  where list_id = requested_list_id
    and revoked_at is null;
end;
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
  requested_recipe_id uuid;
  requested_assignee uuid;
  requested_completed boolean;
  existing_item public.todo_items;
  recipe_payload jsonb;
  editor_ops text[] := array[
    'add_task',
    'update_task',
    'delete_task',
    'set_assignee',
    'reorder_tasks',
    'clear_completed'
  ];
begin
  if actor is null or not public.is_todo_member(requested_list_id) then
    raise exception 'You no longer have access to this list.';
  end if;
  if exists (
    select 1 from public.todo_mutation_receipts as receipt
    where receipt.user_id = actor
      and receipt.mutation_id = apply_todo_mutation.mutation_id
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
      not public.is_todo_editor(requested_list_id)
      and existing_item.assignee_user_id is not null
      and existing_item.assignee_user_id <> actor
    ) then
      raise exception 'This item is assigned to someone else.';
    end if;

    update public.todo_items
    set completed = requested_completed,
      completed_by_user_id = case when requested_completed then actor else null end,
      completed_at = case when requested_completed then now() else null end,
      updated_at = now(),
      version = version + 1
    where id = requested_task_id and list_id = requested_list_id;
  elsif operation = 'set_tasks_completion' then
    requested_completed := (mutation_payload ->> 'completed')::boolean;
    update public.todo_items
    set completed = requested_completed,
      completed_by_user_id = case when requested_completed then actor else null end,
      completed_at = case when requested_completed then now() else null end,
      updated_at = now(),
      version = version + 1
    where list_id = requested_list_id
      and id in (
        select value::uuid
        from jsonb_array_elements_text(
          coalesce(mutation_payload -> 'taskIds', '[]'::jsonb)
        )
      )
      and (
        public.is_todo_editor(requested_list_id)
        or assignee_user_id is null
        or assignee_user_id = actor
      );
  else
    if operation = any (editor_ops) then
      if not public.is_todo_editor(requested_list_id) then
        raise exception 'Only an editor or owner can make that change.';
      end if;
    elsif not public.is_todo_owner(requested_list_id) then
      raise exception 'Only the list owner can make that change.';
    end if;

    if operation = 'rename_list' then
      update public.todo_lists
      set name = left(btrim(mutation_payload ->> 'name'), 80),
        updated_at = now()
      where id = requested_list_id;
    elsif operation = 'set_list_kind' then
      if mutation_payload ->> 'kind' not in ('checklist', 'grocery') then
        raise exception 'The list type is invalid.';
      end if;
      if mutation_payload ->> 'kind' = 'checklist'
        and exists (
          select 1 from public.todo_recipes
          where list_id = requested_list_id
        ) then
        raise exception 'Delete recipe groups before converting this list.';
      end if;
      update public.todo_lists
      set kind = mutation_payload ->> 'kind', updated_at = now()
      where id = requested_list_id;
    elsif operation = 'add_task' then
      insert into public.todo_items(
        id, list_id, position, title, completed, important, created_at, updated_at
      )
      values (
        (mutation_payload -> 'task' ->> 'id')::uuid,
        requested_list_id,
        nullif(mutation_payload -> 'task' ->> 'position', '')::double precision,
        left(btrim(mutation_payload -> 'task' ->> 'title'), 160),
        false,
        coalesce((mutation_payload -> 'task' ->> 'important')::boolean, false),
        now(),
        now()
      )
      on conflict (id) do nothing;
    elsif operation = 'add_recipe' then
      recipe_payload := mutation_payload -> 'recipe';
      requested_recipe_id := (recipe_payload ->> 'id')::uuid;
      if not exists (
        select 1 from public.todo_lists
        where id = requested_list_id and kind = 'grocery'
      ) then
        raise exception 'Recipes can only be added to Grocery lists.';
      end if;
      insert into public.todo_recipes(
        id, list_id, name, source_kind, source_url, source_image_path,
        original_servings, target_servings, position, created_at, updated_at
      )
      values (
        requested_recipe_id,
        requested_list_id,
        left(btrim(recipe_payload ->> 'name'), 80),
        case when recipe_payload ->> 'sourceKind' = 'image' then 'image' else 'url' end,
        nullif(left(btrim(recipe_payload ->> 'sourceUrl'), 2000), ''),
        nullif(left(btrim(recipe_payload ->> 'sourceImagePath'), 500), ''),
        nullif(recipe_payload ->> 'originalServings', '')::numeric,
        nullif(recipe_payload ->> 'targetServings', '')::numeric,
        nullif(recipe_payload ->> 'position', '')::double precision,
        coalesce((recipe_payload ->> 'createdAt')::timestamptz, now()),
        now()
      )
      on conflict (id) do nothing;

      insert into public.todo_items(
        id, list_id, recipe_id, ingredient_position, ingredient_name,
        canonical_key, quantity_value, quantity_text, unit, preparation,
        original_text, confidence, title, completed, important, created_at,
        updated_at
      )
      select
        (task ->> 'id')::uuid,
        requested_list_id,
        requested_recipe_id,
        nullif(task ->> 'ingredientPosition', '')::integer,
        nullif(left(btrim(task ->> 'ingredientName'), 100), ''),
        nullif(left(btrim(task ->> 'canonicalKey'), 120), ''),
        nullif(task ->> 'quantityValue', '')::numeric,
        nullif(left(btrim(task ->> 'quantityText'), 40), ''),
        nullif(left(btrim(task ->> 'unit'), 40), ''),
        nullif(left(btrim(task ->> 'preparation'), 80), ''),
        nullif(left(btrim(task ->> 'originalText'), 240), ''),
        nullif(task ->> 'confidence', '')::numeric,
        left(btrim(task ->> 'title'), 160),
        false,
        false,
        now(),
        now()
      from jsonb_array_elements(
        coalesce(mutation_payload -> 'tasks', '[]'::jsonb)
      ) as expanded(task)
      on conflict (id) do nothing;
    elsif operation = 'update_recipe' then
      recipe_payload := mutation_payload -> 'recipe';
      requested_recipe_id := (recipe_payload ->> 'id')::uuid;
      update public.todo_recipes
      set name = left(btrim(recipe_payload ->> 'name'), 80),
        source_url = nullif(left(btrim(recipe_payload ->> 'sourceUrl'), 2000), ''),
        source_image_path = coalesce(
          nullif(left(btrim(recipe_payload ->> 'sourceImagePath'), 500), ''),
          source_image_path
        ),
        original_servings = nullif(recipe_payload ->> 'originalServings', '')::numeric,
        target_servings = nullif(recipe_payload ->> 'targetServings', '')::numeric,
        updated_at = now()
      where id = requested_recipe_id and list_id = requested_list_id;
    elsif operation = 'delete_recipe' then
      delete from public.todo_recipes
      where id = (mutation_payload ->> 'recipeId')::uuid
        and list_id = requested_list_id;
    elsif operation = 'update_ingredient' then
      requested_task_id := (mutation_payload -> 'task' ->> 'id')::uuid;
      update public.todo_items
      set ingredient_name = nullif(left(btrim(mutation_payload -> 'task' ->> 'ingredientName'), 100), ''),
        canonical_key = nullif(left(btrim(mutation_payload -> 'task' ->> 'canonicalKey'), 120), ''),
        quantity_value = nullif(mutation_payload -> 'task' ->> 'quantityValue', '')::numeric,
        quantity_text = nullif(left(btrim(mutation_payload -> 'task' ->> 'quantityText'), 40), ''),
        unit = nullif(left(btrim(mutation_payload -> 'task' ->> 'unit'), 40), ''),
        preparation = nullif(left(btrim(mutation_payload -> 'task' ->> 'preparation'), 80), ''),
        original_text = nullif(left(btrim(mutation_payload -> 'task' ->> 'originalText'), 240), ''),
        confidence = nullif(mutation_payload -> 'task' ->> 'confidence', '')::numeric,
        title = left(btrim(mutation_payload -> 'task' ->> 'title'), 160),
        updated_at = now(),
        version = version + 1
      where id = requested_task_id
        and list_id = requested_list_id
        and recipe_id is not null;
    elsif operation = 'update_task' then
      requested_task_id := (mutation_payload ->> 'taskId')::uuid;
      update public.todo_items
      set title = case
          when mutation_payload ? 'title'
            then left(btrim(mutation_payload ->> 'title'), 160)
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
      requested_recipe_id := nullif(
        mutation_payload ->> 'deleteRecipeId', ''
      )::uuid;
      delete from public.todo_items
      where id = (mutation_payload ->> 'taskId')::uuid
        and list_id = requested_list_id;
      if requested_recipe_id is not null and not exists (
        select 1 from public.todo_items where recipe_id = requested_recipe_id
      ) then
        delete from public.todo_recipes
        where id = requested_recipe_id and list_id = requested_list_id;
      end if;
    elsif operation = 'set_assignee' then
      requested_task_id := (mutation_payload ->> 'taskId')::uuid;
      requested_assignee := nullif(
        mutation_payload ->> 'assigneeUserId', ''
      )::uuid;
      if requested_assignee is not null and not exists (
        select 1 from public.todo_list_members as member
        where member.list_id = requested_list_id
          and member.user_id = requested_assignee
      ) then
        raise exception 'The assignee is not a member of this list.';
      end if;
      update public.todo_items
      set assignee_user_id = requested_assignee,
        updated_at = now(),
        version = version + 1
      where id = requested_task_id and list_id = requested_list_id;
    elsif operation = 'reorder_tasks' then
      update public.todo_items as item
      set position = ordered.position, updated_at = now()
      from (
        select value::uuid as id, ordinality - 1 as position
        from jsonb_array_elements_text(
          coalesce(mutation_payload -> 'orderedIds', '[]'::jsonb)
        ) with ordinality
      ) as ordered
      where item.id = ordered.id and item.list_id = requested_list_id;
    elsif operation = 'reorder_recipes' then
      update public.todo_recipes as recipe
      set position = ordered.position, updated_at = now()
      from (
        select value::uuid as id, ordinality - 1 as position
        from jsonb_array_elements_text(
          coalesce(mutation_payload -> 'orderedIds', '[]'::jsonb)
        ) with ordinality
      ) as ordered
      where recipe.id = ordered.id and recipe.list_id = requested_list_id;
    elsif operation = 'clear_completed' then
      delete from public.todo_items
      where list_id = requested_list_id and completed;
      delete from public.todo_recipes as recipe
      where recipe.list_id = requested_list_id
        and not exists (
          select 1 from public.todo_items as item
          where item.recipe_id = recipe.id
        );
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

revoke all on function public.is_todo_editor(uuid) from public;
revoke all on function public.set_todo_member_role(uuid, uuid, text) from public;
revoke all on function public.add_todo_friend_editors(uuid, uuid[]) from public;

grant execute on function public.is_todo_editor(uuid) to authenticated;
grant execute on function public.set_todo_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.add_todo_friend_editors(uuid, uuid[]) to authenticated;

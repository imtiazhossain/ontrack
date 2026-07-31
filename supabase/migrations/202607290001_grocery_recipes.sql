-- Grocery lists and recipe ingredients extend collaborative to-do lists while
-- preserving all existing standalone checklist rows.
alter table public.todo_lists
  add column kind text not null default 'checklist';

alter table public.todo_lists
  add constraint todo_lists_kind_check
  check (kind in ('checklist', 'grocery'));

update public.todo_lists
set kind = 'grocery'
where name ~* '\m(grocery|groceries|supermarket)\M';

create table public.todo_recipes (
  id uuid primary key,
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  source_kind text not null check (source_kind in ('url', 'image')),
  source_url text,
  source_image_path text,
  original_servings numeric check (original_servings > 0),
  target_servings numeric check (target_servings > 0),
  position double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.todo_items
  add column position double precision,
  add column recipe_id uuid references public.todo_recipes(id) on delete cascade,
  add column ingredient_position integer check (ingredient_position >= 0),
  add column ingredient_name text,
  add column canonical_key text,
  add column quantity_value numeric check (quantity_value >= 0),
  add column quantity_text text,
  add column unit text,
  add column preparation text,
  add column original_text text,
  add column confidence numeric check (confidence between 0 and 1);

create index todo_recipes_list_position_idx
  on public.todo_recipes(list_id, position, created_at);
create index todo_items_recipe_position_idx
  on public.todo_items(recipe_id, ingredient_position)
  where recipe_id is not null;
create index todo_items_list_position_idx
  on public.todo_items(list_id, position);

alter table public.todo_recipes enable row level security;
revoke all on public.todo_recipes from anon, authenticated;

create policy "members read todo recipes"
on public.todo_recipes for select to authenticated
using (public.is_todo_member(list_id));

grant select on public.todo_recipes to authenticated;

drop trigger if exists todo_recipes_broadcast on public.todo_recipes;
create trigger todo_recipes_broadcast
after insert or update or delete on public.todo_recipes
for each row execute function public.broadcast_todo_change();

create or replace function public.publish_todo_list(list_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_id uuid;
  requested_name text;
  requested_kind text;
  actor uuid := auth.uid();
begin
  if actor is null or jsonb_typeof(list_payload) <> 'object' then
    raise exception 'Sign in to share this list.';
  end if;

  requested_id := (list_payload ->> 'id')::uuid;
  requested_name := btrim(list_payload ->> 'name');
  requested_kind := coalesce(nullif(list_payload ->> 'kind', ''), 'checklist');
  if length(requested_name) not between 1 and 80
    or requested_kind not in ('checklist', 'grocery') then
    raise exception 'The list details are invalid.';
  end if;

  insert into public.todo_lists(id, owner_user_id, name, kind)
  values (requested_id, actor, requested_name, requested_kind);

  insert into public.todo_list_members(list_id, user_id, display_name, role)
  values (requested_id, actor, public.todo_display_name(), 'owner');

  insert into public.todo_recipes(
    id, list_id, name, source_kind, source_url, source_image_path,
    original_servings, target_servings, position, created_at, updated_at
  )
  select
    (recipe ->> 'id')::uuid,
    requested_id,
    left(btrim(recipe ->> 'name'), 80),
    case when recipe ->> 'sourceKind' = 'image' then 'image' else 'url' end,
    nullif(left(btrim(recipe ->> 'sourceUrl'), 2000), ''),
    nullif(left(btrim(recipe ->> 'sourceImagePath'), 500), ''),
    nullif(recipe ->> 'originalServings', '')::numeric,
    nullif(recipe ->> 'targetServings', '')::numeric,
    nullif(recipe ->> 'position', '')::double precision,
    coalesce((recipe ->> 'createdAt')::timestamptz, now()),
    coalesce((recipe ->> 'updatedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(list_payload -> 'recipes', '[]'::jsonb))
    as expanded(recipe);

  insert into public.todo_items(
    id, list_id, position, recipe_id, ingredient_position, ingredient_name,
    canonical_key, quantity_value, quantity_text, unit, preparation,
    original_text, confidence, title, completed, important, assignee_user_id,
    completed_by_user_id, completed_at, version, created_at, updated_at
  )
  select
    (task ->> 'id')::uuid,
    requested_id,
    nullif(task ->> 'position', '')::double precision,
    nullif(task ->> 'recipeId', '')::uuid,
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
    coalesce((task ->> 'completed')::boolean, false),
    coalesce((task ->> 'important')::boolean, false),
    nullif(task ->> 'assigneeUserId', '')::uuid,
    case
      when coalesce((task ->> 'completed')::boolean, false)
        then coalesce(nullif(task ->> 'completedByUserId', '')::uuid, actor)
      else null
    end,
    case
      when coalesce((task ->> 'completed')::boolean, false)
        then coalesce((task ->> 'completedAt')::timestamptz, now())
      else null
    end,
    coalesce((task ->> 'version')::bigint, 0),
    coalesce((task ->> 'createdAt')::timestamptz, now()),
    coalesce((task ->> 'updatedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(list_payload -> 'tasks', '[]'::jsonb))
    as expanded(task);

  return requested_id;
end;
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
          'kind', list.kind,
          'mode', 'shared',
          'role', current_member.role,
          'ownerUserId', list.owner_user_id,
          'ownerName', owner_member.display_name,
          'createdAt', list.created_at,
          'updatedAt', list.updated_at
        ),
        'recipes', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', recipe.id,
              'listId', recipe.list_id,
              'name', recipe.name,
              'sourceKind', recipe.source_kind,
              'sourceUrl', recipe.source_url,
              'sourceImageUri', case
                when recipe.source_image_path is null then null
                else 'ontrack-todo-recipe-media:' || recipe.source_image_path
              end,
              'sourceImagePath', recipe.source_image_path,
              'originalServings', recipe.original_servings,
              'targetServings', recipe.target_servings,
              'position', recipe.position,
              'createdAt', recipe.created_at,
              'updatedAt', recipe.updated_at
            )
            order by recipe.position nulls last, recipe.created_at desc
          )
          from public.todo_recipes as recipe
          where recipe.list_id = list.id
        ), '[]'::jsonb),
        'tasks', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', item.id,
              'listId', item.list_id,
              'position', item.position,
              'recipeId', item.recipe_id,
              'ingredientPosition', item.ingredient_position,
              'ingredientName', item.ingredient_name,
              'canonicalKey', item.canonical_key,
              'quantityValue', item.quantity_value,
              'quantityText', item.quantity_text,
              'unit', item.unit,
              'preparation', item.preparation,
              'originalText', item.original_text,
              'confidence', item.confidence,
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
            order by item.recipe_id nulls last,
              item.ingredient_position nulls last,
              item.position nulls last,
              item.created_at desc
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
  requested_recipe_id uuid;
  requested_assignee uuid;
  requested_completed boolean;
  existing_item public.todo_items;
  recipe_payload jsonb;
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
      not public.is_todo_owner(requested_list_id)
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
        public.is_todo_owner(requested_list_id)
        or assignee_user_id is null
        or assignee_user_id = actor
      );
  else
    if not public.is_todo_owner(requested_list_id) then
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

-- Shared recipe thumbnails are private, scoped by list ID, and always served
-- through signed URLs.
insert into storage.buckets(id, name, public)
values ('todo-recipe-images', 'todo-recipe-images', false)
on conflict (id) do update set public = false;

create or replace function public.todo_recipe_media_list_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  folder text := split_part(object_name, '/', 1);
begin
  if folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return folder::uuid;
end;
$$;

create policy "todo members read recipe images"
on storage.objects for select to authenticated
using (
  bucket_id = 'todo-recipe-images'
  and public.is_todo_member(public.todo_recipe_media_list_id(name))
);

create policy "todo owners upload recipe images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'todo-recipe-images'
  and public.is_todo_owner(public.todo_recipe_media_list_id(name))
);

create policy "todo owners update recipe images"
on storage.objects for update to authenticated
using (
  bucket_id = 'todo-recipe-images'
  and public.is_todo_owner(public.todo_recipe_media_list_id(name))
)
with check (
  bucket_id = 'todo-recipe-images'
  and public.is_todo_owner(public.todo_recipe_media_list_id(name))
);

create policy "todo owners delete recipe images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'todo-recipe-images'
  and public.is_todo_owner(public.todo_recipe_media_list_id(name))
);

revoke all on function public.todo_recipe_media_list_id(text) from public;
grant execute on function public.todo_recipe_media_list_id(text) to authenticated;
revoke all on function public.publish_todo_list(jsonb) from public;
grant execute on function public.publish_todo_list(jsonb) to authenticated;
revoke all on function public.todo_list_snapshot(uuid) from public;
grant execute on function public.todo_list_snapshot(uuid) to authenticated;
revoke all on function public.apply_todo_mutation(uuid, uuid, text, jsonb) from public;
grant execute on function public.apply_todo_mutation(uuid, uuid, text, jsonb) to authenticated;


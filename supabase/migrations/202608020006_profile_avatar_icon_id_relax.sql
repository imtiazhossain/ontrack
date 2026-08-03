-- Allow underscores / dots in Iconify ids (common in set prefixes and names).

alter table public.profiles
  drop constraint if exists profiles_avatar_icon_id_check;

alter table public.profiles
  add constraint profiles_avatar_icon_id_check
  check (
    avatar_icon_id is null
    or avatar_icon_id ~ '^[a-z0-9][a-z0-9_-]{0,63}:[a-z0-9][a-z0-9._-]{0,127}$'
  );

create or replace function public.set_profile_avatar(
  requested_kind text,
  requested_color text default null,
  requested_icon_id text default null,
  requested_photo_path text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  kind text := lower(btrim(coalesce(requested_kind, '')));
  color text := nullif(upper(btrim(coalesce(requested_color, ''))), '');
  icon_id text := nullif(lower(btrim(coalesce(requested_icon_id, ''))), '');
  photo_path text := nullif(btrim(coalesce(requested_photo_path, '')), '');
  result public.profiles;
begin
  if actor is null then
    raise exception 'Sign in to update your avatar.';
  end if;

  perform public.ensure_profile();

  if kind not in ('initials', 'icon', 'photo') then
    raise exception 'Pick initials, an icon, or a photo.';
  end if;

  if color is not null and color !~ '^#[0-9A-F]{6}$' then
    raise exception 'Avatar color must be a hex value like #9A7654.';
  end if;

  if kind = 'initials' then
    icon_id := null;
    photo_path := null;
  elsif kind = 'icon' then
    if icon_id is null
      or icon_id !~ '^[a-z0-9][a-z0-9_-]{0,63}:[a-z0-9][a-z0-9._-]{0,127}$' then
      raise exception 'Choose a valid icon.';
    end if;
    photo_path := null;
  else
    if photo_path is null
      or length(photo_path) not between 3 and 400
      or photo_path ~ '[[:space:]]'
      or split_part(photo_path, '/', 1) <> actor::text then
      raise exception 'Avatar photo could not be saved.';
    end if;
    icon_id := null;
  end if;

  update public.profiles
  set
    avatar_kind = kind,
    avatar_color = color,
    avatar_icon_id = icon_id,
    avatar_photo_path = photo_path,
    updated_at = now()
  where user_id = actor
  returning * into result;

  if result.user_id is null then
    raise exception 'Your profile could not be updated.';
  end if;

  return result;
end;
$$;

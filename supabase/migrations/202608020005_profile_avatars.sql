-- Global profile avatars: kind / color / Iconify id / private photo path.

alter table public.profiles
  add column if not exists avatar_kind text not null default 'initials'
    check (avatar_kind in ('initials', 'icon', 'photo')),
  add column if not exists avatar_color text
    check (avatar_color is null or avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists avatar_icon_id text
    check (
      avatar_icon_id is null
      or avatar_icon_id ~ '^[a-z0-9][a-z0-9-]{0,63}:[a-z0-9][a-z0-9-]{0,127}$'
    ),
  add column if not exists avatar_photo_path text
    check (
      avatar_photo_path is null
      or (
        length(btrim(avatar_photo_path)) between 3 and 400
        and avatar_photo_path !~ '[[:space:]]'
      )
    );

alter table public.profiles
  drop constraint if exists profiles_avatar_payload_check;

alter table public.profiles
  add constraint profiles_avatar_payload_check
  check (
    (avatar_kind = 'initials' and avatar_icon_id is null and avatar_photo_path is null)
    or (avatar_kind = 'icon' and avatar_icon_id is not null and avatar_photo_path is null)
    or (avatar_kind = 'photo' and avatar_photo_path is not null and avatar_icon_id is null)
  );

-- Prefer live profiles.display_name when present.
create or replace function public.travel_user_display_name(requested_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select nullif(btrim(profile.display_name), '')
      from public.profiles as profile
      where profile.user_id = requested_user_id
      limit 1
    ),
    nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(account.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(account.email, ''), '@', 1), ''),
    'Traveler'
  )
  from auth.users as account
  where account.id = requested_user_id
  limit 1;
$$;

-- ensure_profile remains name/email only; avatar columns are preserved on conflict.
create or replace function public.ensure_profile(
  requested_display_name text default null,
  requested_email text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_email text := lower(btrim(coalesce(
    nullif(btrim(coalesce(requested_email, '')), ''),
    coalesce(auth.jwt() ->> 'email', '')
  )));
  normalized_name text := coalesce(
    nullif(btrim(coalesce(requested_display_name, '')), ''),
    public.social_display_name()
  );
  result public.profiles;
begin
  if actor is null then
    raise exception 'Sign in to manage your profile.';
  end if;
  if length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid account email is required.';
  end if;
  if length(normalized_name) not between 1 and 120 then
    raise exception 'Display name must be between 1 and 120 characters.';
  end if;

  insert into public.profiles (user_id, display_name, email, updated_at)
  values (actor, normalized_name, normalized_email, now())
  on conflict (user_id) do update
    set
      display_name = excluded.display_name,
      email = excluded.email,
      updated_at = now()
  returning * into result;

  update public.friend_requests
  set to_user_id = actor
  where status = 'pending'
    and to_user_id is null
    and lower(to_email) = normalized_email
    and from_user_id <> actor;

  return result;
end;
$$;

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
      or icon_id !~ '^[a-z0-9][a-z0-9-]{0,63}:[a-z0-9][a-z0-9-]{0,127}$' then
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

drop function if exists public.list_friends();

create or replace function public.list_friends()
returns table (
  user_id uuid,
  display_name text,
  email text,
  friends_since timestamptz,
  avatar_kind text,
  avatar_color text,
  avatar_icon_id text,
  avatar_photo_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when friendship.user_a = auth.uid() then friendship.user_b
      else friendship.user_a
    end as user_id,
    profile.display_name,
    profile.email,
    friendship.created_at as friends_since,
    profile.avatar_kind,
    profile.avatar_color,
    profile.avatar_icon_id,
    profile.avatar_photo_path
  from public.friendships as friendship
  join public.profiles as profile
    on profile.user_id = case
      when friendship.user_a = auth.uid() then friendship.user_b
      else friendship.user_a
    end
  where auth.uid() is not null
    and (friendship.user_a = auth.uid() or friendship.user_b = auth.uid())
  order by lower(profile.display_name), profile.email;
$$;

grant execute on function public.list_friends() to authenticated;

create or replace function public.list_travel_trip_roster(requested_trip_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_trip text := btrim(requested_trip_id);
  host_id uuid;
  host_email text;
  host_name text;
  host_avatar public.profiles%rowtype;
  roster jsonb := '[]'::jsonb;
  member_row record;
  member_avatar public.profiles%rowtype;
  is_cohost boolean;
begin
  if actor is null or length(normalized_trip) not between 1 and 200 then
    raise exception 'Sign in required.';
  end if;

  if not (
    public.is_travel_trip_host(normalized_trip)
    or public.is_travel_trip_member(normalized_trip)
  ) then
    raise exception 'You do not have access to this trip’s friends.';
  end if;

  host_id := public.travel_trip_host_user_id(normalized_trip);
  if host_id is null then
    return '[]'::jsonb;
  end if;

  select account.email into host_email
  from auth.users as account
  where account.id = host_id
  limit 1;

  select * into host_avatar
  from public.profiles as profile
  where profile.user_id = host_id
  limit 1;

  host_name := coalesce(
    nullif(btrim(host_avatar.display_name), ''),
    public.travel_user_display_name(host_id),
    'Host'
  );

  roster := roster || jsonb_build_array(
    jsonb_build_object(
      'userId', host_id,
      'displayName', host_name,
      'email', host_email,
      'role', 'host',
      'avatarKind', coalesce(host_avatar.avatar_kind, 'initials'),
      'avatarColor', host_avatar.avatar_color,
      'avatarIconId', host_avatar.avatar_icon_id,
      'avatarPhotoPath', host_avatar.avatar_photo_path
    )
  );

  for member_row in
    select distinct on (invite.accepted_by_user_id)
      invite.accepted_by_user_id as user_id,
      invite.invitee_name as display_name,
      invite.invitee_email as email,
      invite.code as invite_code,
      invite.accepted_at
    from public.travel_invites as invite
    where invite.trip_id = normalized_trip
      and invite.accepted_by_user_id is not null
      and invite.accepted_by_user_id <> host_id
      and invite.accepted_at is not null
      and invite.revoked_at is null
      and invite.expires_at > now()
    order by invite.accepted_by_user_id, invite.accepted_at desc
  loop
    select exists (
      select 1
      from public.travel_trip_cohosts as cohost
      where cohost.trip_id = normalized_trip
        and cohost.user_id = member_row.user_id
    ) into is_cohost;

    select * into member_avatar
    from public.profiles as profile
    where profile.user_id = member_row.user_id
    limit 1;

    roster := roster || jsonb_build_array(
      jsonb_build_object(
        'userId', member_row.user_id,
        'displayName', coalesce(
          nullif(btrim(member_avatar.display_name), ''),
          nullif(btrim(member_row.display_name), ''),
          'Traveler'
        ),
        'email', member_row.email,
        'role', case when is_cohost then 'cohost' else 'member' end,
        'inviteCode', member_row.invite_code,
        'acceptedAt', member_row.accepted_at,
        'avatarKind', coalesce(member_avatar.avatar_kind, 'initials'),
        'avatarColor', member_avatar.avatar_color,
        'avatarIconId', member_avatar.avatar_icon_id,
        'avatarPhotoPath', member_avatar.avatar_photo_path
      )
    );
  end loop;

  return roster;
end;
$$;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do update set public = false;

drop policy if exists "users read own profile avatars" on storage.objects;
drop policy if exists "users create own profile avatars" on storage.objects;
drop policy if exists "users update own profile avatars" on storage.objects;
drop policy if exists "users delete own profile avatars" on storage.objects;
drop policy if exists "friends read profile avatars" on storage.objects;
drop policy if exists "trip mates read profile avatars" on storage.objects;
drop policy if exists "authenticated read profile avatars" on storage.objects;

-- Paths are only handed out by authorized RPCs (friends / trip roster).
-- Any signed-in user can mint a signed URL for a known avatar path.
create policy "authenticated read profile avatars"
on storage.objects for select to authenticated
using (bucket_id = 'profile-avatars');

create policy "users create own profile avatars"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users update own profile avatars"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete own profile avatars"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

revoke all on function public.set_profile_avatar(text, text, text, text) from public;
grant execute on function public.set_profile_avatar(text, text, text, text) to authenticated;

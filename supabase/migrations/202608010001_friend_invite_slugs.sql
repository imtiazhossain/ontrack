-- Custom friend invite slugs: /f/yourname in addition to hex invite codes.

alter table public.profiles
  add column if not exists invite_slug text;

alter table public.profiles
  drop constraint if exists profiles_invite_slug_format;

alter table public.profiles
  add constraint profiles_invite_slug_format
  check (
    invite_slug is null
    or (
      invite_slug ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$'
      and length(invite_slug) between 3 and 32
      and invite_slug !~ '^[a-f0-9]{20}$'
    )
  );

create unique index if not exists profiles_invite_slug_idx
  on public.profiles (invite_slug)
  where invite_slug is not null;

create or replace function public.normalize_friend_invite_slug(requested_slug text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized text := lower(btrim(coalesce(requested_slug, '')));
  reserved text[] := array[
    'admin', 'api', 'app', 'help', 'invite', 'me', 'null', 'ontrack',
    'profile', 'settings', 'social', 'support', 'undefined', 'user'
  ];
begin
  if length(normalized) = 0 then
    return null;
  end if;
  if length(normalized) not between 3 and 32
    or normalized !~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$'
    or normalized ~ '^[a-f0-9]{20}$'
    or normalized = any (reserved) then
    raise exception 'Choose a link name with 3–32 letters, numbers, or hyphens.';
  end if;
  return normalized;
end;
$$;

create or replace function public.set_friend_invite_slug(requested_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized text;
begin
  if actor is null then
    raise exception 'Sign in to customize your invite link.';
  end if;
  perform public.ensure_profile();

  if nullif(btrim(coalesce(requested_slug, '')), '') is null then
    update public.profiles
    set invite_slug = null, updated_at = now()
    where user_id = actor;
    return null;
  end if;

  normalized := public.normalize_friend_invite_slug(requested_slug);

  if exists (
    select 1
    from public.profiles as profile
    where profile.invite_slug = normalized
      and profile.user_id <> actor
  ) then
    raise exception 'That invite link is already taken.';
  end if;

  update public.profiles
  set invite_slug = normalized, updated_at = now()
  where user_id = actor;

  -- Ensure a durable hex invite exists behind the custom slug.
  perform public.create_friend_invite_link();
  return normalized;
end;
$$;

create or replace function public.get_my_friend_invite()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  profile_row public.profiles;
  invite_code text;
begin
  if actor is null then
    raise exception 'Sign in to view your invite link.';
  end if;
  perform public.ensure_profile();

  select * into profile_row
  from public.profiles as profile
  where profile.user_id = actor;

  invite_code := public.create_friend_invite_link();

  return jsonb_build_object(
    'code', invite_code,
    'slug', profile_row.invite_slug,
    'sharePath', coalesce(profile_row.invite_slug, invite_code),
    'displayName', profile_row.display_name,
    'email', profile_row.email
  );
end;
$$;

create or replace function public.resolve_friend_invite_link(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text := lower(btrim(invite_code));
  link_row public.friend_invite_links;
  from_profile public.profiles;
  slug_token text;
begin
  if length(raw_token) < 3 or length(raw_token) > 32 then
    raise exception 'This friend invite is invalid.';
  end if;

  if raw_token ~ '^[a-f0-9]{20}$' then
    select * into link_row
    from public.friend_invite_links as link
    where link.code = raw_token
      and link.revoked_at is null
      and link.expires_at > now();

    if link_row.code is null then
      raise exception 'This friend invite is unavailable.';
    end if;

    select * into from_profile
    from public.profiles as profile
    where profile.user_id = link_row.from_user_id;

    return jsonb_build_object(
      'code', link_row.code,
      'slug', from_profile.invite_slug,
      'sharePath', coalesce(from_profile.invite_slug, link_row.code),
      'fromUserId', link_row.from_user_id,
      'displayName', coalesce(from_profile.display_name, 'onTrack member'),
      'email', coalesce(from_profile.email, '')
    );
  end if;

  begin
    slug_token := public.normalize_friend_invite_slug(raw_token);
  exception
    when others then
      raise exception 'This friend invite is unavailable.';
  end;

  select * into from_profile
  from public.profiles as profile
  where profile.invite_slug = slug_token;

  if from_profile.user_id is null then
    raise exception 'This friend invite is unavailable.';
  end if;

  select * into link_row
  from public.friend_invite_links as link
  where link.from_user_id = from_profile.user_id
    and link.revoked_at is null
    and link.expires_at > now()
  order by link.created_at desc
  limit 1;

  if link_row.code is null then
    -- Owner may not have opened share yet; still allow friendship via slug.
    return jsonb_build_object(
      'code', slug_token,
      'slug', from_profile.invite_slug,
      'sharePath', from_profile.invite_slug,
      'fromUserId', from_profile.user_id,
      'displayName', coalesce(from_profile.display_name, 'onTrack member'),
      'email', coalesce(from_profile.email, '')
    );
  end if;

  return jsonb_build_object(
    'code', link_row.code,
    'slug', from_profile.invite_slug,
    'sharePath', from_profile.invite_slug,
    'fromUserId', link_row.from_user_id,
    'displayName', coalesce(from_profile.display_name, 'onTrack member'),
    'email', coalesce(from_profile.email, '')
  );
end;
$$;

create or replace function public.accept_friend_invite_link(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  raw_token text := lower(btrim(invite_code));
  link_row public.friend_invite_links;
  from_profile public.profiles;
  target_user uuid;
  left_user uuid;
  right_user uuid;
  slug_token text;
begin
  if actor is null then
    raise exception 'Sign in to accept a friend invite.';
  end if;
  perform public.ensure_profile();

  if raw_token ~ '^[a-f0-9]{20}$' then
    select * into link_row
    from public.friend_invite_links as link
    where link.code = raw_token
      and link.revoked_at is null
      and link.expires_at > now();

    if link_row.code is null then
      raise exception 'This friend invite is unavailable.';
    end if;
    target_user := link_row.from_user_id;
  else
    begin
      slug_token := public.normalize_friend_invite_slug(raw_token);
    exception
      when others then
        raise exception 'This friend invite is unavailable.';
    end;

    select * into from_profile
    from public.profiles as profile
    where profile.invite_slug = slug_token;

    if from_profile.user_id is null then
      raise exception 'This friend invite is unavailable.';
    end if;
    target_user := from_profile.user_id;
  end if;

  if target_user = actor then
    raise exception 'You cannot accept your own friend invite.';
  end if;

  if public.are_friends(actor, target_user) then
    return target_user;
  end if;

  left_user := least(target_user, actor);
  right_user := greatest(target_user, actor);

  insert into public.friendships (user_a, user_b)
  values (left_user, right_user)
  on conflict do nothing;

  insert into public.friend_requests (
    from_user_id,
    to_user_id,
    to_email,
    status,
    responded_at
  )
  values (
    target_user,
    actor,
    coalesce(
      (select email from public.profiles where user_id = actor),
      lower(coalesce(auth.jwt() ->> 'email', ''))
    ),
    'accepted',
    now()
  );

  return target_user;
end;
$$;

revoke all on function public.normalize_friend_invite_slug(text) from public;
revoke all on function public.set_friend_invite_slug(text) from public;
revoke all on function public.get_my_friend_invite() from public;

grant execute on function public.set_friend_invite_slug(text) to authenticated;
grant execute on function public.get_my_friend_invite() to authenticated;
-- resolve/accept already granted; recreate keeps grants on some PG versions — reaffirm:
grant execute on function public.resolve_friend_invite_link(text) to authenticated;
grant execute on function public.accept_friend_invite_link(text) to authenticated;

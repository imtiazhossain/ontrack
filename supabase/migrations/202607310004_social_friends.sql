-- App-level social profiles, friend requests, friendships, and invite links.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  email text not null check (length(btrim(email)) between 3 and 320),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_idx
  on public.profiles (lower(email));

create table if not exists public.friend_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete cascade,
  to_email text not null check (length(btrim(to_email)) between 3 and 320),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (to_user_id is null or to_user_id <> from_user_id)
);

create unique index if not exists friend_requests_pending_email_idx
  on public.friend_requests (from_user_id, lower(to_email))
  where status = 'pending';

create unique index if not exists friend_requests_pending_user_idx
  on public.friend_requests (from_user_id, to_user_id)
  where status = 'pending' and to_user_id is not null;

create index if not exists friend_requests_to_user_idx
  on public.friend_requests (to_user_id, status, created_at desc)
  where to_user_id is not null;

create index if not exists friend_requests_to_email_idx
  on public.friend_requests (lower(to_email), status, created_at desc);

create table if not exists public.friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create index if not exists friendships_user_b_idx
  on public.friendships (user_b, created_at desc);

create table if not exists public.friend_invite_links (
  code text primary key check (code ~ '^[a-f0-9]{20}$'),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

create index if not exists friend_invite_links_from_idx
  on public.friend_invite_links (from_user_id)
  where revoked_at is null;

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_invite_links enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.friend_requests from anon, authenticated;
revoke all on public.friendships from anon, authenticated;
revoke all on public.friend_invite_links from anon, authenticated;

create or replace function public.social_display_name()
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

create or replace function public.are_friends(left_user uuid, right_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships as friendship
    where friendship.user_a = least(left_user, right_user)
      and friendship.user_b = greatest(left_user, right_user)
  );
$$;

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

  -- Attach any pending email-targeted requests to this user.
  update public.friend_requests
  set to_user_id = actor
  where status = 'pending'
    and to_user_id is null
    and lower(to_email) = normalized_email
    and from_user_id <> actor;

  return result;
end;
$$;

create or replace function public.send_friend_request(requested_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_email text := lower(btrim(requested_email));
  target_user uuid;
  request_id uuid;
  actor_email text;
begin
  if actor is null then
    raise exception 'Sign in to add friends.';
  end if;
  perform public.ensure_profile();

  if length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  select profile.email into actor_email
  from public.profiles as profile
  where profile.user_id = actor;

  if actor_email is not null and actor_email = normalized_email then
    raise exception 'You cannot add yourself as a friend.';
  end if;

  select profile.user_id into target_user
  from public.profiles as profile
  where lower(profile.email) = normalized_email
  limit 1;

  if target_user is not null and public.are_friends(actor, target_user) then
    raise exception 'You are already friends.';
  end if;

  if target_user is not null then
    if exists (
      select 1
      from public.friend_requests as request
      where request.status = 'pending'
        and request.from_user_id = target_user
        and (
          request.to_user_id = actor
          or lower(request.to_email) = coalesce(actor_email, '')
        )
    ) then
      -- Reciprocal pending request: accept theirs instead of creating a duplicate.
      select request.id into request_id
      from public.friend_requests as request
      where request.status = 'pending'
        and request.from_user_id = target_user
        and (
          request.to_user_id = actor
          or lower(request.to_email) = coalesce(actor_email, '')
        )
      limit 1;
      perform public.respond_friend_request(request_id, true);
      return request_id;
    end if;
  end if;

  update public.friend_requests
  set
    to_user_id = target_user,
    created_at = now()
  where from_user_id = actor
    and lower(to_email) = normalized_email
    and status = 'pending'
  returning id into request_id;

  if request_id is not null then
    return request_id;
  end if;

  insert into public.friend_requests (
    from_user_id,
    to_user_id,
    to_email,
    status
  )
  values (
    actor,
    target_user,
    normalized_email,
    'pending'
  )
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.respond_friend_request(
  request_id uuid,
  accept boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  requested public.friend_requests;
  actor_email text;
  left_user uuid;
  right_user uuid;
begin
  if actor is null then
    raise exception 'Sign in to respond to friend requests.';
  end if;
  perform public.ensure_profile();

  select profile.email into actor_email
  from public.profiles as profile
  where profile.user_id = actor;

  select * into requested
  from public.friend_requests as request
  where request.id = request_id
    and request.status = 'pending'
    and (
      request.to_user_id = actor
      or (
        request.to_user_id is null
        and lower(request.to_email) = coalesce(actor_email, '')
      )
    )
  for update;

  if requested.id is null then
    raise exception 'This friend request is unavailable.';
  end if;

  if not accept then
    update public.friend_requests
    set status = 'declined', responded_at = now(), to_user_id = actor
    where id = request_id;
    return;
  end if;

  left_user := least(requested.from_user_id, actor);
  right_user := greatest(requested.from_user_id, actor);

  insert into public.friendships (user_a, user_b)
  values (left_user, right_user)
  on conflict do nothing;

  update public.friend_requests
  set status = 'accepted', responded_at = now(), to_user_id = actor
  where id = request_id;

  -- Cancel any other pending requests between the same pair.
  update public.friend_requests
  set status = 'cancelled', responded_at = now()
  where status = 'pending'
    and id <> request_id
    and (
      (from_user_id = requested.from_user_id and to_user_id = actor)
      or (from_user_id = actor and to_user_id = requested.from_user_id)
      or (from_user_id = requested.from_user_id and lower(to_email) = coalesce(actor_email, ''))
      or (from_user_id = actor and lower(to_email) = (
        select lower(profile.email)
        from public.profiles as profile
        where profile.user_id = requested.from_user_id
      ))
    );
end;
$$;

create or replace function public.cancel_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to cancel a friend request.';
  end if;

  update public.friend_requests
  set status = 'cancelled', responded_at = now()
  where id = request_id
    and from_user_id = auth.uid()
    and status = 'pending';
end;
$$;

create or replace function public.remove_friend(friend_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or friend_user_id is null or actor = friend_user_id then
    raise exception 'Sign in to remove a friend.';
  end if;

  delete from public.friendships
  where user_a = least(actor, friend_user_id)
    and user_b = greatest(actor, friend_user_id);
end;
$$;

create or replace function public.list_friends()
returns table (
  user_id uuid,
  display_name text,
  email text,
  friends_since timestamptz
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
    friendship.created_at as friends_since
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

create or replace function public.list_friend_requests()
returns table (
  id uuid,
  direction text,
  status text,
  created_at timestamptz,
  other_user_id uuid,
  other_display_name text,
  other_email text
)
language sql
stable
security definer
set search_path = ''
as $$
  with actor as (
    select
      auth.uid() as user_id,
      lower(coalesce(auth.jwt() ->> 'email', '')) as email
  )
  select
    request.id,
    'incoming'::text as direction,
    request.status,
    request.created_at,
    request.from_user_id as other_user_id,
    coalesce(profile.display_name, 'onTrack member') as other_display_name,
    coalesce(profile.email, '') as other_email
  from public.friend_requests as request
  cross join actor
  left join public.profiles as profile on profile.user_id = request.from_user_id
  where actor.user_id is not null
    and request.status = 'pending'
    and (
      request.to_user_id = actor.user_id
      or (
        request.to_user_id is null
        and lower(request.to_email) = actor.email
      )
    )

  union all

  select
    request.id,
    'outgoing'::text as direction,
    request.status,
    request.created_at,
    request.to_user_id as other_user_id,
    coalesce(profile.display_name, split_part(request.to_email, '@', 1), 'Pending') as other_display_name,
    request.to_email as other_email
  from public.friend_requests as request
  cross join actor
  left join public.profiles as profile on profile.user_id = request.to_user_id
  where actor.user_id is not null
    and request.status = 'pending'
    and request.from_user_id = actor.user_id

  order by created_at desc;
$$;

create or replace function public.create_friend_invite_link()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  existing_code text;
  generated_code text;
begin
  if actor is null then
    raise exception 'Sign in to create a friend invite link.';
  end if;
  perform public.ensure_profile();

  select link.code into existing_code
  from public.friend_invite_links as link
  where link.from_user_id = actor
    and link.revoked_at is null
    and link.expires_at > now()
  order by link.created_at desc
  limit 1;

  if existing_code is not null then
    update public.friend_invite_links
    set expires_at = greatest(expires_at, now() + interval '30 days')
    where code = existing_code;
    return existing_code;
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(10), 'hex');
    begin
      insert into public.friend_invite_links (code, from_user_id)
      values (generated_code, actor);
      return generated_code;
    exception
      when unique_violation then
        null;
    end;
  end loop;
end;
$$;

create or replace function public.resolve_friend_invite_link(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := lower(btrim(invite_code));
  link_row public.friend_invite_links;
  from_profile public.profiles;
begin
  if length(normalized_code) <> 20 or normalized_code !~ '^[a-f0-9]{20}$' then
    raise exception 'This friend invite is invalid.';
  end if;

  select * into link_row
  from public.friend_invite_links as link
  where link.code = normalized_code
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
  normalized_code text := lower(btrim(invite_code));
  link_row public.friend_invite_links;
  from_profile public.profiles;
  request_id uuid;
  left_user uuid;
  right_user uuid;
begin
  if actor is null then
    raise exception 'Sign in to accept a friend invite.';
  end if;
  perform public.ensure_profile();

  select * into link_row
  from public.friend_invite_links as link
  where link.code = normalized_code
    and link.revoked_at is null
    and link.expires_at > now();

  if link_row.code is null then
    raise exception 'This friend invite is unavailable.';
  end if;

  if link_row.from_user_id = actor then
    raise exception 'You cannot accept your own friend invite.';
  end if;

  if public.are_friends(actor, link_row.from_user_id) then
    return link_row.from_user_id;
  end if;

  select * into from_profile
  from public.profiles as profile
  where profile.user_id = link_row.from_user_id;

  left_user := least(link_row.from_user_id, actor);
  right_user := greatest(link_row.from_user_id, actor);

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
    link_row.from_user_id,
    actor,
    coalesce(
      (select email from public.profiles where user_id = actor),
      lower(coalesce(auth.jwt() ->> 'email', ''))
    ),
    'accepted',
    now()
  )
  returning id into request_id;

  return link_row.from_user_id;
end;
$$;

-- Profiles: own row fully readable; friends can read each other's cards.
create policy "users read own profile"
on public.profiles for select to authenticated
using (user_id = auth.uid() or public.are_friends(user_id, auth.uid()));

create policy "users read own friendships"
on public.friendships for select to authenticated
using (user_a = auth.uid() or user_b = auth.uid());

create policy "users read relevant friend requests"
on public.friend_requests for select to authenticated
using (
  from_user_id = auth.uid()
  or to_user_id = auth.uid()
  or lower(to_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

grant select on public.profiles to authenticated;
grant select on public.friendships to authenticated;
grant select on public.friend_requests to authenticated;

revoke all on function public.social_display_name() from public;
revoke all on function public.are_friends(uuid, uuid) from public;
revoke all on function public.ensure_profile(text, text) from public;
revoke all on function public.send_friend_request(text) from public;
revoke all on function public.respond_friend_request(uuid, boolean) from public;
revoke all on function public.cancel_friend_request(uuid) from public;
revoke all on function public.remove_friend(uuid) from public;
revoke all on function public.list_friends() from public;
revoke all on function public.list_friend_requests() from public;
revoke all on function public.create_friend_invite_link() from public;
revoke all on function public.resolve_friend_invite_link(text) from public;
revoke all on function public.accept_friend_invite_link(text) from public;

grant execute on function public.ensure_profile(text, text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.list_friend_requests() to authenticated;
grant execute on function public.create_friend_invite_link() to authenticated;
grant execute on function public.resolve_friend_invite_link(text) to authenticated;
grant execute on function public.accept_friend_invite_link(text) to authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

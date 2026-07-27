create extension if not exists pg_net with schema extensions;

create table if not exists public.travel_chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  sender_device_id uuid not null,
  sender_name text not null check (length(sender_name) between 1 and 120),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists travel_chat_messages_trip_created_idx
  on public.travel_chat_messages (trip_id, created_at desc);

create table if not exists public.travel_chat_devices (
  device_id uuid not null,
  trip_id text not null,
  expo_push_token text not null,
  access_code text not null references public.travel_invites(code) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (device_id, trip_id),
  unique (trip_id, expo_push_token)
);

alter table public.travel_chat_messages enable row level security;
alter table public.travel_chat_devices enable row level security;
revoke all on public.travel_chat_messages from anon, authenticated;
revoke all on public.travel_chat_devices from anon, authenticated;

create or replace function public.travel_chat_trip_id(chat_access_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select trip_id
  from public.travel_invites
  where code = chat_access_code
    and accepted_at is not null
    and revoked_at is null
    and expires_at > now()
  limit 1;
$$;

create or replace function public.travel_chat_messages(chat_access_code text)
returns table (
  id uuid,
  sender_name text,
  sender_device_id uuid,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select recent.id, recent.sender_name, recent.sender_device_id, recent.body, recent.created_at
  from (
    select message.id, message.sender_name, message.sender_device_id, message.body, message.created_at
    from public.travel_chat_messages as message
    where message.trip_id = public.travel_chat_trip_id(chat_access_code)
    order by message.created_at desc
    limit 500
  ) as recent
  order by recent.created_at asc;
$$;

create or replace function public.send_travel_chat_message(
  chat_access_code text,
  chat_sender_device_id uuid,
  chat_sender_name text,
  chat_body text
)
returns public.travel_chat_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  chat_trip_id text;
  inserted public.travel_chat_messages;
begin
  chat_trip_id := public.travel_chat_trip_id(chat_access_code);
  if chat_trip_id is null
    or length(btrim(chat_sender_name)) not between 1 and 120
    or length(btrim(chat_body)) not between 1 and 2000 then
    raise exception 'This trip chat is unavailable.';
  end if;
  if exists (
    select 1
    from public.travel_chat_messages
    where trip_id = chat_trip_id
      and sender_device_id = chat_sender_device_id
      and created_at > now() - interval '1 second'
  ) then
    raise exception 'Please wait a moment before sending another message.';
  end if;

  insert into public.travel_chat_messages (
    trip_id,
    sender_device_id,
    sender_name,
    body
  )
  values (
    chat_trip_id,
    chat_sender_device_id,
    btrim(chat_sender_name),
    btrim(chat_body)
  )
  returning * into inserted;
  return inserted;
end;
$$;

create or replace function public.register_travel_chat_device(
  chat_access_code text,
  chat_device_id uuid,
  chat_expo_push_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  chat_trip_id text;
begin
  chat_trip_id := public.travel_chat_trip_id(chat_access_code);
  if chat_trip_id is null
    or chat_expo_push_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'This device could not join trip notifications.';
  end if;

  delete from public.travel_chat_devices
  where trip_id = chat_trip_id
    and (
      device_id = chat_device_id
      or expo_push_token = chat_expo_push_token
    );

  insert into public.travel_chat_devices (
    device_id,
    trip_id,
    expo_push_token,
    access_code,
    updated_at
  )
  values (
    chat_device_id,
    chat_trip_id,
    chat_expo_push_token,
    chat_access_code,
    now()
  );
end;
$$;

create or replace function public.notify_travel_chat_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notifications jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'to', device.expo_push_token,
      'title', new.sender_name,
      'body', case
        when length(new.body) > 140 then left(new.body, 137) || '...'
        else new.body
      end,
      'sound', 'default',
      'channelId', 'event-chat',
      'data', jsonb_build_object(
        'url', '/travel-chat',
        'chatCode', device.access_code
      )
    )
  )
  into notifications
  from public.travel_chat_devices as device
  join public.travel_invites as invite on invite.code = device.access_code
  where device.trip_id = new.trip_id
    and device.device_id <> new.sender_device_id
    and invite.revoked_at is null
    and invite.expires_at > now();

  if notifications is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
      body := notifications
    );
  end if;
  return new;
end;
$$;

drop trigger if exists travel_chat_message_push on public.travel_chat_messages;
create trigger travel_chat_message_push
after insert on public.travel_chat_messages
for each row execute function public.notify_travel_chat_members();

revoke all on function public.travel_chat_trip_id(text) from public;
revoke all on function public.travel_chat_messages(text) from public;
revoke all on function public.send_travel_chat_message(text, uuid, text, text) from public;
revoke all on function public.register_travel_chat_device(text, uuid, text) from public;
grant execute on function public.travel_chat_messages(text) to anon, authenticated;
grant execute on function public.send_travel_chat_message(text, uuid, text, text) to anon, authenticated;
grant execute on function public.register_travel_chat_device(text, uuid, text) to anon, authenticated;

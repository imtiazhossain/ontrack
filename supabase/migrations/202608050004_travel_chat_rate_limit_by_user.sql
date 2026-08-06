-- Rate-limit trip chat by authenticated user, not a client-chosen device UUID.
-- Rotating chat_sender_device_id must not bypass the one-message-per-second cap.

alter table public.travel_chat_messages
  add column if not exists sender_user_id uuid;

create index if not exists travel_chat_messages_trip_sender_user_created_idx
  on public.travel_chat_messages (trip_id, sender_user_id, created_at desc);

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
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in to send trip chat messages.';
  end if;
  chat_trip_id := public.travel_chat_trip_id(chat_access_code);
  if chat_trip_id is null
    or length(btrim(chat_sender_name)) not between 1 and 120
    or length(btrim(chat_body)) not between 1 and 2000 then
    raise exception 'This trip chat is unavailable.';
  end if;

  -- Serialize + bound floods by the authenticated principal for this trip.
  perform pg_advisory_xact_lock(
    87201434,
    hashtext(chat_trip_id || ':' || actor::text)
  );

  if exists (
    select 1
    from public.travel_chat_messages as message
    where message.trip_id = chat_trip_id
      and message.sender_user_id = actor
      and message.created_at > now() - interval '1 second'
  ) then
    raise exception 'Please wait a moment before sending another message.';
  end if;

  insert into public.travel_chat_messages (
    trip_id,
    sender_device_id,
    sender_user_id,
    sender_name,
    body
  )
  values (
    chat_trip_id,
    chat_sender_device_id,
    actor,
    btrim(chat_sender_name),
    btrim(chat_body)
  )
  returning * into inserted;
  return inserted;
end;
$$;

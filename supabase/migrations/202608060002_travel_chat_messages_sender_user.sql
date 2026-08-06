-- Expose sender_user_id on trip chat loads so clients can treat messages as
-- "mine" across devices for the same signed-in account (not only same device).

drop function if exists public.travel_chat_messages(text);

create function public.travel_chat_messages(chat_access_code text)
returns table (
  id uuid,
  sender_name text,
  sender_device_id uuid,
  sender_user_id uuid,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    recent.id,
    recent.sender_name,
    recent.sender_device_id,
    recent.sender_user_id,
    recent.body,
    recent.created_at
  from (
    select
      message.id,
      message.sender_name,
      message.sender_device_id,
      message.sender_user_id,
      message.body,
      message.created_at
    from public.travel_chat_messages as message
    where message.trip_id = public.travel_chat_trip_id(chat_access_code)
    order by message.created_at desc
    limit 500
  ) as recent
  order by recent.created_at asc;
$$;

revoke all on function public.travel_chat_messages(text) from public, anon;
grant execute on function public.travel_chat_messages(text) to authenticated;

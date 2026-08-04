-- Notify both participants to refresh their locally cached friend lists.

create or replace function public.broadcast_friendship_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  friendship public.friendships;
begin
  friendship := coalesce(new, old);
  perform realtime.send(
    jsonb_build_object('friendship_id', friendship.user_a::text || ':' || friendship.user_b::text),
    'changed',
    'friend:user:' || friendship.user_a::text,
    true
  );
  perform realtime.send(
    jsonb_build_object('friendship_id', friendship.user_a::text || ':' || friendship.user_b::text),
    'changed',
    'friend:user:' || friendship.user_b::text,
    true
  );
  return coalesce(new, old);
exception
  when others then
    return coalesce(new, old);
end;
$$;

create trigger friendships_broadcast_change
after insert or delete on public.friendships
for each row execute function public.broadcast_friendship_change();

create policy "users receive own friend updates"
on realtime.messages for select to authenticated
using (
  split_part(realtime.topic(), ':', 1) = 'friend'
  and split_part(realtime.topic(), ':', 2) = 'user'
  and split_part(realtime.topic(), ':', 3)::uuid = auth.uid()
);

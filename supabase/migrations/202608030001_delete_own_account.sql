-- App Store 5.1.1(v): signed-in users must be able to delete their account and data.
-- Cascading FKs remove most relational rows when auth.users is deleted; storage objects
-- do not cascade and are removed explicitly here.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Private media paths are prefixed with the user id.
  delete from storage.objects
  where bucket_id in ('app-media', 'profile-avatars', 'meal-photos')
    and name like uid::text || '/%';

  -- Recipe images are list-scoped; remove anything this user uploaded.
  delete from storage.objects
  where bucket_id = 'todo-recipe-images'
    and owner = uid;

  -- Catch any remaining objects owned by this auth user across buckets.
  delete from storage.objects
  where owner = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Deletes the calling user, their storage objects, and cascaded app data. Used for in-app account deletion.';

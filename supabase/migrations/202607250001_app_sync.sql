create table if not exists public.app_state (
  user_id uuid references auth.users on delete cascade not null,
  domain text not null check (domain in ('addons', 'preferences', 'schedule', 'plants', 'travel')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, domain)
);

alter table public.app_state enable row level security;

create policy "users read their app state"
on public.app_state for select
using (user_id = auth.uid());

create policy "users create their app state"
on public.app_state for insert
with check (user_id = auth.uid());

create policy "users update their app state"
on public.app_state for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users delete their app state"
on public.app_state for delete
using (user_id = auth.uid());

create or replace function public.set_app_state_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at
before update on public.app_state
for each row execute function public.set_app_state_updated_at();

create table if not exists public.addon_entitlements (
  user_id uuid references auth.users on delete cascade not null,
  addon_id text not null check (addon_id in ('food', 'fitness', 'plants', 'travel')),
  source text not null check (source in ('included', 'testing', 'purchase', 'bundle', 'admin')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, addon_id)
);

alter table public.addon_entitlements enable row level security;

create policy "users read their addon entitlements"
on public.addon_entitlements for select
using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('app-media', 'app-media', false)
on conflict (id) do update set public = false;

create policy "users read their app media"
on storage.objects for select
using (
  bucket_id = 'app-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users create their app media"
on storage.objects for insert
with check (
  bucket_id = 'app-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users update their app media"
on storage.objects for update
using (
  bucket_id = 'app-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'app-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete their app media"
on storage.objects for delete
using (
  bucket_id = 'app-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

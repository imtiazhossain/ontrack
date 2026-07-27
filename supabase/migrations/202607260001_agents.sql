alter table public.app_state
drop constraint if exists app_state_domain_check;

alter table public.app_state
add constraint app_state_domain_check
check (domain in ('addons', 'agents', 'preferences', 'schedule', 'plants', 'travel'));

create table if not exists public.agent_entitlements (
  user_id uuid references auth.users on delete cascade not null,
  agent_id text not null,
  source text not null check (source in ('included', 'testing', 'purchase', 'bundle', 'admin')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, agent_id)
);

alter table public.agent_entitlements enable row level security;

create policy "users read their agent entitlements"
on public.agent_entitlements for select
using (user_id = auth.uid());

comment on table public.agent_entitlements is
'Server-owned access for separately sellable first-party agent manifests.';

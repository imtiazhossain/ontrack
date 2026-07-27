alter table public.travel_invites
  add column if not exists revoked_at timestamptz;

create or replace function public.resolve_travel_invite(invite_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select payload
  from public.travel_invites
  where code = invite_code
    and expires_at > now()
    and revoked_at is null
  limit 1;
$$;

create or replace function public.accept_travel_invite(invite_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.travel_invites
  set accepted_at = coalesce(accepted_at, now())
  where code = invite_code
    and expires_at > now()
    and revoked_at is null;
$$;

create or replace function public.travel_invite_statuses(invite_codes text[])
returns table(code text, accepted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select travel_invites.code, travel_invites.accepted_at
  from public.travel_invites
  where travel_invites.code = any(invite_codes)
    and travel_invites.expires_at > now()
    and travel_invites.revoked_at is null
    and travel_invites.accepted_at is not null;
$$;

create or replace function public.revoke_travel_invite(invite_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.travel_invites
  set revoked_at = coalesce(revoked_at, now())
  where code = invite_code;
$$;

revoke all on function public.revoke_travel_invite(text) from public;
grant execute on function public.revoke_travel_invite(text) to anon, authenticated;

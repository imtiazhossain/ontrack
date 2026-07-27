alter table public.travel_invites
  add column if not exists inviter_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists accepted_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists travel_invites_inviter_user_idx
  on public.travel_invites (inviter_user_id);

-- Invitation payloads contain the trip itself. They must never be readable
-- directly; all access goes through the recipient-aware functions below.
drop policy if exists "anyone reads active travel invites" on public.travel_invites;
revoke select on public.travel_invites from anon, authenticated;
revoke select (code, payload, expires_at) on public.travel_invites
  from anon, authenticated;

revoke all on function public.create_travel_invite(jsonb) from public;
drop function if exists public.create_travel_invite(jsonb);
revoke all on function public.create_travel_invite(jsonb, text, text, text) from public;
drop function if exists public.create_travel_invite(jsonb, text, text, text);

create or replace function public.create_travel_invite(
  invite_payload jsonb,
  invite_trip_id text,
  invitee_name text,
  invitee_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
  normalized_name text := btrim(invitee_name);
  normalized_email text := lower(btrim(invitee_email));
  inviter_id uuid := auth.uid();
begin
  if inviter_id is null
    or jsonb_typeof(invite_payload) <> 'object'
    or jsonb_typeof(invite_payload -> 'invite') <> 'string'
    or octet_length(invite_payload::text) > 50000
    or length(btrim(invite_trip_id)) not between 1 and 200
    or length(normalized_name) not between 1 and 120
    or length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A signed-in account and a valid invitee email are required.';
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(10), 'hex');
    begin
      insert into public.travel_invites (
        code,
        payload,
        trip_id,
        invitee_name,
        invitee_email,
        inviter_user_id
      )
      values (
        generated_code,
        invite_payload,
        btrim(invite_trip_id),
        normalized_name,
        normalized_email,
        inviter_id
      );
      return generated_code;
    exception when unique_violation then
      -- Generate another unguessable code in the extraordinarily unlikely collision case.
    end;
  end loop;
end;
$$;

create or replace function public.resolve_travel_invite(invite_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select invite.payload
  from public.travel_invites as invite
  where invite.code = invite_code
    and invite.expires_at > now()
    and invite.revoked_at is null
    and auth.uid() is not null
    and invite.invitee_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

create or replace function public.accept_travel_invite(invite_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.travel_invites as invite
  set
    accepted_at = coalesce(invite.accepted_at, now()),
    accepted_by_user_id = coalesce(invite.accepted_by_user_id, auth.uid())
  where invite.code = invite_code
    and invite.expires_at > now()
    and invite.revoked_at is null
    and auth.uid() is not null
    and invite.invitee_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (
      invite.accepted_by_user_id is null
      or invite.accepted_by_user_id = auth.uid()
    );
$$;

create or replace function public.travel_invite_statuses(invite_codes text[])
returns table(code text, accepted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select invite.code, invite.accepted_at
  from public.travel_invites as invite
  where invite.code = any(invite_codes)
    and invite.inviter_user_id = auth.uid()
    and invite.expires_at > now()
    and invite.revoked_at is null
    and invite.accepted_at is not null;
$$;

create or replace function public.revoke_travel_invite(invite_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.travel_invites as invite
  set revoked_at = coalesce(invite.revoked_at, now())
  where invite.code = invite_code
    and invite.inviter_user_id = auth.uid();
$$;

create or replace function public.travel_chat_trip_id(chat_access_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select invite.trip_id
  from public.travel_invites as invite
  where invite.code = chat_access_code
    and invite.accepted_at is not null
    and invite.revoked_at is null
    and invite.expires_at > now()
    and auth.uid() is not null
    and (
      invite.inviter_user_id = auth.uid()
      or invite.accepted_by_user_id = auth.uid()
    )
  limit 1;
$$;

revoke all on function public.create_travel_invite(jsonb, text, text, text) from public;
revoke all on function public.resolve_travel_invite(text) from public;
revoke all on function public.accept_travel_invite(text) from public;
revoke all on function public.travel_invite_statuses(text[]) from public;
revoke all on function public.revoke_travel_invite(text) from public;
revoke all on function public.travel_chat_trip_id(text) from public;

grant execute on function public.create_travel_invite(jsonb, text, text, text)
  to authenticated;
grant execute on function public.resolve_travel_invite(text)
  to authenticated;
grant execute on function public.accept_travel_invite(text)
  to authenticated;
grant execute on function public.travel_invite_statuses(text[])
  to authenticated;
grant execute on function public.revoke_travel_invite(text)
  to authenticated;

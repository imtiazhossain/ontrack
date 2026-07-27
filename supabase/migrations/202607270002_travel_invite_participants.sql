alter table public.travel_invites
  add column if not exists trip_id text,
  add column if not exists invitee_name text,
  add column if not exists invitee_email text,
  add column if not exists accepted_at timestamptz;

create or replace function public.create_travel_invite(
  invite_payload jsonb,
  invite_trip_id text,
  invitee_name text,
  invitee_email text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
  normalized_name text := btrim(invitee_name);
  normalized_email text := nullif(lower(btrim(invitee_email)), '');
begin
  if jsonb_typeof(invite_payload) <> 'object'
    or jsonb_typeof(invite_payload -> 'invite') <> 'string'
    or octet_length(invite_payload::text) > 50000
    or length(btrim(invite_trip_id)) not between 1 and 200
    or length(normalized_name) not between 1 and 120
    or (normalized_email is not null and length(normalized_email) > 320) then
    raise exception 'Invalid travel invitation';
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(10), 'hex');
    begin
      insert into public.travel_invites (
        code,
        payload,
        trip_id,
        invitee_name,
        invitee_email
      )
      values (
        generated_code,
        invite_payload,
        btrim(invite_trip_id),
        normalized_name,
        normalized_email
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
  select payload
  from public.travel_invites
  where code = invite_code
    and expires_at > now()
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
    and expires_at > now();
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
    and travel_invites.accepted_at is not null;
$$;

revoke all on function public.create_travel_invite(jsonb, text, text, text) from public;
revoke all on function public.resolve_travel_invite(text) from public;
revoke all on function public.accept_travel_invite(text) from public;
revoke all on function public.travel_invite_statuses(text[]) from public;

grant execute on function public.create_travel_invite(jsonb, text, text, text)
  to anon, authenticated;
grant execute on function public.resolve_travel_invite(text)
  to anon, authenticated;
grant execute on function public.accept_travel_invite(text)
  to anon, authenticated;
grant execute on function public.travel_invite_statuses(text[])
  to anon, authenticated;

-- Older clients still resolve links with a column-level select. Keep that path
-- working without exposing recipient names, emails, or acceptance timestamps.
revoke select on public.travel_invites from anon, authenticated;
grant select (code, payload, expires_at) on public.travel_invites to anon, authenticated;

create table if not exists public.travel_invites (
  code text primary key check (code ~ '^[a-f0-9]{20}$'),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

alter table public.travel_invites enable row level security;

drop policy if exists "anyone reads active travel invites" on public.travel_invites;
create policy "anyone reads active travel invites"
on public.travel_invites for select
to anon, authenticated
using (expires_at > now());

create or replace function public.create_travel_invite(invite_payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  if jsonb_typeof(invite_payload) <> 'object'
    or jsonb_typeof(invite_payload -> 'invite') <> 'string'
    or octet_length(invite_payload::text) > 50000 then
    raise exception 'Invalid travel invitation';
  end if;

  loop
    generated_code := encode(extensions.gen_random_bytes(10), 'hex');
    begin
      insert into public.travel_invites (code, payload)
      values (generated_code, invite_payload);
      return generated_code;
    exception when unique_violation then
      -- Extremely unlikely, but generate another code instead of failing.
    end;
  end loop;
end;
$$;

revoke all on function public.create_travel_invite(jsonb) from public;
grant execute on function public.create_travel_invite(jsonb) to anon, authenticated;
grant select on public.travel_invites to anon, authenticated;

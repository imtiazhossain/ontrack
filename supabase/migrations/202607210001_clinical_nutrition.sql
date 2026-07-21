create extension if not exists pgcrypto;

create type public.app_role as enum ('guardian', 'clinician', 'admin');
create type public.target_status as enum ('draft', 'approved', 'superseded');

create table public.user_roles (
  user_id uuid references auth.users on delete cascade not null,
  role public.app_role not null,
  primary key (user_id, role)
);

create table public.clinician_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  license_region text not null,
  license_identifier text not null,
  verified_at timestamptz,
  verified_by uuid references auth.users
);

create table public.nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  display_name text not null,
  date_of_birth date not null,
  equation_sex text not null check (equation_sex in ('female', 'male')),
  height_cm numeric,
  weight_kg numeric,
  activity_level text not null,
  goal text not null,
  dietary_preferences text[] not null default '{}',
  allergies text[] not null default '{}',
  guardian_acknowledged_at timestamptz,
  gestational_age_weeks numeric,
  feeding_pattern text,
  clinician_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guardian_relationships (
  profile_id uuid references public.nutrition_profiles on delete cascade,
  guardian_id uuid references auth.users on delete cascade,
  consented_at timestamptz not null,
  primary key (profile_id, guardian_id)
);

create table public.care_team_memberships (
  profile_id uuid references public.nutrition_profiles on delete cascade,
  clinician_id uuid references auth.users on delete cascade,
  granted_by uuid references auth.users not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (profile_id, clinician_id)
);

create table public.nutrition_target_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.nutrition_profiles on delete cascade not null,
  version integer not null check (version > 0),
  status public.target_status not null default 'draft',
  calculated_targets jsonb not null,
  targets jsonb not null,
  author_id uuid references auth.users not null,
  author_role public.app_role not null,
  effective_at timestamptz not null,
  approved_by uuid references auth.users,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, version)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.nutrition_profiles on delete cascade not null,
  activity_id text,
  name text not null,
  meal_type text not null,
  eaten_at timestamptz not null,
  source_kind text not null,
  source_url text,
  photo_path text,
  original_analysis jsonb,
  created_by uuid references auth.users not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references public.meals on delete cascade not null,
  name text not null,
  portion text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  saturated_fat_g numeric,
  sodium_mg numeric,
  confidence numeric check (confidence between 0 and 1),
  sort_order integer not null
);

create table public.nutrition_sources (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references public.meals on delete cascade not null,
  kind text not null,
  title text not null,
  url text,
  accessed_at timestamptz
);

create table public.nutrient_values (
  id uuid primary key default gen_random_uuid(),
  meal_item_id uuid references public.meal_items on delete cascade not null,
  nutrient_key text not null,
  nutrient_name text not null,
  amount numeric,
  unit text not null,
  estimated boolean not null,
  confidence numeric check (confidence between 0 and 1),
  source_id uuid references public.nutrition_sources on delete set null
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.nutrition_profiles on delete cascade not null,
  meal_id uuid references public.meals on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  clinician_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.nutrition_profiles on delete cascade not null,
  guardian_id uuid references auth.users not null,
  consent_type text not null,
  policy_version text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users,
  profile_id uuid references public.nutrition_profiles on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from user_roles where user_id = auth.uid() and role = 'admin') $$;

create or replace function public.is_verified_clinician()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from clinician_profiles where user_id = auth.uid() and verified_at is not null) $$;

create or replace function public.can_access_profile(requested_profile uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from nutrition_profiles where id = requested_profile and owner_id = auth.uid())
    or exists(select 1 from guardian_relationships where profile_id = requested_profile and guardian_id = auth.uid())
    or exists(select 1 from care_team_memberships where profile_id = requested_profile and clinician_id = auth.uid() and revoked_at is null)
    or public.is_admin();
$$;

create or replace function public.owns_profile(requested_profile uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from nutrition_profiles where id = requested_profile and owner_id = auth.uid())
    or public.is_admin();
$$;

alter table public.user_roles enable row level security;
alter table public.clinician_profiles enable row level security;
alter table public.nutrition_profiles enable row level security;
alter table public.guardian_relationships enable row level security;
alter table public.care_team_memberships enable row level security;
alter table public.nutrition_target_versions enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.nutrition_sources enable row level security;
alter table public.nutrient_values enable row level security;
alter table public.recommendations enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_events enable row level security;

create policy "profile access" on public.nutrition_profiles for select using (public.can_access_profile(id));
create policy "owners create profiles" on public.nutrition_profiles for insert with check (owner_id = auth.uid());
create policy "owners update profiles" on public.nutrition_profiles for update using (owner_id = auth.uid());
create policy "roles visible to owner and admins" on public.user_roles for select using (user_id = auth.uid() or public.is_admin());
create policy "admins manage roles" on public.user_roles for all using (public.is_admin()) with check (public.is_admin());
create policy "clinician profile visible to owner and admins" on public.clinician_profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "admins manage clinician verification" on public.clinician_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "relationship access" on public.guardian_relationships for select using (public.can_access_profile(profile_id));
create policy "owner relationships" on public.guardian_relationships for all using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "care team access" on public.care_team_memberships for select using (public.can_access_profile(profile_id));
create policy "owner care team" on public.care_team_memberships for all using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id) and granted_by = auth.uid());
create policy "target access" on public.nutrition_target_versions for select using (public.can_access_profile(profile_id));
create policy "target creation" on public.nutrition_target_versions for insert with check (public.can_access_profile(profile_id) and author_id = auth.uid());
create policy "clinician target approval" on public.nutrition_target_versions for update
  using (public.is_verified_clinician() and exists(select 1 from care_team_memberships where profile_id = nutrition_target_versions.profile_id and clinician_id = auth.uid() and revoked_at is null));
create policy "meal access" on public.meals for all using (public.can_access_profile(profile_id)) with check (public.can_access_profile(profile_id));
create policy "meal item access" on public.meal_items for all using (exists(select 1 from meals where id = meal_id and public.can_access_profile(profile_id)));
create policy "source access" on public.nutrition_sources for all using (exists(select 1 from meals where id = meal_id and public.can_access_profile(profile_id)));
create policy "nutrient access" on public.nutrient_values for all using (exists(select 1 from meal_items join meals on meals.id = meal_items.meal_id where meal_items.id = meal_item_id and public.can_access_profile(meals.profile_id)));
create policy "recommendation access" on public.recommendations for select using (public.can_access_profile(profile_id));
create policy "consent access" on public.consent_records for select using (public.can_access_profile(profile_id));
create policy "guardians create consent" on public.consent_records for insert with check (guardian_id = auth.uid() and public.can_access_profile(profile_id));
create policy "guardians update consent" on public.consent_records for update using (guardian_id = auth.uid() or public.is_admin()) with check (guardian_id = auth.uid() or public.is_admin());
create policy "audit access" on public.audit_events for select using (public.can_access_profile(profile_id) or public.is_admin());

create or replace function public.stamp_target_approval()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if not public.is_verified_clinician() or not exists(
      select 1 from care_team_memberships
      where profile_id = new.profile_id and clinician_id = auth.uid() and revoked_at is null
    ) then
      raise exception 'verified assigned clinician required';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  return new;
end;
$$;
create trigger nutrition_target_approval_stamp before update on public.nutrition_target_versions
for each row execute function public.stamp_target_approval();

create or replace function public.record_clinical_audit()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  record_id text;
  affected_profile uuid;
begin
  record_id := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'));
  if tg_table_name = 'nutrition_profiles' then
    affected_profile := case when tg_op = 'DELETE' then null else (to_jsonb(new)->>'id')::uuid end;
  else
    affected_profile := coalesce((to_jsonb(new)->>'profile_id')::uuid, (to_jsonb(old)->>'profile_id')::uuid);
  end if;
  insert into audit_events(actor_id, profile_id, action, entity_type, entity_id)
  values (auth.uid(), affected_profile, lower(tg_op), tg_table_name, record_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create trigger audit_nutrition_profiles after insert or update or delete on public.nutrition_profiles
for each row execute function public.record_clinical_audit();
create trigger audit_nutrition_targets after insert or update or delete on public.nutrition_target_versions
for each row execute function public.record_clinical_audit();
create trigger audit_meals after insert or update or delete on public.meals
for each row execute function public.record_clinical_audit();
create trigger audit_consent after insert or update or delete on public.consent_records
for each row execute function public.record_clinical_audit();

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$ begin raise exception 'audit events are immutable'; end $$;
create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function public.prevent_audit_mutation();

insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', false)
on conflict (id) do update set public = false;
create policy "private meal photo read" on storage.objects for select
using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "private meal photo write" on storage.objects for insert
with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "private meal photo delete" on storage.objects for delete
using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

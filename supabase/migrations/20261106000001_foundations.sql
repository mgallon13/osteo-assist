-- =============================================================================
-- 0001 — Fondations : extensions, organisations, membres, praticiens
-- =============================================================================
-- Principe de portabilité : tout le schéma est du PostgreSQL standard.
-- La SEULE dépendance à Supabase est la fonction app.current_user_id(), qui
-- encapsule auth.uid(). Lors de la migration vers un hébergeur HDS, on
-- remplace uniquement cette fonction (et la table auth.users référencée par
-- app.users_view) sans toucher au reste du schéma.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create schema if not exists app;

-- -----------------------------------------------------------------------------
-- Identité de l'utilisateur courant (point unique de dépendance à Supabase Auth)
-- -----------------------------------------------------------------------------
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- Normalisation pour la recherche (insensible aux accents et à la casse).
-- unaccent() n'est pas IMMUTABLE ; ce wrapper l'est, pour pouvoir l'indexer.
-- -----------------------------------------------------------------------------
create or replace function app.search_normalize(input text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select lower(public.unaccent('public.unaccent'::regdictionary, input))
$$;

-- -----------------------------------------------------------------------------
-- Horodatage automatique
-- -----------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Organisations (cabinets)
-- Un ostéo seul = une organisation à un membre. Le multi-praticien est
-- supporté par le schéma mais l'interface reste mono-praticien pour le MVP.
-- -----------------------------------------------------------------------------
create table public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 200),
  legal_name      text,
  siret           text check (siret is null or siret ~ '^[0-9]{14}$'),
  address         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function app.set_updated_at();

create type public.member_role as enum ('owner', 'admin', 'practitioner', 'staff');

create table public.organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid not null,
  role             public.member_role not null default 'practitioner',
  created_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members(user_id);

-- -----------------------------------------------------------------------------
-- Praticiens : profil professionnel d'un membre
-- -----------------------------------------------------------------------------
create table public.practitioners (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid not null,
  first_name       text not null,
  last_name        text not null,
  adeli_number     text,
  doctolib_url     text check (doctolib_url is null or doctolib_url ~ '^https://'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

create trigger practitioners_updated_at
  before update on public.practitioners
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helpers d'autorisation (SECURITY DEFINER pour éviter la récursion RLS)
-- -----------------------------------------------------------------------------
create or replace function app.is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = app.current_user_id()
  )
$$;

create or replace function app.has_role(org uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = app.current_user_id()
      and m.role = any(roles)
  )
$$;

-- Accès clinique : owner, admin et practitioner. Le rôle staff (secrétariat)
-- n'a PAS accès aux données cliniques (consultations, antécédents, notes).
create or replace function app.can_access_clinical(org uuid)
returns boolean
language sql
stable
as $$
  select app.has_role(org, array['owner','admin','practitioner']::public.member_role[])
$$;

create or replace function app.current_practitioner_id(org uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.practitioners p
  where p.organization_id = org
    and p.user_id = app.current_user_id()
  limit 1
$$;

-- -----------------------------------------------------------------------------
-- Création atomique d'un cabinet + premier membre owner + profil praticien.
-- Appelée par l'interface à l'inscription (onboarding).
-- -----------------------------------------------------------------------------
create or replace function public.create_organization_with_owner(
  org_name text,
  practitioner_first_name text,
  practitioner_last_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := app.current_user_id();
  new_org uuid;
begin
  if uid is null then
    raise exception 'Non authentifié' using errcode = '28000';
  end if;

  insert into public.organizations (name) values (org_name)
  returning id into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, uid, 'owner');

  insert into public.practitioners (organization_id, user_id, first_name, last_name)
  values (new_org, uid, practitioner_first_name, practitioner_last_name);

  return new_org;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text, text) from public;
grant execute on function public.create_organization_with_owner(text, text, text) to authenticated;

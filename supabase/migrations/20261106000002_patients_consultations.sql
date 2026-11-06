-- =============================================================================
-- 0002 — Patients, consultations, traçabilité, journal d'audit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Patients
-- -----------------------------------------------------------------------------
create table public.patients (
  id                         uuid primary key default gen_random_uuid(),
  organization_id            uuid not null references public.organizations(id) on delete cascade,
  primary_practitioner_id    uuid references public.practitioners(id) on delete set null,
  first_name                 text not null check (char_length(first_name) between 1 and 100),
  last_name                  text not null check (char_length(last_name) between 1 and 100),
  birth_date                 date,
  email                      text,
  phone                      text,
  address                    text,
  profession                 text,
  referring_doctor           text,
  admin_notes                text,      -- notes administratives (visibles du secrétariat)
  communication_preferences  jsonb not null default '{"email": true}'::jsonb,
  is_synthetic               boolean not null default false,  -- données fictives de démo/test
  archived_at                timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index patients_org_idx on public.patients(organization_id) where archived_at is null;
create index patients_name_trgm_idx on public.patients
  using gin (app.search_normalize(last_name || ' ' || first_name) gin_trgm_ops);

create trigger patients_updated_at
  before update on public.patients
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Données cliniques du patient, séparées des données administratives pour que
-- le rôle 'staff' (secrétariat) puisse gérer les coordonnées sans voir le médical.
-- -----------------------------------------------------------------------------
create table public.patient_clinical_profiles (
  patient_id            uuid primary key references public.patients(id) on delete cascade,
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  medical_history       text,   -- antécédents
  recurring_complaints  text,   -- motifs récurrents
  clinical_notes        text,
  updated_at            timestamptz not null default now()
);

create trigger patient_clinical_profiles_updated_at
  before update on public.patient_clinical_profiles
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Consultations
-- Un compte rendu passe de 'draft' à 'validated' uniquement par une action
-- explicite du praticien. L'IA ne peut jamais valider.
-- -----------------------------------------------------------------------------
create type public.consultation_status as enum ('draft', 'validated', 'cancelled');

create table public.consultations (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  patient_id               uuid not null references public.patients(id) on delete cascade,
  practitioner_id          uuid not null references public.practitioners(id) on delete restrict,
  consultation_date        timestamptz not null default now(),
  status                   public.consultation_status not null default 'draft',

  -- Compte rendu structuré
  reason                   text,   -- motif
  reported_symptoms        text,   -- déclarations du patient
  relevant_history         text,   -- antécédents pertinents
  practitioner_findings    text,   -- observations du praticien
  techniques_performed     text,   -- techniques réalisées
  progress_since_last      text,   -- évolution depuis la séance précédente
  advice_given             text,   -- conseils effectivement donnés
  additional_notes         text,
  suggested_follow_up_date date,

  -- Origine du contenu : saisi à la main ou brouillon généré par l'IA
  ai_drafted               boolean not null default false,

  validated_at             timestamptz,
  validated_by             uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint validated_fields_consistent check (
    (status = 'validated' and validated_at is not null and validated_by is not null)
    or (status <> 'validated')
  )
);

create index consultations_patient_idx on public.consultations(patient_id, consultation_date desc);
create index consultations_org_date_idx on public.consultations(organization_id, consultation_date desc);
create index consultations_practitioner_idx on public.consultations(practitioner_id);

create trigger consultations_updated_at
  before update on public.consultations
  for each row execute function app.set_updated_at();

-- Cohérence multi-tenant : patient et praticien doivent appartenir au même cabinet
create or replace function app.check_consultation_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.patients p
    where p.id = new.patient_id and p.organization_id = new.organization_id
  ) then
    raise exception 'Le patient n''appartient pas à ce cabinet';
  end if;
  if not exists (
    select 1 from public.practitioners pr
    where pr.id = new.practitioner_id and pr.organization_id = new.organization_id
  ) then
    raise exception 'Le praticien n''appartient pas à ce cabinet';
  end if;
  return new;
end;
$$;

create trigger consultations_tenant_check
  before insert or update of patient_id, practitioner_id, organization_id
  on public.consultations
  for each row execute function app.check_consultation_tenant();

-- -----------------------------------------------------------------------------
-- Traçabilité : chaque modification d'une consultation déjà validée
-- archive l'état précédent.
-- -----------------------------------------------------------------------------
create table public.consultation_revisions (
  id               uuid primary key default gen_random_uuid(),
  consultation_id  uuid not null references public.consultations(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  snapshot         jsonb not null,
  changed_by       uuid,
  changed_at       timestamptz not null default now()
);

create index consultation_revisions_consultation_idx
  on public.consultation_revisions(consultation_id, changed_at desc);

create or replace function app.archive_validated_consultation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'validated' then
    insert into public.consultation_revisions (consultation_id, organization_id, snapshot, changed_by)
    values (old.id, old.organization_id, to_jsonb(old), app.current_user_id());
  end if;
  return new;
end;
$$;

create trigger consultations_archive_revision
  before update on public.consultations
  for each row execute function app.archive_validated_consultation();

-- -----------------------------------------------------------------------------
-- Journal d'audit des accès et actions sensibles
-- Insertion uniquement via app.log_audit (pas de modification ni suppression).
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id               bigint generated always as identity primary key,
  organization_id  uuid references public.organizations(id) on delete set null,
  user_id          uuid,
  action           text not null,          -- ex : 'patient.view', 'consultation.validate'
  entity_type      text,
  entity_id        uuid,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index audit_logs_org_idx on public.audit_logs(organization_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.log_audit(
  org uuid,
  action_name text,
  entity_type_name text default null,
  entity uuid default null,
  meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.is_member(org) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  insert into public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (org, app.current_user_id(), action_name, entity_type_name, entity, meta);
end;
$$;

revoke all on function public.log_audit(uuid, text, text, uuid, jsonb) from public;
grant execute on function public.log_audit(uuid, text, text, uuid, jsonb) to authenticated;

-- La validation d'une consultation est définie dans 0005_rls.sql
-- (public.validate_consultation), avec le garde-fou associé.

-- Vue de synthèse pour la liste des patients
create view public.patient_summaries
with (security_invoker = true) as
select
  p.id,
  p.organization_id,
  p.first_name,
  p.last_name,
  p.birth_date,
  p.email,
  p.phone,
  p.is_synthetic,
  p.archived_at,
  p.created_at,
  count(c.id) filter (where c.status <> 'cancelled')::int as consultation_count,
  max(c.consultation_date) filter (where c.status <> 'cancelled') as last_consultation_at
from public.patients p
left join public.consultations c on c.patient_id = p.id
group by p.id;

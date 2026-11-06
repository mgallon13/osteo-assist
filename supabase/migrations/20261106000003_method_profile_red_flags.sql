-- =============================================================================
-- 0003 — Profil de méthode du praticien, checklist drapeaux rouges,
--        retours sur les brouillons IA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profil de méthode : réponses à l'interview d'onboarding (15-20 min).
-- Sert UNIQUEMENT à personnaliser la rédaction (structure, vocabulaire,
-- techniques habituellement nommées). Ne sert pas à recommander un traitement.
-- Les questions sont versionnées dans le code (src/features/method-profile).
-- -----------------------------------------------------------------------------
create table public.practitioner_method_profiles (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  practitioner_id        uuid not null references public.practitioners(id) on delete cascade,
  questionnaire_version  int not null,
  answers                jsonb not null default '{}'::jsonb,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (practitioner_id)
);

create trigger practitioner_method_profiles_updated_at
  before update on public.practitioner_method_profiles
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Retours sur les brouillons IA : brouillon proposé vs version validée.
-- Matière première de l'apprentissage continu du style du praticien.
-- -----------------------------------------------------------------------------
create table public.ai_draft_feedback (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  practitioner_id  uuid not null references public.practitioners(id) on delete cascade,
  consultation_id  uuid not null references public.consultations(id) on delete cascade,
  ai_draft         jsonb not null,
  final_version    jsonb,
  model            text,
  created_at       timestamptz not null default now()
);

create index ai_draft_feedback_practitioner_idx
  on public.ai_draft_feedback(practitioner_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Drapeaux rouges : CHECKLIST DE RÉFÉRENCE, identique pour tous les patients.
-- Le praticien coche lui-même. L'outil ne détecte rien et ne conclut rien.
-- organization_id null = élément global ; non null = élément ajouté par un cabinet.
-- -----------------------------------------------------------------------------
create table public.red_flag_items (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid references public.organizations(id) on delete cascade,
  category              text not null,          -- ex : 'Général', 'Rachis lombaire'
  label                 text not null,
  description           text,
  source                text,                   -- référence bibliographique
  clinically_reviewed   boolean not null default false,
  sort_order            int not null default 0,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create index red_flag_items_category_idx on public.red_flag_items(category, sort_order);

create type public.red_flag_check_status as enum ('not_assessed', 'absent', 'present');

create table public.consultation_red_flag_checks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  consultation_id  uuid not null references public.consultations(id) on delete cascade,
  item_id          uuid not null references public.red_flag_items(id) on delete restrict,
  status           public.red_flag_check_status not null default 'not_assessed',
  note             text,
  checked_by       uuid,
  checked_at       timestamptz not null default now(),
  unique (consultation_id, item_id)
);

create index consultation_red_flag_checks_consultation_idx
  on public.consultation_red_flag_checks(consultation_id);

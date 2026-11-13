-- =============================================================================
-- 0008 — Aide au praticien : référentiel de pratiques et historique des analyses
-- =============================================================================

create type public.reference_section as enum (
  'key_questions',      -- questions d'anamnèse discriminantes
  'red_flags',          -- signes d'alerte imposant une réorientation
  'tests',              -- tests à envisager
  'approach',           -- raisonnement et pistes de traitement
  'adaptations',        -- adaptations selon le profil
  'if_no_improvement',  -- si pas d'amélioration
  'advice'              -- conseils au patient
);

-- -----------------------------------------------------------------------------
-- Référentiel : une ligne = une section d'une fiche motif.
-- organization_id null = référentiel commun ; sinon fiche propre au cabinet.
-- -----------------------------------------------------------------------------
create table public.reference_cards (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  motif            text not null,
  keywords         text[] not null default '{}',
  section          public.reference_section not null,
  content          text not null,
  source_label     text not null,
  validated        boolean not null default false,
  sort_order       int not null default 0,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index reference_cards_motif_idx on public.reference_cards(motif, sort_order);
create index reference_cards_org_idx on public.reference_cards(organization_id);
create index reference_cards_keywords_idx on public.reference_cards using gin (keywords);

create trigger reference_cards_updated_at
  before update on public.reference_cards
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Analyses produites (traçabilité : ce qui a été proposé, sur quelles sources)
-- -----------------------------------------------------------------------------
create table public.practice_assist_runs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  consultation_id  uuid not null references public.consultations(id) on delete cascade,
  practitioner_id  uuid not null references public.practitioners(id) on delete cascade,
  motifs           text[] not null default '{}',
  content          jsonb not null,
  sources          jsonb not null default '[]'::jsonb,
  model            text not null,
  created_at       timestamptz not null default now()
);

create index practice_assist_runs_consultation_idx
  on public.practice_assist_runs(consultation_id, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.reference_cards       enable row level security;
alter table public.practice_assist_runs  enable row level security;

-- Référentiel commun lisible par tous les praticiens ; fiches de cabinet par ses membres cliniques
create policy reference_cards_select on public.reference_cards for select to authenticated
  using (
    (organization_id is null and exists (
      select 1 from public.organization_members m
      where m.user_id = app.current_user_id() and m.role <> 'staff'))
    or (organization_id is not null and app.can_access_clinical(organization_id))
  );
create policy reference_cards_write on public.reference_cards for all to authenticated
  using (organization_id is not null and app.can_access_clinical(organization_id))
  with check (organization_id is not null and app.can_access_clinical(organization_id));

create policy assist_runs_select on public.practice_assist_runs for select to authenticated
  using (app.can_access_clinical(organization_id));
create policy assist_runs_insert on public.practice_assist_runs for insert to authenticated
  with check (
    app.is_consultation_author(consultation_id)
    and practitioner_id = app.current_practitioner_id(organization_id)
    and exists (select 1 from public.consultations c
                where c.id = consultation_id and c.organization_id = organization_id)
  );

grant select, insert, update, delete on public.reference_cards, public.practice_assist_runs to authenticated;

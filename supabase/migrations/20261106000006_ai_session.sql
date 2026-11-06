-- =============================================================================
-- 0006 — Séance assistée : enregistrement, transcription, synthèse patient,
--        suivi de l'usage IA
-- =============================================================================

-- Notes rapides prises pendant la séance (complètent la transcription)
alter table public.consultations add column quick_notes text;

-- -----------------------------------------------------------------------------
-- Enregistrements audio
-- Le consentement du patient est OBLIGATOIRE et tracé (qui, quand).
-- Par défaut l'audio est supprimé dès la transcription réussie (minimisation).
-- -----------------------------------------------------------------------------
create type public.recording_status as enum (
  'uploaded', 'transcribing', 'transcribed', 'failed', 'deleted'
);

create table public.consultation_recordings (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  consultation_id       uuid not null references public.consultations(id) on delete cascade,
  storage_path          text not null unique,
  mime_type             text not null,
  duration_seconds      int check (duration_seconds is null or duration_seconds >= 0),
  size_bytes            bigint,
  status                public.recording_status not null default 'uploaded',
  error_message         text,
  consent_confirmed_at  timestamptz not null,
  consent_confirmed_by  uuid not null,
  audio_deleted_at      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint recording_path_scoped check (
    storage_path like organization_id::text || '/' || consultation_id::text || '/%'
  )
);

create index consultation_recordings_consultation_idx
  on public.consultation_recordings(consultation_id, created_at desc);

create trigger consultation_recordings_updated_at
  before update on public.consultation_recordings
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Transcriptions
-- raw_text = sortie du modèle ; corrected_text = version relue par le praticien.
-- -----------------------------------------------------------------------------
create table public.consultation_transcripts (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  consultation_id   uuid not null references public.consultations(id) on delete cascade,
  recording_id      uuid references public.consultation_recordings(id) on delete set null,
  raw_text          text not null,
  corrected_text    text,
  segments          jsonb not null default '[]'::jsonb,
  language          text,
  duration_seconds  numeric,
  model             text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index consultation_transcripts_consultation_idx
  on public.consultation_transcripts(consultation_id, created_at desc);

create trigger consultation_transcripts_updated_at
  before update on public.consultation_transcripts
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Synthèse « avant séance » d'un patient (2e visite et suivantes)
-- Mise en cache : régénérée seulement si les consultations ont changé.
-- -----------------------------------------------------------------------------
create table public.patient_briefs (
  patient_id       uuid primary key references public.patients(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  content          jsonb not null,
  source_hash      text not null,     -- empreinte des consultations utilisées
  model            text not null,
  generated_by     uuid,
  generated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Usage IA (coûts, volumes) — aucune donnée clinique stockée ici
-- -----------------------------------------------------------------------------
create table public.ai_usage (
  id               bigint generated always as identity primary key,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid,
  feature          text not null,      -- 'transcription', 'consultation_report', 'patient_brief'…
  model            text not null,
  input_tokens     int,
  output_tokens    int,
  audio_seconds    numeric,
  duration_ms      int,
  success          boolean not null default true,
  created_at       timestamptz not null default now()
);

create index ai_usage_org_idx on public.ai_usage(organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- À la validation, on archive la version finale à côté du dernier brouillon IA :
-- c'est l'écart brouillon → version validée qui permet d'apprendre le style.
-- -----------------------------------------------------------------------------
create or replace function app.capture_final_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'validated' and old.status <> 'validated' then
    update public.ai_draft_feedback f
       set final_version = to_jsonb(new) - 'quick_notes'
     where f.id = (
       select id from public.ai_draft_feedback
        where consultation_id = new.id
        order by created_at desc
        limit 1
     );
  end if;
  return new;
end;
$$;

create trigger consultations_capture_final_version
  after update of status on public.consultations
  for each row execute function app.capture_final_version();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.consultation_recordings   enable row level security;
alter table public.consultation_transcripts  enable row level security;
alter table public.patient_briefs            enable row level security;
alter table public.ai_usage                  enable row level security;

-- Enregistrements : praticien auteur de la consultation uniquement
create or replace function app.is_consultation_author(consultation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.consultations c
    where c.id = consultation
      and c.practitioner_id = app.current_practitioner_id(c.organization_id)
  )
$$;

create policy recordings_select on public.consultation_recordings for select to authenticated
  using (app.can_access_clinical(organization_id));
create policy recordings_insert on public.consultation_recordings for insert to authenticated
  with check (
    app.is_consultation_author(consultation_id)
    and consent_confirmed_by = app.current_user_id()
    and exists (select 1 from public.consultations c
                where c.id = consultation_id and c.organization_id = organization_id)
  );
create policy recordings_update on public.consultation_recordings for update to authenticated
  using (app.is_consultation_author(consultation_id))
  with check (app.is_consultation_author(consultation_id));

create policy transcripts_select on public.consultation_transcripts for select to authenticated
  using (app.can_access_clinical(organization_id));
create policy transcripts_insert on public.consultation_transcripts for insert to authenticated
  with check (
    app.is_consultation_author(consultation_id)
    and exists (select 1 from public.consultations c
                where c.id = consultation_id and c.organization_id = organization_id)
  );
create policy transcripts_update on public.consultation_transcripts for update to authenticated
  using (app.is_consultation_author(consultation_id))
  with check (app.is_consultation_author(consultation_id));

create policy briefs_all on public.patient_briefs for all to authenticated
  using (app.can_access_clinical(organization_id))
  with check (
    app.can_access_clinical(organization_id)
    and exists (select 1 from public.patients p
                where p.id = patient_id and p.organization_id = organization_id)
  );

create policy ai_usage_select on public.ai_usage for select to authenticated
  using (app.has_role(organization_id, array['owner','admin']::public.member_role[]));
create policy ai_usage_insert on public.ai_usage for insert to authenticated
  with check (app.is_member(organization_id) and user_id = app.current_user_id());

-- -----------------------------------------------------------------------------
-- Stockage des fichiers audio (Supabase Storage)
-- Chemin imposé : {organization_id}/{consultation_id}/{fichier}
-- Ce bloc ne s'applique que si le schéma storage existe (Supabase).
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('recordings', 'recordings', false, 104857600,
            array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'])
    on conflict (id) do nothing;

    execute $p$
      create policy recordings_storage_insert on storage.objects for insert to authenticated
      with check (
        bucket_id = 'recordings'
        and app.is_consultation_author(((storage.foldername(name))[2])::uuid)
        and exists (select 1 from public.consultations c
                    where c.id = ((storage.foldername(name))[2])::uuid
                      and c.organization_id::text = (storage.foldername(name))[1])
      )
    $p$;
    execute $p$
      create policy recordings_storage_select on storage.objects for select to authenticated
      using (
        bucket_id = 'recordings'
        and app.is_consultation_author(((storage.foldername(name))[2])::uuid)
      )
    $p$;
    execute $p$
      create policy recordings_storage_delete on storage.objects for delete to authenticated
      using (
        bucket_id = 'recordings'
        and app.is_consultation_author(((storage.foldername(name))[2])::uuid)
      )
    $p$;
  end if;
end
$$;

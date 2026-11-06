-- =============================================================================
-- 0005 — Row Level Security
-- Règle générale : aucune donnée n'est visible hors de son cabinet.
-- Données cliniques : owner / admin / practitioner uniquement (jamais 'staff').
-- Les écritures sensibles passent par des fonctions SECURITY DEFINER.
-- =============================================================================

alter table public.organizations                  enable row level security;
alter table public.organization_members           enable row level security;
alter table public.practitioners                  enable row level security;
alter table public.patients                       enable row level security;
alter table public.patient_clinical_profiles      enable row level security;
alter table public.consultations                  enable row level security;
alter table public.consultation_revisions         enable row level security;
alter table public.audit_logs                     enable row level security;
alter table public.practitioner_method_profiles   enable row level security;
alter table public.ai_draft_feedback              enable row level security;
alter table public.red_flag_items                 enable row level security;
alter table public.consultation_red_flag_checks   enable row level security;
alter table public.scientific_articles            enable row level security;
alter table public.scientific_article_chunks      enable row level security;

-- --- Organisations -----------------------------------------------------------
create policy org_select on public.organizations for select to authenticated
  using (app.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (app.has_role(id, array['owner','admin']::public.member_role[]))
  with check (app.has_role(id, array['owner','admin']::public.member_role[]));
-- Création : uniquement via public.create_organization_with_owner().

-- --- Membres -----------------------------------------------------------------
create policy members_select on public.organization_members for select to authenticated
  using (app.is_member(organization_id));
create policy members_write on public.organization_members for all to authenticated
  using (app.has_role(organization_id, array['owner']::public.member_role[]))
  with check (app.has_role(organization_id, array['owner']::public.member_role[]));

-- --- Praticiens --------------------------------------------------------------
create policy practitioners_select on public.practitioners for select to authenticated
  using (app.is_member(organization_id));
create policy practitioners_update on public.practitioners for update to authenticated
  using (user_id = app.current_user_id()
         or app.has_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (app.is_member(organization_id));

-- --- Patients (données administratives) --------------------------------------
create policy patients_select on public.patients for select to authenticated
  using (app.is_member(organization_id));
create policy patients_insert on public.patients for insert to authenticated
  with check (app.is_member(organization_id));
create policy patients_update on public.patients for update to authenticated
  using (app.is_member(organization_id))
  with check (app.is_member(organization_id));
create policy patients_delete on public.patients for delete to authenticated
  using (app.has_role(organization_id, array['owner','admin']::public.member_role[]));

-- --- Patients (données cliniques) --------------------------------------------
create policy patient_clinical_all on public.patient_clinical_profiles for all to authenticated
  using (app.can_access_clinical(organization_id))
  with check (
    app.can_access_clinical(organization_id)
    and exists (select 1 from public.patients p
                where p.id = patient_id and p.organization_id = organization_id)
  );

-- --- Consultations -----------------------------------------------------------
create policy consultations_select on public.consultations for select to authenticated
  using (app.can_access_clinical(organization_id));

-- Un praticien ne crée une consultation qu'en son propre nom, en brouillon.
create policy consultations_insert on public.consultations for insert to authenticated
  with check (
    app.can_access_clinical(organization_id)
    and practitioner_id = app.current_practitioner_id(organization_id)
    and status = 'draft'
  );

-- Modification : par le praticien auteur. Le passage en 'validated' se fait
-- exclusivement via public.validate_consultation() (contrôle ci-dessous).
create policy consultations_update on public.consultations for update to authenticated
  using (
    app.can_access_clinical(organization_id)
    and practitioner_id = app.current_practitioner_id(organization_id)
  )
  with check (
    app.can_access_clinical(organization_id)
    and practitioner_id = app.current_practitioner_id(organization_id)
  );

create policy consultations_delete on public.consultations for delete to authenticated
  using (
    status = 'draft'
    and practitioner_id = app.current_practitioner_id(organization_id)
  );

-- Empêche un client de forcer status/validated_* sans passer par la fonction
create or replace function app.guard_consultation_validation()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.validating', true) = 'on' then
    return new;
  end if;
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status <> 'validated') then
    raise exception 'La validation passe par validate_consultation()' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.validated_at is distinct from old.validated_at
                           or new.validated_by is distinct from old.validated_by) then
    raise exception 'Champs de validation non modifiables' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger consultations_guard_validation
  before insert or update on public.consultations
  for each row execute function app.guard_consultation_validation();

-- La fonction de validation active le contournement le temps de sa transaction
create or replace function public.validate_consultation(consultation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.consultations;
begin
  select * into c from public.consultations where id = consultation;
  if not found then
    raise exception 'Consultation introuvable';
  end if;
  if not app.can_access_clinical(c.organization_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if c.practitioner_id is distinct from app.current_practitioner_id(c.organization_id) then
    raise exception 'Seul le praticien de la consultation peut la valider' using errcode = '42501';
  end if;

  perform set_config('app.validating', 'on', true);
  update public.consultations
     set status = 'validated', validated_at = now(), validated_by = app.current_user_id()
   where id = consultation;
  perform set_config('app.validating', 'off', true);

  perform public.log_audit(c.organization_id, 'consultation.validate', 'consultation', consultation);
end;
$$;

-- --- Révisions (lecture seule) -----------------------------------------------
create policy revisions_select on public.consultation_revisions for select to authenticated
  using (app.can_access_clinical(organization_id));

-- --- Audit (lecture owner/admin, écriture via log_audit) ---------------------
create policy audit_select on public.audit_logs for select to authenticated
  using (app.has_role(organization_id, array['owner','admin']::public.member_role[]));

-- --- Profil de méthode : strictement personnel -------------------------------
create policy method_profile_own on public.practitioner_method_profiles for all to authenticated
  using (practitioner_id = app.current_practitioner_id(organization_id))
  with check (practitioner_id = app.current_practitioner_id(organization_id));

create policy ai_feedback_own on public.ai_draft_feedback for all to authenticated
  using (practitioner_id = app.current_practitioner_id(organization_id))
  with check (practitioner_id = app.current_practitioner_id(organization_id));

-- --- Drapeaux rouges ---------------------------------------------------------
create policy red_flag_items_select on public.red_flag_items for select to authenticated
  using (organization_id is null or app.is_member(organization_id));
create policy red_flag_items_write on public.red_flag_items for all to authenticated
  using (organization_id is not null
         and app.has_role(organization_id, array['owner','admin','practitioner']::public.member_role[]))
  with check (organization_id is not null
              and app.has_role(organization_id, array['owner','admin','practitioner']::public.member_role[]));

create policy red_flag_checks_all on public.consultation_red_flag_checks for all to authenticated
  using (app.can_access_clinical(organization_id))
  with check (
    app.can_access_clinical(organization_id)
    and exists (select 1 from public.consultations c
                where c.id = consultation_id and c.organization_id = organization_id)
  );

-- --- Bibliothèque scientifique : lecture pour tout utilisateur connecté ------
-- Écriture réservée au service d'ingestion (service role, qui contourne la RLS).
create policy articles_select on public.scientific_articles for select to authenticated
  using (true);
create policy article_chunks_select on public.scientific_article_chunks for select to authenticated
  using (true);

revoke all on function public.validate_consultation(uuid) from public;
grant execute on function public.validate_consultation(uuid) to authenticated;

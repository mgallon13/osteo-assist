-- =============================================================================
-- 0009 — Facturation (numérotation légale, avoirs) et relances patients
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Paramètres du cabinet et consentements patients
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column default_fee_cents   int check (default_fee_cents is null or default_fee_cents > 0),
  add column vat_mention         text not null default 'TVA non applicable, article 261-4-1° du CGI',
  add column invoice_footer      text,
  add column maintenance_days    int not null default 150 check (maintenance_days between 30 and 730),
  add column reminders_enabled   boolean not null default true,
  add column message_signature   text;

alter table public.patients
  add column consent_email  boolean not null default false,
  add column consent_sms    boolean not null default false,
  add column consent_at     timestamptz;

-- -----------------------------------------------------------------------------
-- Factures et avoirs
-- Une facture émise ne se modifie ni ne se supprime : on l'annule par un avoir.
-- Numérotation continue par cabinet et par année : 2026-0001, 2026-0002…
-- -----------------------------------------------------------------------------
create type public.invoice_kind as enum ('invoice', 'credit_note');
create type public.invoice_status as enum ('draft', 'issued', 'paid', 'cancelled');
create type public.payment_method as enum ('card', 'cash', 'check', 'transfer', 'other');

create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete restrict,
  patient_id       uuid not null references public.patients(id) on delete restrict,
  practitioner_id  uuid not null references public.practitioners(id) on delete restrict,
  consultation_id  uuid references public.consultations(id) on delete set null,
  kind             public.invoice_kind not null default 'invoice',
  credit_for       uuid references public.invoices(id) on delete restrict,
  number           text,
  status           public.invoice_status not null default 'draft',
  label            text not null default 'Séance d''ostéopathie',
  service_date     date not null default current_date,
  issue_date       date,
  amount_cents     int not null,
  payment_method   public.payment_method,
  paid_at          timestamptz,
  sent_at          timestamptz,
  snapshot         jsonb,           -- identités figées à l'émission (cabinet, praticien, patient)
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, number),
  constraint invoice_amount_sign check (
    (kind = 'invoice' and amount_cents > 0) or (kind = 'credit_note' and amount_cents < 0)
  ),
  constraint credit_note_ref check ((kind = 'credit_note') = (credit_for is not null)),
  constraint issued_has_number check (status = 'draft' or (number is not null and issue_date is not null))
);

create index invoices_org_idx on public.invoices(organization_id, issue_date desc);
create index invoices_patient_idx on public.invoices(patient_id, created_at desc);
create index invoices_consultation_idx on public.invoices(consultation_id);

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function app.set_updated_at();

create table public.invoice_counters (
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  year             int not null,
  last_number      int not null default 0,
  primary key (organization_id, year)
);

-- Cohérence : patient, praticien, consultation du même cabinet
create or replace function app.check_invoice_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.patients p where p.id = new.patient_id and p.organization_id = new.organization_id) then
    raise exception 'Le patient n''appartient pas à ce cabinet';
  end if;
  if not exists (select 1 from public.practitioners p where p.id = new.practitioner_id and p.organization_id = new.organization_id) then
    raise exception 'Le praticien n''appartient pas à ce cabinet';
  end if;
  if new.consultation_id is not null and not exists (
    select 1 from public.consultations c where c.id = new.consultation_id and c.organization_id = new.organization_id
      and c.patient_id = new.patient_id) then
    raise exception 'La consultation ne correspond pas';
  end if;
  return new;
end;
$$;

create trigger invoices_tenant_check
  before insert or update of organization_id, patient_id, practitioner_id, consultation_id on public.invoices
  for each row execute function app.check_invoice_tenant();

-- Immutabilité après émission : seuls le paiement, l'envoi et l'annulation évoluent
create or replace function app.guard_issued_invoice()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Une facture émise ne peut pas être supprimée : émettez un avoir' using errcode = '42501';
    end if;
    return old;
  end if;
  if current_setting('app.issuing', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' then
    if new.number is distinct from old.number or new.amount_cents is distinct from old.amount_cents
       or new.label is distinct from old.label or new.service_date is distinct from old.service_date
       or new.issue_date is distinct from old.issue_date or new.patient_id is distinct from old.patient_id
       or new.kind is distinct from old.kind or new.snapshot is distinct from old.snapshot
       or new.credit_for is distinct from old.credit_for then
      raise exception 'Une facture émise ne peut plus être modifiée : émettez un avoir' using errcode = '42501';
    end if;
    if new.status = 'draft' then
      raise exception 'Une facture émise ne peut pas redevenir un brouillon' using errcode = '42501';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      raise exception 'L''annulation passe par cancel_invoice()' using errcode = '42501';
    end if;
  elsif new.status <> 'draft' or new.number is not null then
    raise exception 'L''émission passe par issue_invoice()' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger invoices_guard
  before update or delete on public.invoices
  for each row execute function app.guard_issued_invoice();

-- Attribue le prochain numéro et fige les identités
create or replace function app.next_invoice_number(org uuid, d date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from d)::int;
  n int;
begin
  insert into public.invoice_counters (organization_id, year, last_number) values (org, y, 1)
  on conflict (organization_id, year) do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into n;
  return y::text || '-' || lpad(n::text, 4, '0');
end;
$$;

create or replace function app.invoice_snapshot(inv public.invoices)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'organization', (select jsonb_build_object('name', o.name, 'legal_name', o.legal_name, 'siret', o.siret,
                       'address', o.address, 'vat_mention', o.vat_mention, 'footer', o.invoice_footer)
                     from public.organizations o where o.id = inv.organization_id),
    'practitioner', (select jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'adeli', p.adeli_number)
                     from public.practitioners p where p.id = inv.practitioner_id),
    'patient', (select jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'address', p.address, 'email', p.email)
                from public.patients p where p.id = inv.patient_id)
  )
$$;

create or replace function public.issue_invoice(invoice uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices;
  d date := current_date;
begin
  select * into inv from public.invoices where id = invoice for update;
  if not found then raise exception 'Facture introuvable'; end if;
  if not app.is_member(inv.organization_id) then raise exception 'Accès refusé' using errcode = '42501'; end if;
  if inv.status <> 'draft' then raise exception 'Facture déjà émise'; end if;

  perform set_config('app.issuing', 'on', true);
  update public.invoices
     set status = 'issued',
         issue_date = d,
         number = app.next_invoice_number(inv.organization_id, d),
         snapshot = app.invoice_snapshot(inv)
   where id = invoice
  returning * into inv;
  perform set_config('app.issuing', 'off', true);

  perform public.log_audit(inv.organization_id, 'invoice.issue', 'invoice', invoice, jsonb_build_object('number', inv.number));
  return inv;
end;
$$;

-- Annulation légale : un avoir du même montant, numéroté, puis facture « annulée »
create or replace function public.cancel_invoice(invoice uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices;
  credit public.invoices;
  d date := current_date;
begin
  select * into inv from public.invoices where id = invoice for update;
  if not found then raise exception 'Facture introuvable'; end if;
  if not app.is_member(inv.organization_id) then raise exception 'Accès refusé' using errcode = '42501'; end if;
  if inv.kind <> 'invoice' or inv.status not in ('issued', 'paid') then
    raise exception 'Seule une facture émise peut être annulée';
  end if;

  perform set_config('app.issuing', 'on', true);
  insert into public.invoices (organization_id, patient_id, practitioner_id, consultation_id, kind, credit_for,
                               status, number, label, service_date, issue_date, amount_cents, created_by)
  values (inv.organization_id, inv.patient_id, inv.practitioner_id, inv.consultation_id, 'credit_note', inv.id,
          'issued', app.next_invoice_number(inv.organization_id, d), 'Avoir sur facture n° ' || inv.number,
          inv.service_date, d, -inv.amount_cents, app.current_user_id())
  returning * into credit;
  update public.invoices set snapshot = app.invoice_snapshot(credit) where id = credit.id
  returning * into credit;
  update public.invoices set status = 'cancelled' where id = inv.id;
  perform set_config('app.issuing', 'off', true);

  perform public.log_audit(inv.organization_id, 'invoice.cancel', 'invoice', invoice,
                           jsonb_build_object('number', inv.number, 'credit_note', credit.number));
  return credit;
end;
$$;

revoke all on function public.issue_invoice(uuid) from public;
revoke all on function public.cancel_invoice(uuid) from public;
grant execute on function public.issue_invoice(uuid), public.cancel_invoice(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Relances : préparées automatiquement, envoyées seulement après validation
-- -----------------------------------------------------------------------------
create type public.reminder_kind as enum ('follow_up', 'maintenance', 'unpaid_invoice');
create type public.reminder_status as enum ('pending', 'sent', 'dismissed', 'cancelled');

create table public.patient_reminders (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  patient_id       uuid not null references public.patients(id) on delete cascade,
  consultation_id  uuid references public.consultations(id) on delete set null,
  invoice_id       uuid references public.invoices(id) on delete cascade,
  kind             public.reminder_kind not null,
  due_date         date not null,
  status           public.reminder_status not null default 'pending',
  channel          text not null default 'email' check (channel in ('email', 'sms', 'manual')),
  message          text,
  sent_at          timestamptz,
  handled_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index patient_reminders_due_idx on public.patient_reminders(organization_id, status, due_date);
create index patient_reminders_patient_idx on public.patient_reminders(patient_id);

create trigger patient_reminders_updated_at
  before update on public.patient_reminders
  for each row execute function app.set_updated_at();

-- À la validation d'une consultation : relance de suivi (si date choisie) + relance d'entretien
create or replace function app.schedule_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
begin
  if new.status = 'validated' and old.status <> 'validated' then
    select * into org from public.organizations where id = new.organization_id;
    if not org.reminders_enabled then return new; end if;

    -- Une nouvelle séance rend caduques les relances d'entretien en attente
    update public.patient_reminders set status = 'cancelled'
     where patient_id = new.patient_id and kind = 'maintenance' and status = 'pending';

    if new.suggested_follow_up_date is not null and new.suggested_follow_up_date > current_date then
      insert into public.patient_reminders (organization_id, patient_id, consultation_id, kind, due_date)
      values (new.organization_id, new.patient_id, new.id, 'follow_up', new.suggested_follow_up_date);
    end if;

    insert into public.patient_reminders (organization_id, patient_id, consultation_id, kind, due_date)
    values (new.organization_id, new.patient_id, new.id, 'maintenance',
            (new.consultation_date::date + org.maintenance_days));
  end if;
  return new;
end;
$$;

create trigger consultations_schedule_reminders
  after update of status on public.consultations
  for each row execute function app.schedule_reminders();

-- Une facture réglée ou annulée clôt ses relances d'impayé
create or replace function app.close_invoice_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('paid', 'cancelled') and old.status is distinct from new.status then
    update public.patient_reminders set status = 'cancelled'
     where invoice_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger invoices_close_reminders
  after update of status on public.invoices
  for each row execute function app.close_invoice_reminders();

-- -----------------------------------------------------------------------------
-- RLS : facturation et relances sont des données administratives (secrétariat inclus)
-- -----------------------------------------------------------------------------
alter table public.invoices           enable row level security;
alter table public.invoice_counters   enable row level security;
alter table public.patient_reminders  enable row level security;

create policy invoices_select on public.invoices for select to authenticated
  using (app.is_member(organization_id));
create policy invoices_insert on public.invoices for insert to authenticated
  with check (app.is_member(organization_id) and status = 'draft' and number is null and kind = 'invoice');
create policy invoices_update on public.invoices for update to authenticated
  using (app.is_member(organization_id))
  with check (app.is_member(organization_id));
create policy invoices_delete on public.invoices for delete to authenticated
  using (app.is_member(organization_id) and status = 'draft');
-- invoice_counters : aucun accès direct (fonctions SECURITY DEFINER uniquement)

create policy reminders_all on public.patient_reminders for all to authenticated
  using (app.is_member(organization_id))
  with check (
    app.is_member(organization_id)
    and exists (select 1 from public.patients p where p.id = patient_id and p.organization_id = organization_id)
  );

grant select, insert, update, delete on public.invoices, public.patient_reminders to authenticated;
grant execute on all functions in schema app to authenticated;

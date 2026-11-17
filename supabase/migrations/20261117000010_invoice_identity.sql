-- =============================================================================
-- 0010 — Identité complète sur les notes d'honoraires (RPPS, titre, contact)
-- =============================================================================
alter table public.practitioners
  add column rpps_number         text check (rpps_number is null or rpps_number ~ '^\d{11}$'),
  add column professional_title  text not null default 'Ostéopathe D.O.',
  add column diploma             text,
  add column phone               text,
  add column contact_email       text;

alter table public.organizations
  add column invoice_title  text not null default 'Note d''honoraires';

create or replace function app.invoice_snapshot(inv public.invoices)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'organization', (select jsonb_build_object('name', o.name, 'legal_name', o.legal_name, 'siret', o.siret,
                       'address', o.address, 'vat_mention', o.vat_mention, 'footer', o.invoice_footer,
                       'invoice_title', o.invoice_title)
                     from public.organizations o where o.id = inv.organization_id),
    'practitioner', (select jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'adeli', p.adeli_number,
                       'rpps', p.rpps_number, 'title', p.professional_title, 'diploma', p.diploma,
                       'phone', p.phone, 'email', p.contact_email)
                     from public.practitioners p where p.id = inv.practitioner_id),
    'patient', (select jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'address', p.address, 'email', p.email)
                from public.patients p where p.id = inv.patient_id)
  )
$$;

grant execute on all functions in schema app to authenticated;

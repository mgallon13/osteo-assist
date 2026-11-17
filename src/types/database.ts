// Types alignés sur supabase/migrations. À régénérer automatiquement plus tard
// avec `supabase gen types typescript` une fois le projet Supabase lié.

export type MemberRole = 'owner' | 'admin' | 'practitioner' | 'staff'
export type ConsultationStatus = 'draft' | 'validated' | 'cancelled'
export type RedFlagCheckStatus = 'not_assessed' | 'absent' | 'present'

export interface Organization {
  id: string
  name: string
  legal_name: string | null
  siret: string | null
  address: string | null
  default_fee_cents: number | null
  vat_mention: string
  invoice_footer: string | null
  maintenance_days: number
  reminders_enabled: boolean
  message_signature: string | null
}

export interface Membership {
  organization_id: string
  role: MemberRole
  organizations: Organization
}

export interface Practitioner {
  id: string
  organization_id: string
  user_id: string
  first_name: string
  last_name: string
  adeli_number: string | null
  doctolib_url: string | null
}

export interface Patient {
  id: string
  organization_id: string
  primary_practitioner_id: string | null
  first_name: string
  last_name: string
  birth_date: string | null
  email: string | null
  phone: string | null
  address: string | null
  profession: string | null
  referring_doctor: string | null
  admin_notes: string | null
  consent_email: boolean
  consent_sms: boolean
  consent_at: string | null
  is_synthetic: boolean
  archived_at: string | null
  created_at: string
}

export interface PatientSummary {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  birth_date: string | null
  email: string | null
  phone: string | null
  is_synthetic: boolean
  consultation_count: number
  last_consultation_at: string | null
}

export interface PatientClinicalProfile {
  patient_id: string
  organization_id: string
  medical_history: string | null
  recurring_complaints: string | null
  clinical_notes: string | null
}

export interface Consultation {
  id: string
  organization_id: string
  patient_id: string
  practitioner_id: string
  consultation_date: string
  status: ConsultationStatus
  reason: string | null
  reported_symptoms: string | null
  relevant_history: string | null
  practitioner_findings: string | null
  techniques_performed: string | null
  progress_since_last: string | null
  advice_given: string | null
  additional_notes: string | null
  suggested_follow_up_date: string | null
  ai_drafted: boolean
  quick_notes: string | null
  validated_at: string | null
  created_at: string
  updated_at: string
}

export interface RedFlagItem {
  id: string
  organization_id: string | null
  category: string
  label: string
  description: string | null
  source: string | null
  clinically_reviewed: boolean
  sort_order: number
}

export interface RedFlagCheck {
  id: string
  consultation_id: string
  item_id: string
  status: RedFlagCheckStatus
  note: string | null
}

export interface MethodProfile {
  id: string
  organization_id: string
  practitioner_id: string
  questionnaire_version: number
  answers: Record<string, string | string[]>
  completed_at: string | null
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled'
export type PaymentMethodValue = 'card' | 'cash' | 'check' | 'transfer' | 'other'

export interface Invoice {
  id: string
  organization_id: string
  patient_id: string
  practitioner_id: string
  consultation_id: string | null
  kind: 'invoice' | 'credit_note'
  credit_for: string | null
  number: string | null
  status: InvoiceStatus
  label: string
  service_date: string
  issue_date: string | null
  amount_cents: number
  payment_method: PaymentMethodValue | null
  paid_at: string | null
  sent_at: string | null
  created_at: string
  patients?: { first_name: string; last_name: string; email: string | null } | null
}

export interface PatientReminder {
  id: string
  organization_id: string
  patient_id: string
  consultation_id: string | null
  invoice_id: string | null
  kind: 'follow_up' | 'maintenance' | 'unpaid_invoice'
  due_date: string
  status: 'pending' | 'sent' | 'dismissed' | 'cancelled'
  channel: string
  message: string | null
  sent_at: string | null
  created_at: string
  patients?: { first_name: string; last_name: string; email: string | null; consent_email: boolean } | null
  consultations?: { consultation_date: string } | null
  invoices?: { number: string | null; amount_cents: number; issue_date: string | null } | null
}

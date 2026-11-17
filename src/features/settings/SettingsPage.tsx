import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Card, CardHeader, ErrorMessage, Field, Input, PageHeader, Textarea } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useAuth, useWorkspace } from '@/features/auth/AuthProvider'

const nullable = (v: string) => (v.trim() === '' ? null : v.trim())

export function SettingsPage() {
  const { organization, organizationId, practitioner, role } = useWorkspace()
  const { refetchWorkspace } = useAuth()
  const canEditOrg = role === 'owner' || role === 'admin'

  const [org, setOrg] = useState({
    name: organization.name,
    legal_name: organization.legal_name ?? '',
    siret: organization.siret ?? '',
    address: organization.address ?? '',
    fee: organization.default_fee_cents ? String(organization.default_fee_cents / 100) : '',
    vat_mention: organization.vat_mention,
    invoice_footer: organization.invoice_footer ?? '',
    reminders_enabled: organization.reminders_enabled,
    maintenance_days: String(organization.maintenance_days),
    message_signature: organization.message_signature ?? '',
  })
  const [pr, setPr] = useState({
    first_name: practitioner?.first_name ?? '',
    last_name: practitioner?.last_name ?? '',
    adeli_number: practitioner?.adeli_number ?? '',
    doctolib_url: practitioner?.doctolib_url ?? '',
  })

  const save = useMutation({
    mutationFn: async () => {
      if (practitioner) {
        const { error } = await supabase.from('practitioners').update({
          first_name: pr.first_name.trim(), last_name: pr.last_name.trim(),
          adeli_number: nullable(pr.adeli_number), doctolib_url: nullable(pr.doctolib_url),
        }).eq('id', practitioner.id)
        if (error) throw error
      }
      if (canEditOrg) {
        const siret = org.siret.replace(/\s/g, '')
        if (siret && !/^\d{14}$/.test(siret)) throw new Error('Le SIRET doit comporter 14 chiffres.')
        const fee = org.fee.trim() ? Math.round(Number(org.fee.replace(',', '.')) * 100) : null
        if (fee !== null && !(fee > 0)) throw new Error('Tarif par défaut invalide.')
        const days = Number(org.maintenance_days)
        if (!(days >= 30 && days <= 730)) throw new Error('Le délai d’entretien doit être compris entre 30 et 730 jours.')
        const { error } = await supabase.from('organizations').update({
          name: org.name.trim(), legal_name: nullable(org.legal_name), siret: siret || null, address: nullable(org.address),
          default_fee_cents: fee, vat_mention: org.vat_mention.trim(), invoice_footer: nullable(org.invoice_footer),
          reminders_enabled: org.reminders_enabled, maintenance_days: days, message_signature: nullable(org.message_signature),
        }).eq('id', organizationId)
        if (error) throw error
      }
      await refetchWorkspace()
    },
  })

  const setO = (k: keyof typeof org) => (e: { target: { value: string } }) => setOrg({ ...org, [k]: e.target.value })
  const setP = (k: keyof typeof pr) => (e: { target: { value: string } }) => setPr({ ...pr, [k]: e.target.value })

  return (
    <>
      <PageHeader title="Paramètres" description="Ces informations figurent sur vos factures et dans vos messages." />
      <form className="max-w-3xl space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <Card>
          <CardHeader title="Praticien" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="pfn"><Input id="pfn" value={pr.first_name} onChange={setP('first_name')} required /></Field>
            <Field label="Nom" htmlFor="pln"><Input id="pln" value={pr.last_name} onChange={setP('last_name')} required /></Field>
            <Field label="N° ADELI" htmlFor="adeli" hint="Obligatoire sur les factures."><Input id="adeli" value={pr.adeli_number} onChange={setP('adeli_number')} /></Field>
            <Field label="Lien de prise de rendez-vous" htmlFor="doctolib" hint="Ajouté aux messages de relance (ex. Doctolib).">
              <Input id="doctolib" type="url" placeholder="https://" value={pr.doctolib_url} onChange={setP('doctolib_url')} />
            </Field>
          </div>
        </Card>

        <fieldset disabled={!canEditOrg} className="space-y-5">
          {!canEditOrg && <p className="text-sm text-stone-500">Seul le responsable du cabinet peut modifier les réglages ci-dessous.</p>}
          <Card>
            <CardHeader title="Cabinet" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nom du cabinet" htmlFor="oname"><Input id="oname" value={org.name} onChange={setO('name')} required /></Field>
              <Field label="Raison sociale (si différente)" htmlFor="legal"><Input id="legal" value={org.legal_name} onChange={setO('legal_name')} /></Field>
              <Field label="SIRET" htmlFor="siret"><Input id="siret" inputMode="numeric" value={org.siret} onChange={setO('siret')} /></Field>
              <div className="sm:col-span-2">
                <Field label="Adresse" htmlFor="addr"><Textarea id="addr" rows={2} value={org.address} onChange={setO('address')} /></Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Facturation" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Tarif par défaut (€)" htmlFor="fee"><Input id="fee" inputMode="decimal" value={org.fee} onChange={setO('fee')} placeholder="60" /></Field>
              <Field label="Mention de TVA" htmlFor="vat"><Input id="vat" value={org.vat_mention} onChange={setO('vat_mention')} required /></Field>
              <div className="sm:col-span-2">
                <Field label="Mentions en bas de facture" htmlFor="footer" hint="Facultatif : association agréée, conditions de règlement…">
                  <Textarea id="footer" rows={2} value={org.invoice_footer} onChange={setO('invoice_footer')} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Relances" description="Préparées après chaque séance validée ; envoyées seulement après votre validation." />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
                <input type="checkbox" checked={org.reminders_enabled} onChange={(e) => setOrg({ ...org, reminders_enabled: e.target.checked })} />
                Préparer automatiquement les relances
              </label>
              <Field label="Relance d’entretien après (jours)" htmlFor="days" hint="150 jours ≈ 5 mois.">
                <Input id="days" inputMode="numeric" value={org.maintenance_days} onChange={setO('maintenance_days')} />
              </Field>
              <Field label="Signature des messages" htmlFor="sig" hint="Par défaut : vos prénom et nom.">
                <Input id="sig" value={org.message_signature} onChange={setO('message_signature')} />
              </Field>
            </div>
          </Card>
        </fieldset>

        {save.error && <ErrorMessage error={save.error} />}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={save.isPending}>Enregistrer</Button>
          {save.isSuccess && <span className="text-sm text-accent-700">Enregistré.</span>}
        </div>
      </form>
    </>
  )
}

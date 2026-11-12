// Tests de sécurité de la base : isolation multi-tenant, rôles, validation.
// Exécute toutes les migrations dans un PostgreSQL embarqué (PGlite), avec un
// faux schéma `auth` qui imite Supabase. Lancer : npm run test:db
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite-pgvector'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'

const root = new URL('../../supabase/', import.meta.url).pathname
const db = await PGlite.create({ extensions: { vector, pgcrypto, pg_trgm, unaccent } })

// --- Imitation minimale de Supabase -----------------------------------------
await db.exec(`
  create role authenticated nologin;
  create role anon nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
`)

for (const f of readdirSync(join(root, 'migrations')).sort()) {
  await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'))
}
await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'))
// Ce que Supabase fournit d'office : usage des schémas public et auth.
// Tout le reste (schéma app, tables) doit venir des migrations elles-mêmes.
await db.exec(`
  grant usage on schema public, auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`)

const USER_A = '00000000-0000-0000-0000-00000000000a'
const USER_B = '00000000-0000-0000-0000-00000000000b'
const STAFF_A = '00000000-0000-0000-0000-0000000000a5'

async function as(uid, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role authenticated; select set_config('test.uid', '${uid}', true);`)
    return fn(tx)
  })
}

async function expectError(promise, pattern, label) {
  try {
    await promise
  } catch (e) {
    if (pattern && !pattern.test(String(e.message))) {
      throw new Error(`${label} : erreur inattendue « ${e.message} »`)
    }
    return
  }
  throw new Error(`${label} : aurait dû échouer`)
}

let passed = 0
async function test(name, fn) {
  await fn()
  passed++
  console.log(`  ✓ ${name}`)
}

// --- Préparation -------------------------------------------------------------
const orgA = await as(USER_A, async (tx) =>
  (await tx.query(`select public.create_organization_with_owner('Cabinet A','Alice','Martin') as id`)).rows[0].id)
const orgB = await as(USER_B, async (tx) =>
  (await tx.query(`select public.create_organization_with_owner('Cabinet B','Bruno','Petit') as id`)).rows[0].id)

// Ajout d'une secrétaire (staff) dans le cabinet A, par l'owner
await as(USER_A, (tx) => tx.query(
  `insert into organization_members (organization_id, user_id, role) values ($1, $2, 'staff')`, [orgA, STAFF_A]))

const { patientA, consultA } = await as(USER_A, async (tx) => {
  const p = (await tx.query(
    `insert into patients (organization_id, first_name, last_name, is_synthetic)
     values ($1, 'Jeanne', 'Fictive', true) returning id`, [orgA])).rows[0].id
  await tx.query(
    `insert into patient_clinical_profiles (patient_id, organization_id, medical_history)
     values ($1, $2, 'Lombalgie chronique (fictif)')`, [p, orgA])
  const pr = (await tx.query(`select app.current_practitioner_id($1) as id`, [orgA])).rows[0].id
  const c = (await tx.query(
    `insert into consultations (organization_id, patient_id, practitioner_id, reason)
     values ($1, $2, $3, 'Douleur lombaire') returning id`, [orgA, p, pr])).rows[0].id
  return { patientA: p, consultA: c }
})

console.log('Tests RLS')

await test('B ne voit ni les patients ni les consultations de A', () => as(USER_B, async (tx) => {
  assert.equal((await tx.query(`select * from patients where id = $1`, [patientA])).rows.length, 0)
  assert.equal((await tx.query(`select * from consultations where id = $1`, [consultA])).rows.length, 0)
  assert.equal((await tx.query(`select * from patient_clinical_profiles`)).rows.length, 0)
}))

await test('B ne peut pas créer de patient dans le cabinet A', () =>
  expectError(as(USER_B, (tx) => tx.query(
    `insert into patients (organization_id, first_name, last_name) values ($1, 'X', 'Y')`, [orgA])),
  /row-level security/, 'insert cross-tenant'))

await test('La secrétaire voit le patient mais pas ses données cliniques', () => as(STAFF_A, async (tx) => {
  assert.equal((await tx.query(`select * from patients where id = $1`, [patientA])).rows.length, 1)
  assert.equal((await tx.query(`select * from patient_clinical_profiles`)).rows.length, 0)
  assert.equal((await tx.query(`select * from consultations`)).rows.length, 0)
}))

await test('Impossible de valider un compte rendu sans passer par la fonction dédiée', () =>
  expectError(as(USER_A, (tx) => tx.query(
    `update consultations set status = 'validated' where id = $1`, [consultA])),
  /validate_consultation/, 'validation directe'))

await test('B ne peut pas valider la consultation de A', () =>
  expectError(as(USER_B, (tx) => tx.query(`select public.validate_consultation($1)`, [consultA])),
  /Accès refusé/, 'validation cross-tenant'))

await test('A valide sa consultation, l\'action est journalisée', () => as(USER_A, async (tx) => {
  await tx.query(`select public.validate_consultation($1)`, [consultA])
  const c = (await tx.query(`select status, validated_at from consultations where id = $1`, [consultA])).rows[0]
  assert.equal(c.status, 'validated')
  assert.ok(c.validated_at)
  const logs = (await tx.query(`select action from audit_logs where entity_id = $1`, [consultA])).rows
  assert.deepEqual(logs.map((l) => l.action), ['consultation.validate'])
}))

await test('Modifier un compte rendu validé archive l\'ancienne version', () => as(USER_A, async (tx) => {
  await tx.query(`update consultations set advice_given = 'Marche quotidienne' where id = $1`, [consultA])
  const revs = (await tx.query(`select snapshot from consultation_revisions where consultation_id = $1`, [consultA])).rows
  assert.equal(revs.length, 1)
  assert.equal(revs[0].snapshot.advice_given, null)
}))

await test('Une consultation ne peut pas référencer un patient d\'un autre cabinet', async () => {
  const patientB = await as(USER_B, async (tx) => (await tx.query(
    `insert into patients (organization_id, first_name, last_name) values ($1, 'Paul', 'Fictif') returning id`,
    [orgB])).rows[0].id)
  await expectError(as(USER_A, async (tx) => {
    const pr = (await tx.query(`select app.current_practitioner_id($1) as id`, [orgA])).rows[0].id
    await tx.query(`insert into consultations (organization_id, patient_id, practitioner_id)
                    values ($1, $2, $3)`, [orgA, patientB, pr])
  }), /n'appartient pas/, 'patient cross-tenant')
})

await test('Le profil de méthode est strictement personnel', async () => {
  await as(USER_A, async (tx) => {
    const pr = (await tx.query(`select app.current_practitioner_id($1) as id`, [orgA])).rows[0].id
    await tx.query(`insert into practitioner_method_profiles (organization_id, practitioner_id, questionnaire_version, answers)
                    values ($1, $2, 1, '{"approach":"structurel"}')`, [orgA, pr])
  })
  await as(STAFF_A, async (tx) => {
    assert.equal((await tx.query(`select * from practitioner_method_profiles`)).rows.length, 0)
  })
})

await test('La checklist drapeaux rouges de référence est lisible par tous', () => as(USER_B, async (tx) => {
  assert.ok((await tx.query(`select * from red_flag_items where organization_id is null`)).rows.length >= 10)
}))

await test('Un utilisateur connecté ne peut pas écrire dans la bibliothèque scientifique', () =>
  expectError(as(USER_A, (tx) => tx.query(
    `insert into scientific_articles (title) values ('Article injecté')`)),
  /row-level security/, 'écriture bibliothèque'))

console.log('\nTests séance assistée')

const consult2 = await as(USER_A, async (tx) => {
  const pr = (await tx.query(`select app.current_practitioner_id($1) as id`, [orgA])).rows[0].id
  return (await tx.query(
    `insert into consultations (organization_id, patient_id, practitioner_id) values ($1, $2, $3) returning id`,
    [orgA, patientA, pr])).rows[0].id
})

await test('Un enregistrement exige le consentement confirmé par le praticien lui-même', async () => {
  await expectError(as(USER_A, (tx) => tx.query(
    `insert into consultation_recordings (organization_id, consultation_id, storage_path, mime_type, consent_confirmed_at, consent_confirmed_by)
     values ($1, $2, $3, 'audio/webm', now(), $4)`,
    [orgA, consult2, `${orgA}/${consult2}/a.webm`, USER_B])), /row-level security/, 'consentement par un tiers')
  await expectError(as(USER_A, (tx) => tx.query(
    `insert into consultation_recordings (organization_id, consultation_id, storage_path, mime_type, consent_confirmed_by)
     values ($1, $2, $3, 'audio/webm', $4)`,
    [orgA, consult2, `${orgA}/${consult2}/b.webm`, USER_A])), /null value/, 'consentement absent')
  await as(USER_A, (tx) => tx.query(
    `insert into consultation_recordings (organization_id, consultation_id, storage_path, mime_type, consent_confirmed_at, consent_confirmed_by)
     values ($1, $2, $3, 'audio/webm', now(), $4)`,
    [orgA, consult2, `${orgA}/${consult2}/c.webm`, USER_A]))
})

await test('Le chemin de stockage doit être rangé sous le cabinet et la consultation', () =>
  expectError(as(USER_A, (tx) => tx.query(
    `insert into consultation_recordings (organization_id, consultation_id, storage_path, mime_type, consent_confirmed_at, consent_confirmed_by)
     values ($1, $2, $3, 'audio/webm', now(), $4)`,
    [orgA, consult2, `${orgB}/${consult2}/x.webm`, USER_A])), /recording_path_scoped/, 'chemin hors cabinet'))

await test('B ne peut pas ajouter de transcription à une consultation de A', () =>
  expectError(as(USER_B, (tx) => tx.query(
    `insert into consultation_transcripts (organization_id, consultation_id, raw_text, model) values ($1, $2, 'x', 'm')`,
    [orgA, consult2])), /row-level security/, 'transcription cross-tenant'))

await test('La secrétaire ne voit ni enregistrements ni transcriptions', async () => {
  await as(USER_A, (tx) => tx.query(
    `insert into consultation_transcripts (organization_id, consultation_id, raw_text, model) values ($1, $2, 'Bonjour…', 'test')`,
    [orgA, consult2]))
  await as(STAFF_A, async (tx) => {
    assert.equal((await tx.query(`select * from consultation_transcripts`)).rows.length, 0)
    assert.equal((await tx.query(`select * from consultation_recordings`)).rows.length, 0)
  })
})

await test('À la validation, la version finale est rangée à côté du brouillon IA', async () => {
  await as(USER_A, async (tx) => {
    const pr = (await tx.query(`select app.current_practitioner_id($1) as id`, [orgA])).rows[0].id
    await tx.query(
      `insert into ai_draft_feedback (organization_id, practitioner_id, consultation_id, ai_draft, model)
       values ($1, $2, $3, '{"reason":"Lombalgie"}', 'test')`, [orgA, pr, consult2])
    await tx.query(`update consultations set reason = 'Lombalgie basse' where id = $1`, [consult2])
    await tx.query(`select public.validate_consultation($1)`, [consult2])
    const f = (await tx.query(`select final_version from ai_draft_feedback where consultation_id = $1`, [consult2])).rows[0]
    assert.equal(f.final_version.reason, 'Lombalgie basse')
  })
})

await test('Usage IA : lisible par le propriétaire, pas par la secrétaire', async () => {
  await as(STAFF_A, (tx) => tx.query(
    `insert into ai_usage (organization_id, user_id, feature, model) values ($1, $2, 'transcription', 'm')`, [orgA, STAFF_A]))
  await as(STAFF_A, async (tx) => assert.equal((await tx.query(`select * from ai_usage`)).rows.length, 0))
  await as(USER_A, async (tx) => assert.equal((await tx.query(`select * from ai_usage`)).rows.length, 1))
})

console.log(`\n${passed} tests réussis`)
await db.close()

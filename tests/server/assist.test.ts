import { describe, expect, it } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'
import type { ModelProvider } from '../../server/ai/models.js'
import { runPracticeAssist, keepSourced } from '../../server/ai/assist.js'
import { parseArticles, searchPubmed, studyType, type Fetcher } from '../../server/ai/pubmed.js'
import { createFakeDb } from './fake-db.js'

const ORG = '11111111-1111-4111-8111-111111111111'
const USER = '00000000-0000-4000-8000-00000000000a'
const PR = '22222222-2222-4222-8222-222222222222'
const PAT = '33333333-3333-4333-8333-333333333333'
const C1 = '44444444-4444-4444-8444-444444444441'

const XML = `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID Version="1">38000001</PMID><Article>
<Journal><Title>Journal of Manual Therapy</Title><ISOAbbreviation>J Man Ther</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal>
<ArticleTitle>Spinal manipulation for acute low back pain: a systematic review &amp; meta-analysis</ArticleTitle>
<Abstract><AbstractText Label="RESULTS">Small short-term effect on pain (<i>moderate</i> certainty).</AbstractText></Abstract>
<PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType><PublicationType UI="D017418">Meta-Analysis</PublicationType></PublicationTypeList>
</Article></MedlineCitation><PubmedData><ArticleIdList><ArticleId IdType="doi">10.1/abc</ArticleId></ArticleIdList></PubmedData></PubmedArticle></PubmedArticleSet>`

const fetcher: Fetcher = async (url) => ({
  ok: true, status: 200,
  text: async () => url.includes('esearch') ? JSON.stringify({ esearchresult: { idlist: ['38000001'] } }) : XML,
})

const triage = { motifs: ['Lombalgie', 'Inventé'], pubmed_queries: ['low back pain psoas colon bloating', 'low back pain manipulation'] }
const synthesis = {
  summary: 'Lombalgie basse bilatérale après port de charge, sans irradiation.',
  red_flags: [
    { text: 'Troubles sphinctériens : rapportés absents.', source_ids: ['R2'], status: 'reported_absent' },
    { text: 'Douleur nocturne inflammatoire à vérifier.', source_ids: ['r2'], status: 'to_check' },
  ],
  questions_to_ask: [{ text: 'Mouvement déclencheur précis ?', source_ids: ['R1'] }],
  tests_to_consider: [{ text: 'Test des 4 mouvements.', source_ids: ['R3'] }],
  treatment_leads: [
    { text: 'Trigger points psoas puis lumbar roll.', source_ids: ['R4', 'M'] },
    { text: 'Technique miracle inventée.', source_ids: ['X9'] },
  ],
  if_no_improvement: [{ text: 'Explorer le côlon.', source_ids: ['R6', 'C1'] }],
  similar_cases: [{ text: 'Cas du 01/10 : lumbar roll, mieux à J7.', source_ids: ['C1'] }],
  evidence: [{ text: 'Effet modeste à court terme (méta-analyse).', source_ids: ['P1'] }],
}

function models(capture: string[], second: unknown = synthesis): ModelProvider {
  let call = 0
  const outputs = [triage, second]
  const make = (id: string) => ({
      id,
      model: new MockLanguageModelV4({
        doGenerate: async (options) => {
          capture.push(JSON.stringify(options.prompt))
          return {
            content: [{ type: 'text', text: JSON.stringify(outputs[call++] ?? synthesis) }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: {
              inputTokens: { total: 200, noCache: 200, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 80, text: 80, reasoning: undefined },
            },
            warnings: [],
          }
        },
      }),
    })
  return {
    language: () => make('test/llm'),
    reasoning: () => make('test/llm-large'),
    transcription: () => { throw new Error('non utilisé') },
    embedding: () => { throw new Error('non utilisé') },
  }
}

const card = (motif: string, section: string, content: string, i: number, keywords: string[] = []) =>
  ({ id: `card-${i}`, organization_id: null, motif, keywords, section, content, source_label: 'Pratique de terrain', sort_order: i })

function seed() {
  return createFakeDb({
    practitioners: [{ id: PR, organization_id: ORG, user_id: USER }],
    patients: [{ id: PAT, organization_id: ORG, first_name: 'Jeanne', last_name: 'Fictive', birth_date: '1981-01-01', profession: 'Comptable' }],
    patient_clinical_profiles: [],
    practitioner_method_profiles: [{ practitioner_id: PR, answers: { registers: ['Musculaire', 'Viscéral'], techniques_names: 'Lumbar roll' } }],
    reference_cards: [
      card('Transversal', 'approach', '- Tester avant de traiter', 0),
      card('Lombalgie', 'key_questions', '- Trajet électrique ?', 1, ['lombalgie', 'lombaire']),
      card('Lombalgie', 'red_flags', '- Queue de cheval', 2, ['lombalgie']),
      card('Lombalgie', 'tests', '- 4 mouvements', 3, ['lombalgie']),
      card('Lombalgie', 'approach', '- Psoas', 4, ['lombalgie']),
      card('Lombalgie', 'adaptations', '- Âgé', 5, ['lombalgie']),
      card('Lombalgie', 'if_no_improvement', '- Viscéral', 6, ['lombalgie']),
      card('Genou', 'tests', '- McMurray', 7, ['genou']),
    ],
    consultations: [
      { id: C1, organization_id: ORG, patient_id: PAT, practitioner_id: PR, consultation_date: '2026-11-13T09:00:00Z', status: 'draft',
        reason: 'Lombalgie basse', quick_notes: 'Pas de trouble urinaire. Psoas G tendu.', updated_at: '2026-11-13T09:00:00Z' },
      { id: 'old-1', organization_id: ORG, patient_id: 'autre', practitioner_id: PR, consultation_date: '2026-10-01T09:00:00Z', status: 'validated',
        reason: 'Lombalgie aiguë', techniques_performed: 'Lumbar roll', progress_since_last: 'Mieux à J7', updated_at: 'x' },
      { id: 'old-2', organization_id: ORG, patient_id: 'autre', practitioner_id: PR, consultation_date: '2026-09-01T09:00:00Z', status: 'validated',
        reason: 'Entorse cheville', updated_at: 'x' },
    ],
    consultation_transcripts: [],
    practice_assist_runs: [],
    ai_usage: [],
  })
}

describe('PubMed', () => {
  it('élargit la requête tant qu’aucun article n’est trouvé, et nettoie la syntaxe', async () => {
    const seen: string[] = []
    const f: Fetcher = async (url) => {
      const term = new URL(url).searchParams.get('term') ?? ''
      if (url.includes('esearch')) seen.push(term)
      const hit = term.startsWith('(low back pain)')
      return { ok: true, status: 200, text: async () => url.includes('esearch')
        ? JSON.stringify({ esearchresult: { idlist: hit ? ['38000001'] : [] } }) : XML }
    }
    const { searchPubmedProgressive } = await import('../../server/ai/pubmed.js')
    const r = await searchPubmedProgressive(['"low back pain"[MeSH] AND psoas', 'low back pain'], { fetcher: f })
    expect(r).toHaveLength(1)
    expect(seen[0]).toMatch(/^\(low back pain MeSH psoas\)/)
    expect(seen.at(-1)).toMatch(/^\(low back pain\)/)
  })

  it('extrait titre, résumé structuré, type d’étude et lien', () => {
    const [a] = parseArticles(XML)
    expect(a).toMatchObject({ pmid: '38000001', year: '2024', journal: 'J Man Ther', doi: '10.1/abc', url: 'https://pubmed.ncbi.nlm.nih.gov/38000001/' })
    expect(a!.title).toContain('systematic review & meta-analysis')
    expect(a!.abstract).toBe('RESULTS: Small short-term effect on pain (moderate certainty).')
    expect(studyType(a!.publicationTypes)).toBe('Méta-analyse')
  })

  it('renvoie une liste vide si PubMed est indisponible', async () => {
    const down: Fetcher = async () => { throw new Error('réseau') }
    expect(await searchPubmed('back pain', { fetcher: down })).toEqual([])
  })

  it('élargit la recherche si aucun article de haut niveau de preuve', async () => {
    const urls: string[] = []
    const f: Fetcher = async (url) => {
      urls.push(url)
      const esearch = url.includes('esearch')
      const first = urls.filter((u) => u.includes('esearch')).length === 1
      return { ok: true, status: 200, text: async () => esearch ? JSON.stringify({ esearchresult: { idlist: first ? [] : ['38000001'] } }) : XML }
    }
    expect(await searchPubmed('rare condition', { fetcher: f })).toHaveLength(1)
    expect(decodeURIComponent(urls[0]!)).toContain('systematic[sb]')
    expect(decodeURIComponent(urls[1]!)).not.toContain('systematic[sb]')
  })
})

describe('aide au praticien', () => {
  it('produit des pistes sourcées et retire celles sans source valide', async () => {
    const db = seed()
    const prompts: string[] = []
    const r = await runPracticeAssist({ db: db.client, userId: USER, models: models(prompts), fetcher }, C1)

    expect(r.motifs).toEqual(['Lombalgie'])                         // motif inventé écarté
    expect(r.dropped).toBe(1)                                         // « technique miracle » retirée
    expect(r.content.treatment_leads.map((t) => t.text)).toEqual(['Trigger points psoas puis lumbar roll.'])
    expect(r.content.red_flags[1]!.source_ids).toEqual(['R2'])       // « r2 » normalisé en R2
    expect(r.sources.find((s) => s.id === 'P1')).toMatchObject({ kind: 'pubmed', url: 'https://pubmed.ncbi.nlm.nih.gov/38000001/' })
    expect(r.sources.find((s) => s.id === 'C1')).toMatchObject({ kind: 'case', detail: 'Lombalgie aiguë' })
    expect(r.pubmedCount).toBe(1)
    // Cas similaires tirés de la base, pas du modèle (le texte inventé du mock n'apparaît pas)
    expect(r.content.similar_cases).toHaveLength(1)
    expect(r.content.similar_cases[0]!.text).toContain('Techniques : Lumbar roll')
    expect(r.content.similar_cases[0]!.text).toContain('Évolution notée : Mieux à J7')
    expect(JSON.stringify(r.content)).not.toContain('mieux à J7.')
    expect(r.sources.some((s) => s.id === 'M')).toBe(true)
    expect(db.tables.practice_assist_runs).toHaveLength(1)
    expect(db.tables.ai_usage![0]).toMatchObject({ feature: 'practice_assist', input_tokens: 400 })
  })

  it('n’envoie au modèle ni nom de patient, ni fiche hors motif, ni cas sans rapport', async () => {
    const prompts: string[] = []
    await runPracticeAssist({ db: seed().client, userId: USER, models: models(prompts), fetcher }, C1)
    const synthesisPrompt = prompts[1]!
    expect(prompts.join()).not.toContain('Jeanne')
    expect(synthesisPrompt).toContain('Psoas')
    expect(synthesisPrompt).not.toContain('McMurray')
    expect(synthesisPrompt).not.toContain('Entorse cheville')
    expect(synthesisPrompt).toContain('Spinal manipulation')
  })

  it('exige un minimum d’anamnèse', async () => {
    const db = seed()
    Object.assign(db.tables.consultations![0]!, { reason: null, quick_notes: null })
    await expect(runPracticeAssist({ db: db.client, userId: USER, models: models([]), fetcher }, C1))
      .rejects.toMatchObject({ status: 422 })
  })

  it('refuse un autre praticien', async () => {
    const db = seed()
    db.tables.practitioners!.push({ id: 'p2', organization_id: ORG, user_id: 'u2' })
    await expect(runPracticeAssist({ db: db.client, userId: 'u2', models: models([]), fetcher }, C1))
      .rejects.toMatchObject({ status: 403 })
  })
})

describe('filtre des sources', () => {
  const empty = { summary: '', red_flags: [], questions_to_ask: [], tests_to_consider: [], treatment_leads: [], if_no_improvement: [], evidence: [] }
  const kinds = new Map([['R1', 'reference'], ['C1', 'case'], ['P1', 'pubmed'], ['M', 'method']] as const)

  it('normalise la casse et dédoublonne', () => {
    const { content, dropped } = keepSourced({ ...empty, treatment_leads: [{ text: 'x', source_ids: ['r1', 'R1', 'zz'] }] }, new Map(kinds))
    expect(content.treatment_leads[0]!.source_ids).toEqual(['R1'])
    expect(dropped).toBe(0)
  })

  it('refuse une « littérature » qui ne cite pas PubMed', () => {
    const { content, dropped } = keepSourced({ ...empty, evidence: [
      { text: 'Les études montrent…', source_ids: ['R1'] },
      { text: 'Méta-analyse : effet modeste.', source_ids: ['P1', 'R1'] },
    ] }, new Map(kinds))
    expect(content.evidence).toEqual([{ text: 'Méta-analyse : effet modeste.', source_ids: ['P1'] }])
    expect(dropped).toBe(1)
  })

  it('refuse un drapeau rouge appuyé uniquement sur un cas du cabinet', () => {
    const { content } = keepSourced({ ...empty, red_flags: [{ text: 'x', source_ids: ['C1'], status: 'to_check' }] }, new Map(kinds))
    expect(content.red_flags).toEqual([])
  })
})

describe('sans publication', () => {
  it('laisse la littérature vide si PubMed ne renvoie rien', async () => {
    const none: Fetcher = async (url) => ({ ok: true, status: 200,
      text: async () => url.includes('esearch') ? JSON.stringify({ esearchresult: { idlist: [] } }) : '' })
    const r = await runPracticeAssist({ db: seed().client, userId: USER, models: models([]), fetcher: none }, C1)
    expect(r.pubmedCount).toBe(0)
    expect(r.content.evidence).toEqual([])   // la ligne citant P1 est retirée : P1 n'existe pas
  })
})

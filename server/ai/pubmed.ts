// Recherche PubMed via les API officielles NCBI E-utilities.
// https://www.ncbi.nlm.nih.gov/books/NBK25501/

export interface PubmedArticle {
  pmid: string
  title: string
  abstract: string
  journal: string | null
  year: string | null
  publicationTypes: string[]
  doi: string | null
  url: string
}

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

/** Filtre « niveau de preuve » : revues, méta-analyses, essais randomisés, recommandations. */
const EVIDENCE_FILTER =
  '(systematic[sb] OR meta-analysis[pt] OR randomized controlled trial[pt] OR practice guideline[pt] OR guideline[pt])'

function params(extra: Record<string, string>): string {
  const p = new URLSearchParams({ tool: 'osteoassist', ...extra })
  if (process.env.NCBI_EMAIL) p.set('email', process.env.NCBI_EMAIL)
  if (process.env.NCBI_API_KEY) p.set('api_key', process.env.NCBI_API_KEY)
  return p.toString()
}

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const first = (xml: string, re: RegExp) => {
  const m = xml.match(re)
  return m?.[1] ? decode(m[1]) : null
}

export function parseArticles(xml: string): PubmedArticle[] {
  const blocks = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? []
  return blocks.map((b) => {
    const pmid = first(b, /<PMID[^>]*>(\d+)<\/PMID>/) ?? ''
    const abstractParts = [...b.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((m) => {
      const label = m[1]?.match(/Label="([^"]+)"/)?.[1]
      const text = decode(m[2] ?? '')
      return label ? `${label}: ${text}` : text
    })
    return {
      pmid,
      title: first(b, /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) ?? '(sans titre)',
      abstract: abstractParts.join(' '),
      journal: first(b, /<ISOAbbreviation>([\s\S]*?)<\/ISOAbbreviation>/) ?? first(b, /<Title>([\s\S]*?)<\/Title>/),
      year: first(b, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) ?? first(b, /<MedlineDate>(\d{4})/),
      publicationTypes: [...b.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((m) => decode(m[1] ?? '')),
      doi: first(b, /<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    }
  }).filter((a) => a.pmid && a.abstract)
}

/** Type d'étude lisible, du plus au moins élevé dans la hiérarchie des preuves. */
export function studyType(types: string[]): string {
  const t = types.map((x) => x.toLowerCase())
  if (t.some((x) => x.includes('guideline'))) return 'Recommandation'
  if (t.includes('meta-analysis')) return 'Méta-analyse'
  if (t.includes('systematic review')) return 'Revue systématique'
  if (t.includes('randomized controlled trial')) return 'Essai randomisé'
  if (t.includes('review')) return 'Revue narrative'
  return 'Étude'
}

/**
 * Cherche d'abord des publications de haut niveau de preuve des 10 dernières années,
 * puis élargit si rien n'est trouvé. Ne lève pas d'erreur : PubMed indisponible = liste vide.
 */
export async function searchPubmed(query: string, options: { max?: number; fetcher?: Fetcher } = {}): Promise<PubmedArticle[]> {
  const fetcher = options.fetcher ?? ((url: string) => fetch(url, { signal: AbortSignal.timeout(10_000) }))
  const max = options.max ?? 5
  const since = new Date().getFullYear() - 10
  const attempts = [
    `(${query}) AND ${EVIDENCE_FILTER} AND ("${since}"[dp] : "3000"[dp])`,
    `(${query}) AND ("${since}"[dp] : "3000"[dp])`,
  ]
  try {
    for (const term of attempts) {
      const res = await fetcher(`${BASE}/esearch.fcgi?${params({ db: 'pubmed', term, retmax: String(max), sort: 'relevance', retmode: 'json' })}`)
      if (!res.ok) return []
      const ids: string[] = JSON.parse(await res.text())?.esearchresult?.idlist ?? []
      if (ids.length === 0) continue
      const xml = await fetcher(`${BASE}/efetch.fcgi?${params({ db: 'pubmed', id: ids.join(','), retmode: 'xml' })}`)
      if (!xml.ok) return []
      return parseArticles(await xml.text())
    }
    return []
  } catch (e) {
    console.error('[pubmed]', e instanceof Error ? e.message : e)
    return []
  }
}

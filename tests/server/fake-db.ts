// Faux client Supabase minimal : tables en mémoire, filtres eq/neq/lt, ordre, limite.
// Suffisant pour tester la logique métier des fonctions IA sans base réelle.
type Row = Record<string, unknown>

export interface FakeDb {
  tables: Record<string, Row[]>
  storage: Record<string, Uint8Array>
  client: any
}

export function createFakeDb(tables: Record<string, Row[]>, storage: Record<string, Uint8Array> = {}): FakeDb {
  const state: FakeDb = { tables, storage, client: null }

  function query(table: string) {
    const filters: ((r: Row) => boolean)[] = []
    let order: { col: string; asc: boolean } | null = null
    let limit: number | null = null
    let op: { kind: 'select' } | { kind: 'insert'; rows: Row[] } | { kind: 'update'; patch: Row } | { kind: 'upsert'; rows: Row[] } =
      { kind: 'select' }
    let single: 'single' | 'maybe' | null = null

    const rowsOf = () => (state.tables[table] ??= [])
    const run = () => {
      if (op.kind === 'insert' || op.kind === 'upsert') {
        const inserted: Row[] = op.rows.map((r) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...r }))
        if (op.kind === 'upsert') {
          for (const [n, r] of inserted.entries()) {
            const key = Object.keys(op.rows[n]!)[0]!  // 1re colonne fournie = clé de conflit
            const i = rowsOf().findIndex((x) => x[key] === r[key])
            if (i >= 0) rowsOf()[i] = { ...rowsOf()[i], ...r }
            else rowsOf().push(r)
          }
        } else rowsOf().push(...inserted)
        return finish(inserted)
      }
      let rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (op.kind === 'update') {
        for (const r of rows) Object.assign(r, op.patch, { updated_at: new Date().toISOString() })
        return finish(rows)
      }
      if (order) {
        const { col, asc } = order
        rows = [...rows].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1))
      }
      if (limit != null) rows = rows.slice(0, limit)
      return finish(rows)
    }
    const finish = (rows: Row[]) => {
      if (single === 'single') return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: new Error('not single') }
      if (single === 'maybe') return { data: rows[0] ?? null, error: null }
      return { data: rows, error: null }
    }

    const builder: any = {
      select: () => builder,
      insert: (r: Row | Row[]) => { op = { kind: 'insert', rows: Array.isArray(r) ? r : [r] }; return builder },
      upsert: (r: Row | Row[]) => { op = { kind: 'upsert', rows: Array.isArray(r) ? r : [r] }; return builder },
      update: (patch: Row) => { op = { kind: 'update', patch }; return builder },
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return builder },
      neq: (c: string, v: unknown) => { filters.push((r) => r[c] !== v); return builder },
      lt: (c: string, v: unknown) => { filters.push((r) => String(r[c]) < String(v)); return builder },
      is: (c: string, v: unknown) => { filters.push((r) => (r[c] ?? null) === v); return builder },
      order: (col: string, o?: { ascending?: boolean }) => { order = { col, asc: o?.ascending ?? true }; return builder },
      limit: (n: number) => { limit = n; return builder },
      returns: () => builder,
      single: () => { single = 'single'; return builder },
      maybeSingle: () => { single = 'maybe'; return builder },
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        try { resolve(run()) } catch (e) { reject(e) }
      },
    }
    return builder
  }

  state.client = {
    from: query,
    storage: {
      from: () => ({
        download: async (path: string) => {
          const bytes = state.storage[path]
          return bytes ? { data: new Blob([bytes as BlobPart]), error: null } : { data: null, error: new Error('absent') }
        },
        remove: async (paths: string[]) => {
          for (const p of paths) delete state.storage[p]
          return { data: [], error: null }
        },
      }),
    },
  }
  return state
}

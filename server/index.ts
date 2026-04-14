import express from 'express'
import cors from 'cors'
import type Database from 'better-sqlite3'
import { initDatabase } from '../database/init.js'
import { createGDriveRouter } from './gdrive.js'

const PORT = Number(process.env.PORT ?? 3001)
const db: Database.Database = initDatabase()

const app = express()
app.use(cors())
// Payload-urile de upload PDF ajung la ~2-5 MB base64; majoram limita.
app.use(express.json({ limit: '25mb' }))

app.use('/api/gdrive', createGDriveRouter())

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

function getProjectRow(id: string) {
  return db.prepare('SELECT * FROM Project WHERE id = ?').get(id)
}

function getClientRow(id: string) {
  return db.prepare('SELECT * FROM Client WHERE id = ?').get(id)
}

function getEbitRow(projectId: string) {
  return db.prepare('SELECT * FROM EBITBaseline WHERE project_id = ?').get(projectId)
}

function getMaturityRows(projectId: string) {
  return db.prepare('SELECT * FROM MaturityIndicator WHERE project_id = ? ORDER BY indicator_code').all(projectId)
}

// Parameterized upserts only (CLAUDE.md: nu interpola SQL).
const upsertProject = db.prepare(`
  INSERT INTO Project (id, client_id, name, status, current_stage, methodology_version,
                       completion_progress, start_date, target_end_date, consultant_owner,
                       created_at, updated_at)
  VALUES (@id, @client_id, @name, @status, @current_stage, @methodology_version,
          @completion_progress, @start_date, @target_end_date, @consultant_owner,
          @created_at, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    client_id=excluded.client_id, name=excluded.name, status=excluded.status,
    current_stage=excluded.current_stage, methodology_version=excluded.methodology_version,
    completion_progress=excluded.completion_progress, start_date=excluded.start_date,
    target_end_date=excluded.target_end_date, consultant_owner=excluded.consultant_owner,
    updated_at=excluded.updated_at
`)

const upsertEbit = db.prepare(`
  INSERT INTO EBITBaseline (id, project_id, annual_revenue, operational_costs, ebit_current,
    ebit_margin_current, ebit_target, ebit_target_delta_percent, it_spend_current,
    change_management_spend_current, rule_1_to_1_ratio, financial_notes,
    confidence, confidence_level, data_source, created_at, updated_at)
  VALUES (@id, @project_id, @annual_revenue, @operational_costs, @ebit_current,
    @ebit_margin_current, @ebit_target, @ebit_target_delta_percent, @it_spend_current,
    @change_management_spend_current, @rule_1_to_1_ratio, @financial_notes,
    @confidence, @confidence_level, @data_source, @created_at, @updated_at)
  ON CONFLICT(project_id) DO UPDATE SET
    annual_revenue=excluded.annual_revenue, operational_costs=excluded.operational_costs,
    ebit_current=excluded.ebit_current, ebit_margin_current=excluded.ebit_margin_current,
    ebit_target=excluded.ebit_target, ebit_target_delta_percent=excluded.ebit_target_delta_percent,
    it_spend_current=excluded.it_spend_current,
    change_management_spend_current=excluded.change_management_spend_current,
    rule_1_to_1_ratio=excluded.rule_1_to_1_ratio, financial_notes=excluded.financial_notes,
    confidence=excluded.confidence, confidence_level=excluded.confidence_level,
    data_source=excluded.data_source, updated_at=excluded.updated_at
`)

const upsertIndicator = db.prepare(`
  INSERT INTO MaturityIndicator (id, project_id, indicator_code, indicator_name, area,
    raw_input_json, score, calculation_method, consultant_comment,
    confidence, confidence_level, data_source, created_at, updated_at)
  VALUES (@id, @project_id, @indicator_code, @indicator_name, @area,
    @raw_input_json, @score, @calculation_method, @consultant_comment,
    @confidence, @confidence_level, @data_source, @created_at, @updated_at)
  ON CONFLICT(project_id, indicator_code) DO UPDATE SET
    indicator_name=excluded.indicator_name, area=excluded.area,
    raw_input_json=excluded.raw_input_json, score=excluded.score,
    calculation_method=excluded.calculation_method, consultant_comment=excluded.consultant_comment,
    confidence=excluded.confidence, confidence_level=excluded.confidence_level,
    data_source=excluded.data_source, updated_at=excluded.updated_at
`)

function nullify<T extends Record<string, unknown>>(obj: T, keys: string[]): T {
  const out = { ...obj } as Record<string, unknown>
  for (const k of keys) if (out[k] === undefined) out[k] = null
  return out as T
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/projects', (_req, res) => {
  const projects = db.prepare(`
    SELECT p.*, c.company_name AS client_company_name
    FROM Project p
    LEFT JOIN Client c ON c.id = p.client_id
    ORDER BY p.updated_at DESC
  `).all() as Array<Record<string, unknown>>

  const indStmt = db.prepare(
    'SELECT indicator_code, score FROM MaturityIndicator WHERE project_id = ? AND score IS NOT NULL'
  )
  const enriched = projects.map((p) => ({
    ...p,
    indicator_scores: indStmt.all(p.id),
  }))
  res.json(enriched)
})

app.post('/api/projects', (req, res) => {
  const incoming = req.body ?? {}
  if (!incoming.id || typeof incoming.id !== 'string') {
    return res.status(400).json({ error: 'id required' })
  }
  if (getProjectRow(incoming.id)) {
    return res.status(409).json({ error: 'project already exists' })
  }
  const client_id = incoming.client_id ?? `c-${incoming.id}`
  const ts = now()
  // Auto-create client minimal if absent.
  if (!getClientRow(client_id)) {
    db.prepare(`INSERT INTO Client (id, company_name, created_at, updated_at)
                VALUES (?, ?, ?, ?)`).run(client_id, incoming.client_company_name ?? 'Client nou', ts, ts)
  }
  const row = nullify({
    id: incoming.id,
    client_id,
    name: incoming.name ?? 'Proiect nou',
    status: incoming.status ?? 'CIORNA',
    current_stage: incoming.current_stage,
    methodology_version: incoming.methodology_version ?? 'v1.1',
    completion_progress: incoming.completion_progress,
    start_date: incoming.start_date,
    target_end_date: incoming.target_end_date,
    consultant_owner: incoming.consultant_owner,
    created_at: ts,
    updated_at: ts,
  }, ['current_stage', 'completion_progress', 'start_date', 'target_end_date', 'consultant_owner'])
  upsertProject.run(row)
  res.status(201).json(getProjectRow(incoming.id))
})

app.get('/api/projects/:id', (req, res) => {
  const project = getProjectRow(req.params.id)
  if (!project) return res.status(404).json({ error: 'project not found' })
  const client = getClientRow((project as { client_id: string }).client_id)
  const ebit = getEbitRow(req.params.id) ?? null
  const maturity = getMaturityRows(req.params.id)
  const processes = db.prepare('SELECT * FROM Process WHERE project_id = ? ORDER BY created_at').all(req.params.id)
  const problems = db.prepare('SELECT * FROM Problem WHERE project_id = ? ORDER BY created_at').all(req.params.id)
  const opportunities = db.prepare('SELECT * FROM Opportunity WHERE project_id = ? ORDER BY created_at').all(req.params.id)
  res.json({ project, client, ebitBaseline: ebit, maturityIndicators: maturity,
             processes, problems, opportunities })
})

app.put('/api/projects/:id', (req, res) => {
  const id = req.params.id
  const existing = getProjectRow(id) as Record<string, unknown> | undefined
  const incoming = req.body ?? {}
  const created_at = (existing?.created_at as string) ?? incoming.created_at ?? now()
  const row = nullify({
    id,
    client_id: incoming.client_id ?? existing?.client_id ?? 'local-client',
    name: incoming.name ?? existing?.name ?? 'Proiect',
    status: incoming.status ?? existing?.status ?? 'CIORNA',
    current_stage: incoming.current_stage,
    methodology_version: incoming.methodology_version ?? existing?.methodology_version ?? 'v1.1',
    completion_progress: incoming.completion_progress,
    start_date: incoming.start_date,
    target_end_date: incoming.target_end_date,
    consultant_owner: incoming.consultant_owner,
    created_at,
    updated_at: now(),
  }, ['current_stage', 'completion_progress', 'start_date', 'target_end_date', 'consultant_owner'])
  upsertProject.run(row)
  res.json(getProjectRow(id))
})

app.put('/api/projects/:id/status', (req, res) => {
  const id = req.params.id
  const existing = getProjectRow(id) as Record<string, unknown> | undefined
  if (!existing) return res.status(404).json({ error: 'project not found' })
  const { status, validation_time_seconds } = req.body ?? {}
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status required' })
  }
  const validatedAt = status === 'ASTEAPTA_APROBARE' ? now() : (existing.validated_at ?? null)
  db.prepare(`
    UPDATE Project
    SET status = ?, validation_time_seconds = COALESCE(?, validation_time_seconds),
        validated_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    status,
    typeof validation_time_seconds === 'number' ? validation_time_seconds : null,
    validatedAt,
    now(),
    id,
  )
  res.json(getProjectRow(id))
})

app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM Project WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.put('/api/projects/:id/ebit', (req, res) => {
  const project_id = req.params.id
  if (!getProjectRow(project_id)) return res.status(404).json({ error: 'project not found' })
  const incoming = (req.body ?? {}) as Record<string, unknown>
  const existing = (getEbitRow(project_id) ?? {}) as Record<string, unknown>

  // MERGE behavior: pentru fiecare câmp, folosim incoming doar dacă a fost
  // transmis explicit (prezent ca own property — fie cu valoare, fie null).
  // Câmpurile absente din payload păstrează valoarea existentă. Asta împiedică
  // paginile cockpit care editează un subset să şteargă celelalte câmpuri
  // (ex.: pag. 2 nu atinge change_management_spend_current).
  const pick = (key: string, fallback: unknown = null) =>
    Object.prototype.hasOwnProperty.call(incoming, key)
      ? incoming[key] ?? null
      : (existing[key] ?? fallback)

  const created_at = (existing.created_at as string | undefined) ?? now()
  const row = {
    id: (incoming.id as string | undefined) ?? (existing.id as string | undefined) ?? `ebit-${project_id}`,
    project_id,
    annual_revenue: pick('annual_revenue'),
    operational_costs: pick('operational_costs'),
    ebit_current: pick('ebit_current'),
    ebit_margin_current: pick('ebit_margin_current'),
    ebit_target: pick('ebit_target'),
    ebit_target_delta_percent: pick('ebit_target_delta_percent'),
    it_spend_current: pick('it_spend_current'),
    change_management_spend_current: pick('change_management_spend_current'),
    rule_1_to_1_ratio: pick('rule_1_to_1_ratio'),
    financial_notes: pick('financial_notes'),
    confidence: pick('confidence'),
    confidence_level: pick('confidence_level'),
    data_source: pick('data_source'),
    created_at,
    updated_at: now(),
  }
  upsertEbit.run(row)
  res.json(getEbitRow(project_id))
})

app.delete('/api/projects/:id/ebit', (req, res) => {
  db.prepare('DELETE FROM EBITBaseline WHERE project_id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.put('/api/projects/:id/maturity', (req, res) => {
  const project_id = req.params.id
  if (!getProjectRow(project_id)) return res.status(404).json({ error: 'project not found' })
  const indicators: Array<Record<string, unknown>> = Array.isArray(req.body) ? req.body : (req.body?.indicators ?? [])
  const tx = db.transaction((items: Array<Record<string, unknown>>) => {
    for (const ind of items) {
      const existing = db.prepare('SELECT created_at FROM MaturityIndicator WHERE project_id = ? AND indicator_code = ?')
        .get(project_id, ind.indicator_code) as { created_at?: string } | undefined
      const created_at = existing?.created_at ?? now()
      const row = nullify({
        id: ind.id ?? `${project_id}-${ind.indicator_code}`,
        project_id,
        indicator_code: ind.indicator_code,
        indicator_name: ind.indicator_name,
        area: ind.area,
        raw_input_json: ind.raw_input_json,
        score: ind.score,
        calculation_method: ind.calculation_method,
        consultant_comment: ind.consultant_comment,
        confidence: ind.confidence,
        confidence_level: ind.confidence_level,
        data_source: ind.data_source,
        created_at,
        updated_at: now(),
      }, ['indicator_name', 'area', 'raw_input_json', 'score', 'calculation_method',
          'consultant_comment', 'confidence', 'confidence_level', 'data_source'])
      upsertIndicator.run(row)
    }
  })
  tx(indicators)
  res.json(getMaturityRows(project_id))
})

// ─── F4: Process / Problem / Opportunity CRUD ────────────────────────────────
// PUT = replace all pentru proiect (delete + re-insert în tranzacţie).
// GET = listă ordonată după created_at.

function makeCrud<Row extends Record<string, unknown>>(
  table: 'Process' | 'Problem' | 'Opportunity',
  fields: string[],
) {
  const selectAll = db.prepare(`SELECT * FROM ${table} WHERE project_id = ? ORDER BY created_at`)
  const deleteAll = db.prepare(`DELETE FROM ${table} WHERE project_id = ?`)
  const insertCols = ['id', 'project_id', ...fields, 'created_at', 'updated_at']
  const placeholders = insertCols.map((c) => '@' + c).join(', ')
  const insert = db.prepare(`INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${placeholders})`)
  return {
    list: (projectId: string) => selectAll.all(projectId) as Row[],
    replace: (projectId: string, items: Array<Record<string, unknown>>) => {
      const tx = db.transaction(() => {
        deleteAll.run(projectId)
        const ts = now()
        items.forEach((item, i) => {
          const row: Record<string, unknown> = {
            id: (typeof item.id === 'string' && item.id) ? item.id : `${projectId}-${table.toLowerCase()}-${Date.now()}-${i}`,
            project_id: projectId,
            created_at: (typeof item.created_at === 'string' && item.created_at) ? item.created_at : ts,
            updated_at: ts,
          }
          for (const f of fields) row[f] = item[f] ?? null
          insert.run(row)
        })
      })
      tx()
      return selectAll.all(projectId) as Row[]
    },
  }
}

const processCrud = makeCrud('Process', [
  'name', 'description', 'time_execution', 'cost_estimated',
  'blocking_score', 'ebit_impact', 'citation',
  'confidence', 'confidence_level', 'data_source',
])
const problemCrud = makeCrud('Problem', [
  'title', 'description', 'financial_impact', 'root_cause',
  'linked_indicators', 'citation',
  'confidence', 'confidence_level', 'data_source',
])
const opportunityCrud = makeCrud('Opportunity', [
  'title', 'type', 'ebit_impact_estimated', 'effort', 'risk', 'citation',
  'confidence', 'confidence_level', 'data_source',
])

app.get('/api/projects/:id/processes', (req, res) => {
  if (!getProjectRow(req.params.id)) return res.status(404).json({ error: 'project not found' })
  res.json(processCrud.list(req.params.id))
})
app.put('/api/projects/:id/processes', (req, res) => {
  if (!getProjectRow(req.params.id)) return res.status(404).json({ error: 'project not found' })
  const items = Array.isArray(req.body) ? req.body : []
  res.json(processCrud.replace(req.params.id, items))
})

app.get('/api/projects/:id/problems', (req, res) => {
  if (!getProjectRow(req.params.id)) return res.status(404).json({ error: 'project not found' })
  res.json(problemCrud.list(req.params.id))
})
app.put('/api/projects/:id/problems', (req, res) => {
  if (!getProjectRow(req.params.id)) return res.status(404).json({ error: 'project not found' })
  const items = Array.isArray(req.body) ? req.body : []
  res.json(problemCrud.replace(req.params.id, items))
})

app.get('/api/projects/:id/opportunities', (req, res) => {
  if (!getProjectRow(req.params.id)) return res.status(404).json({ error: 'project not found' })
  res.json(opportunityCrud.list(req.params.id))
})
app.put('/api/projects/:id/opportunities', (req, res) => {
  if (!getProjectRow(req.params.id)) return res.status(404).json({ error: 'project not found' })
  const items = Array.isArray(req.body) ? req.body : []
  res.json(opportunityCrud.replace(req.params.id, items))
})

// ─── POST /api/projects/:id/ingest ───────────────────────────────────────────
// Primeşte un AgentCTDOutput (sau subset) şi populează proiectul complet.
// Suprascrie EBIT, indicatori, procese, probleme, oportunităţi — în tranzacţie.
app.post('/api/projects/:id/ingest', (req, res) => {
  const project_id = req.params.id
  if (!getProjectRow(project_id)) return res.status(404).json({ error: 'project not found' })
  const payload = req.body ?? {}

  const tx = db.transaction(() => {
    const ts = now()

    // EBIT
    if (payload.date_financiare) {
      const df = payload.date_financiare
      const existing = getEbitRow(project_id) as Record<string, unknown> | undefined
      upsertEbit.run(nullify({
        id: existing?.id ?? `ebit-${project_id}`,
        project_id,
        annual_revenue: df.venituri, operational_costs: df.costuri_operationale,
        ebit_current: df.ebit_curent, ebit_margin_current: df.marja_ebit,
        ebit_target: df.ebit_target, ebit_target_delta_percent: null,
        it_spend_current: df.cost_it, change_management_spend_current: null,
        rule_1_to_1_ratio: null, financial_notes: null,
        confidence: df.confidence?.confidence, confidence_level: df.confidence?.confidence_level,
        data_source: df.confidence?.data_source,
        created_at: (existing?.created_at as string) ?? ts, updated_at: ts,
      }, ['annual_revenue', 'operational_costs', 'ebit_current', 'ebit_margin_current',
          'ebit_target', 'ebit_target_delta_percent', 'it_spend_current',
          'change_management_spend_current', 'rule_1_to_1_ratio', 'financial_notes',
          'confidence', 'confidence_level', 'data_source']))
    }

    // Indicatori
    if (Array.isArray(payload.indicatori)) {
      for (const ind of payload.indicatori as Array<Record<string, unknown>>) {
        const code = ind.cod ?? ind.indicator_code
        if (typeof code !== 'string') continue
        const existing = db.prepare('SELECT created_at FROM MaturityIndicator WHERE project_id = ? AND indicator_code = ?')
          .get(project_id, code) as { created_at?: string } | undefined
        const conf = (ind.confidence ?? {}) as Record<string, unknown>
        upsertIndicator.run(nullify({
          id: `${project_id}-${code}`, project_id,
          indicator_code: code, indicator_name: ind.nume ?? ind.indicator_name ?? null,
          area: ind.arie ?? ind.area ?? null,
          raw_input_json: ind.raw_input_json ?? (ind.raw_input ? JSON.stringify(ind.raw_input) : null),
          score: ind.scor ?? ind.score ?? null,
          calculation_method: ind.calculation_method ?? null,
          consultant_comment: ind.comentariu ?? ind.consultant_comment ?? null,
          confidence: conf.confidence, confidence_level: conf.confidence_level,
          data_source: conf.data_source,
          created_at: existing?.created_at ?? ts, updated_at: ts,
        }, ['indicator_name', 'area', 'raw_input_json', 'score', 'calculation_method',
            'consultant_comment', 'confidence', 'confidence_level', 'data_source']))
      }
    }

    // Procese
    if (Array.isArray(payload.procese)) {
      const mapped = (payload.procese as Array<Record<string, unknown>>).map((p) => {
        const conf = (p.confidence ?? {}) as Record<string, unknown>
        return {
          name: p.nume ?? p.name, description: p.descriere ?? p.description,
          time_execution: p.timp_executie ?? p.time_execution,
          cost_estimated: p.cost_estimat ?? p.cost_estimated,
          blocking_score: p.grad_blocare ?? p.blocking_score,
          ebit_impact: p.impact_ebit ?? p.ebit_impact,
          citation: p.citat ?? p.citation,
          confidence: conf.confidence, confidence_level: conf.confidence_level,
          data_source: conf.data_source,
        }
      })
      processCrud.replace(project_id, mapped)
    }

    // Probleme
    if (Array.isArray(payload.probleme)) {
      const mapped = (payload.probleme as Array<Record<string, unknown>>).map((p) => {
        const conf = (p.confidence ?? {}) as Record<string, unknown>
        const linked = p.indicatori_legati ?? p.linked_indicators
        return {
          title: p.titlu ?? p.title, description: p.descriere ?? p.description,
          financial_impact: p.impact_financiar ?? p.financial_impact,
          root_cause: p.cauza_radacina ?? p.root_cause,
          linked_indicators: Array.isArray(linked) ? JSON.stringify(linked) : linked,
          citation: p.citat ?? p.citation,
          confidence: conf.confidence, confidence_level: conf.confidence_level,
          data_source: conf.data_source,
        }
      })
      problemCrud.replace(project_id, mapped)
    }

    // Oportunităţi
    if (Array.isArray(payload.oportunitati)) {
      const mapped = (payload.oportunitati as Array<Record<string, unknown>>).map((o) => {
        const conf = (o.confidence ?? {}) as Record<string, unknown>
        return {
          title: o.titlu ?? o.title, type: o.tip ?? o.type,
          ebit_impact_estimated: o.impact_ebit_estimat ?? o.ebit_impact_estimated,
          effort: o.efort ?? o.effort, risk: o.risc ?? o.risk,
          citation: o.citat ?? o.citation,
          confidence: conf.confidence, confidence_level: conf.confidence_level,
          data_source: conf.data_source,
        }
      })
      opportunityCrud.replace(project_id, mapped)
    }
  })
  tx()

  res.json({
    project: getProjectRow(project_id),
    ebitBaseline: getEbitRow(project_id),
    maturityIndicators: getMaturityRows(project_id),
    processes: processCrud.list(project_id),
    problems: problemCrud.list(project_id),
    opportunities: opportunityCrud.list(project_id),
  })
})

app.listen(PORT, () => {
  console.log(`[server] ACDA API listening on http://localhost:${PORT}`)
})

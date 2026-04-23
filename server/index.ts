import express from 'express'
import cors from 'cors'
import type { PoolClient } from 'pg'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { getPool, initPostgres } from '../database/pg.js'
import { createGDriveRouter } from './gdrive.js'
import { cfAccessMiddleware } from './middleware/cf-access.js'

const PORT = Number(process.env.PORT ?? 3001)

const app = express()
app.use(cors())
// Payload-urile de upload PDF ajung la ~2-5 MB base64; majorăm limita.
app.use(express.json({ limit: '25mb' }))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

async function getProjectRow(id: string) {
  const r = await getPool().query('SELECT * FROM ctd_projects WHERE id = $1', [id])
  return r.rows[0] ?? null
}
async function getClientRow(id: string) {
  const r = await getPool().query('SELECT * FROM ctd_clients WHERE id = $1', [id])
  return r.rows[0] ?? null
}
async function getEbitRow(projectId: string) {
  const r = await getPool().query('SELECT * FROM ctd_ebit_baselines WHERE project_id = $1', [projectId])
  return r.rows[0] ?? null
}
async function getMaturityRows(projectId: string) {
  const r = await getPool().query(
    'SELECT * FROM ctd_maturity_indicators WHERE project_id = $1 ORDER BY indicator_code',
    [projectId],
  )
  return r.rows
}

async function upsertProject(row: Record<string, unknown>, client?: PoolClient): Promise<void> {
  const q = client ?? getPool()
  await q.query(`
    INSERT INTO ctd_projects (id, client_id, name, status, current_stage, methodology_version,
      completion_progress, start_date, target_end_date, consultant_owner, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (id) DO UPDATE SET
      client_id=excluded.client_id, name=excluded.name, status=excluded.status,
      current_stage=excluded.current_stage, methodology_version=excluded.methodology_version,
      completion_progress=excluded.completion_progress, start_date=excluded.start_date,
      target_end_date=excluded.target_end_date, consultant_owner=excluded.consultant_owner,
      updated_at=excluded.updated_at
  `, [
    row.id, row.client_id, row.name, row.status, row.current_stage, row.methodology_version,
    row.completion_progress, row.start_date, row.target_end_date, row.consultant_owner,
    row.created_at, row.updated_at,
  ])
}

async function upsertEbit(row: Record<string, unknown>, client?: PoolClient): Promise<void> {
  const q = client ?? getPool()
  await q.query(`
    INSERT INTO ctd_ebit_baselines (id, project_id, annual_revenue, operational_costs, ebit_current,
      ebit_margin_current, ebit_target, ebit_target_delta_percent, it_spend_current,
      change_management_spend_current, rule_1_to_1_ratio, financial_notes,
      confidence, confidence_level, data_source, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (project_id) DO UPDATE SET
      annual_revenue=excluded.annual_revenue, operational_costs=excluded.operational_costs,
      ebit_current=excluded.ebit_current, ebit_margin_current=excluded.ebit_margin_current,
      ebit_target=excluded.ebit_target, ebit_target_delta_percent=excluded.ebit_target_delta_percent,
      it_spend_current=excluded.it_spend_current,
      change_management_spend_current=excluded.change_management_spend_current,
      rule_1_to_1_ratio=excluded.rule_1_to_1_ratio, financial_notes=excluded.financial_notes,
      confidence=excluded.confidence, confidence_level=excluded.confidence_level,
      data_source=excluded.data_source, updated_at=excluded.updated_at
  `, [
    row.id, row.project_id, row.annual_revenue, row.operational_costs, row.ebit_current,
    row.ebit_margin_current, row.ebit_target, row.ebit_target_delta_percent, row.it_spend_current,
    row.change_management_spend_current, row.rule_1_to_1_ratio, row.financial_notes,
    row.confidence, row.confidence_level, row.data_source, row.created_at, row.updated_at,
  ])
}

async function upsertIndicator(row: Record<string, unknown>, client?: PoolClient): Promise<void> {
  const q = client ?? getPool()
  await q.query(`
    INSERT INTO ctd_maturity_indicators (id, project_id, indicator_code, indicator_name, area,
      raw_input_json, score, calculation_method, consultant_comment,
      confidence, confidence_level, data_source, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (project_id, indicator_code) DO UPDATE SET
      indicator_name=excluded.indicator_name, area=excluded.area,
      raw_input_json=excluded.raw_input_json, score=excluded.score,
      calculation_method=excluded.calculation_method, consultant_comment=excluded.consultant_comment,
      confidence=excluded.confidence, confidence_level=excluded.confidence_level,
      data_source=excluded.data_source, updated_at=excluded.updated_at
  `, [
    row.id, row.project_id, row.indicator_code, row.indicator_name, row.area,
    row.raw_input_json, row.score, row.calculation_method, row.consultant_comment,
    row.confidence, row.confidence_level, row.data_source, row.created_at, row.updated_at,
  ])
}

function nullify<T extends Record<string, unknown>>(obj: T, keys: string[]): T {
  const out = { ...obj } as Record<string, unknown>
  for (const k of keys) if (out[k] === undefined) out[k] = null
  return out as T
}

// ─── CRUD factory pentru Process/Problem/Opportunity ─────────────────────────

type OpRepoTable = 'ctd_processes' | 'ctd_problems' | 'ctd_opportunities'

function makeCrud<Row extends Record<string, unknown>>(table: OpRepoTable, fields: string[]) {
  const cols = ['id', 'project_id', ...fields, 'created_at', 'updated_at']
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')

  return {
    async list(projectId: string): Promise<Row[]> {
      const r = await getPool().query(
        `SELECT * FROM ${table} WHERE project_id = $1 ORDER BY created_at`,
        [projectId],
      )
      return r.rows as Row[]
    },
    async replace(projectId: string, items: Array<Record<string, unknown>>): Promise<Row[]> {
      const client = await getPool().connect()
      try {
        await client.query('BEGIN')
        await client.query(`DELETE FROM ${table} WHERE project_id = $1`, [projectId])
        const ts = now()
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const id = (typeof item.id === 'string' && item.id)
            ? item.id
            : `${projectId}-${table.replace('ctd_', '').slice(0, -1)}-${Date.now()}-${i}`
          const created_at = (typeof item.created_at === 'string' && item.created_at) ? item.created_at : ts
          const values: unknown[] = [id, projectId]
          for (const f of fields) values.push(item[f] ?? null)
          values.push(created_at, ts)
          await client.query(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
            values,
          )
        }
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
      const r = await getPool().query(
        `SELECT * FROM ${table} WHERE project_id = $1 ORDER BY created_at`,
        [projectId],
      )
      return r.rows as Row[]
    },
  }
}

const processCrud = makeCrud('ctd_processes', [
  'name', 'description', 'time_execution', 'cost_estimated',
  'blocking_score', 'ebit_impact', 'citation',
  'confidence', 'confidence_level', 'data_source',
])
const problemCrud = makeCrud('ctd_problems', [
  'title', 'description', 'financial_impact', 'root_cause',
  'linked_indicators', 'citation',
  'confidence', 'confidence_level', 'data_source',
])
const opportunityCrud = makeCrud('ctd_opportunities', [
  'title', 'type', 'ebit_impact_estimated', 'effort', 'risk', 'citation',
  'confidence', 'confidence_level', 'data_source',
])

// ─── Middleware CF Access pentru /api/* ──────────────────────────────────────
// Aplicat doar pe rutele API (nu pe static) — CF Access blochează oricum la edge.
// Dev local (localhost): middleware e no-op (NODE_ENV !== 'production').

app.use('/api', cfAccessMiddleware)

// ─── GDrive router — OAuth2 + upload CTD/{clientName}/. Gracefully 503 dacă
// credentials lipsesc (startup log indică ENABLED/DISABLED). Vezi server/gdrive.ts.
app.use('/api/gdrive', createGDriveRouter())

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    const r = await getPool().query('SELECT 1 AS ok')
    res.json({ ok: true, db: r.rows[0].ok === 1 ? 'ok' : 'fail' })
  } catch (err) {
    res.status(503).json({ ok: false, db: 'fail', error: err instanceof Error ? err.message : 'unknown' })
  }
})

app.get('/api/projects', async (_req, res) => {
  const { rows: projects } = await getPool().query(`
    SELECT p.*, c.company_name AS client_company_name
    FROM ctd_projects p
    LEFT JOIN ctd_clients c ON c.id = p.client_id
    ORDER BY p.updated_at DESC
  `)
  const enriched = []
  for (const p of projects) {
    const inds = await getPool().query(
      'SELECT indicator_code, score FROM ctd_maturity_indicators WHERE project_id = $1 AND score IS NOT NULL',
      [p.id],
    )
    enriched.push({ ...p, indicator_scores: inds.rows })
  }
  res.json(enriched)
})

app.post('/api/projects', async (req, res) => {
  const incoming = req.body ?? {}
  if (!incoming.id || typeof incoming.id !== 'string') {
    return res.status(400).json({ error: 'id required' })
  }
  if (await getProjectRow(incoming.id)) {
    return res.status(409).json({ error: 'project already exists' })
  }
  const client_id = incoming.client_id ?? `c-${incoming.id}`
  const ts = now()

  const pgClient = await getPool().connect()
  try {
    await pgClient.query('BEGIN')
    const existingClient = await pgClient.query('SELECT 1 FROM ctd_clients WHERE id = $1', [client_id])
    if ((existingClient.rowCount ?? 0) === 0) {
      await pgClient.query(
        `INSERT INTO ctd_clients (id, company_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4)`,
        [client_id, incoming.client_company_name ?? 'Client nou', ts, ts],
      )
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
    await upsertProject(row, pgClient)
    await pgClient.query('COMMIT')
  } catch (err) {
    await pgClient.query('ROLLBACK')
    throw err
  } finally {
    pgClient.release()
  }
  res.status(201).json(await getProjectRow(incoming.id))
})

app.get('/api/projects/:id', async (req, res) => {
  const project = await getProjectRow(req.params.id)
  if (!project) return res.status(404).json({ error: 'project not found' })
  const client = await getClientRow(project.client_id)
  const ebit = await getEbitRow(req.params.id)
  const maturity = await getMaturityRows(req.params.id)
  const processes = await processCrud.list(req.params.id)
  const problems = await problemCrud.list(req.params.id)
  const opportunities = await opportunityCrud.list(req.params.id)
  res.json({
    project, client, ebitBaseline: ebit, maturityIndicators: maturity,
    processes, problems, opportunities,
  })
})

app.put('/api/projects/:id', async (req, res) => {
  const id = req.params.id
  const existing = await getProjectRow(id)
  const incoming = req.body ?? {}
  const created_at = existing?.created_at ?? incoming.created_at ?? now()
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
  await upsertProject(row)
  res.json(await getProjectRow(id))
})

app.put('/api/projects/:id/status', async (req, res) => {
  const id = req.params.id
  const existing = await getProjectRow(id)
  if (!existing) return res.status(404).json({ error: 'project not found' })
  const { status, validation_time_seconds } = req.body ?? {}
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status required' })
  }
  const validatedAt = status === 'ASTEAPTA_APROBARE' ? now() : (existing.validated_at ?? null)
  await getPool().query(`
    UPDATE ctd_projects
    SET status = $1, validation_time_seconds = COALESCE($2, validation_time_seconds),
        validated_at = $3, updated_at = $4
    WHERE id = $5
  `, [
    status,
    typeof validation_time_seconds === 'number' ? validation_time_seconds : null,
    validatedAt,
    now(),
    id,
  ])
  res.json(await getProjectRow(id))
})

app.delete('/api/projects/:id', async (req, res) => {
  await getPool().query('DELETE FROM ctd_projects WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

app.put('/api/projects/:id/ebit', async (req, res) => {
  const project_id = req.params.id
  if (!(await getProjectRow(project_id))) return res.status(404).json({ error: 'project not found' })
  const incoming = (req.body ?? {}) as Record<string, unknown>
  const existing = (await getEbitRow(project_id) ?? {}) as Record<string, unknown>

  // MERGE: null/undefined din incoming nu suprascrie DB.
  const pick = (key: string) =>
    (incoming[key] !== undefined && incoming[key] !== null)
      ? incoming[key]
      : (existing[key] ?? null)

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
  await upsertEbit(row)
  res.json(await getEbitRow(project_id))
})

app.delete('/api/projects/:id/ebit', async (req, res) => {
  await getPool().query('DELETE FROM ctd_ebit_baselines WHERE project_id = $1', [req.params.id])
  res.json({ ok: true })
})

app.put('/api/projects/:id/maturity', async (req, res) => {
  const project_id = req.params.id
  if (!(await getProjectRow(project_id))) return res.status(404).json({ error: 'project not found' })
  const indicators: Array<Record<string, unknown>> = Array.isArray(req.body) ? req.body : (req.body?.indicators ?? [])
  const pgClient = await getPool().connect()
  try {
    await pgClient.query('BEGIN')
    for (const ind of indicators) {
      const existingRow = await pgClient.query(
        'SELECT created_at FROM ctd_maturity_indicators WHERE project_id = $1 AND indicator_code = $2',
        [project_id, ind.indicator_code],
      )
      const existing = existingRow.rows[0]
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
      await upsertIndicator(row, pgClient)
    }
    await pgClient.query('COMMIT')
  } catch (err) {
    await pgClient.query('ROLLBACK')
    throw err
  } finally {
    pgClient.release()
  }
  res.json(await getMaturityRows(project_id))
})

// ─── Process / Problem / Opportunity CRUD ────────────────────────────────────

app.get('/api/projects/:id/processes', async (req, res) => {
  if (!(await getProjectRow(req.params.id))) return res.status(404).json({ error: 'project not found' })
  res.json(await processCrud.list(req.params.id))
})
app.put('/api/projects/:id/processes', async (req, res) => {
  if (!(await getProjectRow(req.params.id))) return res.status(404).json({ error: 'project not found' })
  const items = Array.isArray(req.body) ? req.body : []
  res.json(await processCrud.replace(req.params.id, items))
})

app.get('/api/projects/:id/problems', async (req, res) => {
  if (!(await getProjectRow(req.params.id))) return res.status(404).json({ error: 'project not found' })
  res.json(await problemCrud.list(req.params.id))
})
app.put('/api/projects/:id/problems', async (req, res) => {
  if (!(await getProjectRow(req.params.id))) return res.status(404).json({ error: 'project not found' })
  const items = Array.isArray(req.body) ? req.body : []
  res.json(await problemCrud.replace(req.params.id, items))
})

app.get('/api/projects/:id/opportunities', async (req, res) => {
  if (!(await getProjectRow(req.params.id))) return res.status(404).json({ error: 'project not found' })
  res.json(await opportunityCrud.list(req.params.id))
})
app.put('/api/projects/:id/opportunities', async (req, res) => {
  if (!(await getProjectRow(req.params.id))) return res.status(404).json({ error: 'project not found' })
  const items = Array.isArray(req.body) ? req.body : []
  res.json(await opportunityCrud.replace(req.params.id, items))
})

// ─── POST /api/projects/:id/ingest ───────────────────────────────────────────
app.post('/api/projects/:id/ingest', async (req, res) => {
  const project_id = req.params.id
  if (!(await getProjectRow(project_id))) return res.status(404).json({ error: 'project not found' })
  const payload = req.body ?? {}

  const pgClient = await getPool().connect()
  try {
    await pgClient.query('BEGIN')
    const ts = now()

    // EBIT
    if (payload.date_financiare) {
      const df = payload.date_financiare
      const existingEbit = await pgClient.query(
        'SELECT id, created_at FROM ctd_ebit_baselines WHERE project_id = $1', [project_id])
      const existing = existingEbit.rows[0]
      await upsertEbit(nullify({
        id: existing?.id ?? `ebit-${project_id}`,
        project_id,
        annual_revenue: df.venituri, operational_costs: df.costuri_operationale,
        ebit_current: df.ebit_curent, ebit_margin_current: df.marja_ebit,
        ebit_target: df.ebit_target, ebit_target_delta_percent: null,
        it_spend_current: df.cost_it, change_management_spend_current: null,
        rule_1_to_1_ratio: null, financial_notes: null,
        confidence: df.confidence?.confidence, confidence_level: df.confidence?.confidence_level,
        data_source: df.confidence?.data_source,
        created_at: existing?.created_at ?? ts, updated_at: ts,
      }, ['annual_revenue', 'operational_costs', 'ebit_current', 'ebit_margin_current',
          'ebit_target', 'ebit_target_delta_percent', 'it_spend_current',
          'change_management_spend_current', 'rule_1_to_1_ratio', 'financial_notes',
          'confidence', 'confidence_level', 'data_source']), pgClient)
    }

    // Indicatori
    if (Array.isArray(payload.indicatori)) {
      for (const ind of payload.indicatori as Array<Record<string, unknown>>) {
        const code = ind.cod ?? ind.indicator_code
        if (typeof code !== 'string') continue
        const existingInd = await pgClient.query(
          'SELECT created_at FROM ctd_maturity_indicators WHERE project_id = $1 AND indicator_code = $2',
          [project_id, code])
        const existing = existingInd.rows[0]
        const conf = (ind.confidence ?? {}) as Record<string, unknown>
        await upsertIndicator(nullify({
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
            'consultant_comment', 'confidence', 'confidence_level', 'data_source']), pgClient)
      }
    }

    await pgClient.query('COMMIT')
  } catch (err) {
    await pgClient.query('ROLLBACK')
    throw err
  } finally {
    pgClient.release()
  }

  // Process/Problem/Opportunity → replace în afara tranzacției principale
  // (replace folosește propria tranzacție per tabel).
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
    await processCrud.replace(project_id, mapped)
  }

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
    await problemCrud.replace(project_id, mapped)
  }

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
    await opportunityCrud.replace(project_id, mapped)
  }

  res.json({
    project: await getProjectRow(project_id),
    ebitBaseline: await getEbitRow(project_id),
    maturityIndicators: await getMaturityRows(project_id),
    processes: await processCrud.list(project_id),
    problems: await problemCrud.list(project_id),
    opportunities: await opportunityCrud.list(project_id),
  })
})

// ─── Static frontend (container unic) ────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_PATH = path.resolve(__dirname, '../dist')
if (existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'))
  })
  console.log(`[server] Serving static dist/ from ${DIST_PATH}`)
}

// ─── Startup: init PG + listen ───────────────────────────────────────────────

async function main() {
  console.log(`[server] Bootstrapping — NODE_ENV=${process.env.NODE_ENV ?? 'development'}`)

  try {
    await initPostgres()
  } catch (err) {
    console.error('[server] FATAL: PG init failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`[server] ACDA CTD API listening on http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error('[server] FATAL bootstrap error:', err)
  process.exit(1)
})

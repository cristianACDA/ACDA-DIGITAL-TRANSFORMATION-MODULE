// ACDA CTD — PostgreSQL connection pool + idempotent schema/seed bootstrap.
// v0.2.0-cloudsql: Cloud SQL acda_prod (acda-os-sso:europe-west1:acda-prod).
// Prod Cloud Run: unix socket /cloudsql/<conn>/.s.PGSQL.5432 (via --add-cloudsql-instances).
// Dev local: cloud-sql-proxy --port=5432 → TCP 127.0.0.1:5432.

import { Pool, type PoolConfig } from 'pg'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function buildPoolConfig(): PoolConfig {
  const urlRaw = process.env.DATABASE_URL
  const password = process.env.ACDA_PG_PASSWORD

  if (!urlRaw) {
    throw new Error('[pg] DATABASE_URL env var missing')
  }
  if (!password) {
    throw new Error('[pg] ACDA_PG_PASSWORD env var missing (Secret Manager acda-cloudsql-password)')
  }

  // Unix socket dialect: postgresql://user@/db?host=/cloudsql/<conn>
  if (urlRaw.includes('host=/cloudsql/')) {
    const match = urlRaw.match(/postgresql:\/\/([^@]+)@\/([^?]+)\?host=(.+)$/)
    if (!match) throw new Error('[pg] Invalid unix socket DATABASE_URL')
    const [, user, database, host] = match
    return {
      host: decodeURIComponent(host),
      user: decodeURIComponent(user),
      database: decodeURIComponent(database),
      password,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    }
  }

  const url = new URL(urlRaw)
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    database: url.pathname.replace(/^\//, ''),
    password,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  }
}

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig())
    pool.on('error', (err) => {
      console.error('[pg] idle client error:', err.message)
    })
  }
  return pool
}

// ─── Schema bootstrap ────────────────────────────────────────────────────────

const SCHEMA_PATH = resolve(__dirname, 'migrations/001_ctd_schema.sql')

async function applySchema(): Promise<void> {
  const sql = readFileSync(SCHEMA_PATH, 'utf-8')
  await getPool().query(sql)
  console.log('[pg] schema 001_ctd_schema.sql applied (idempotent)')
}

// ─── Seed CloudServe SRL (idempotent) ────────────────────────────────────────

const SEED_CLIENT_ID = 'c-cloudserve'
const SEED_PROJECT_ID = 'p-cloudserve-001'

interface IndicatorSeed {
  code: string
  name: string
  area: string
  score: number
  raw_input: unknown
  confidence: number
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW'
  data_source: string
  consultant_comment: string
}

const SEED_INDICATORS: IndicatorSeed[] = [
  { code: 'O1', name: 'Regula 1:1', area: 'Oameni & Adopție', score: 1,
    raw_input: { adoptie: 10000, tech: 1450000 },
    confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Buget adoptie aproape inexistent. 95% din buget merge pe dezvoltare si infrastructura.' },
  { code: 'O2', name: 'Densitatea Talentului', area: 'Oameni & Adopție', score: 3,
    raw_input: { executanti: 36, manageri: 12 },
    confidence: 0.80, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Raport executanti/manageri ~3:1. Echipa competenta dar fara experienta AI/ML.' },
  { code: 'O3', name: 'Riscul de Instruire', area: 'Oameni & Adopție', score: 2,
    raw_input: { areRisc: true, nivel: 3 },
    confidence: 0.75, confidence_level: 'MEDIUM', data_source: 'transcriere_whisper',
    consultant_comment: 'Nu exista program formal de training. Risc ridicat: echipa fara competente AI/ML.' },
  { code: 'T1', name: 'Data Products', area: 'Tehnologie & Date', score: 2,
    raw_input: { procent: 15 },
    confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Date exista (320 clienti) dar nu sunt structurate ca produse. Un singur PostgreSQL monolitic.' },
  { code: 'T2', name: 'API-First', area: 'Tehnologie & Date', score: 3,
    raw_input: { procent: 40 },
    confidence: 0.80, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'CloudCRM are API public REST, ~40% functionalitati expuse. Sistemele interne nu au API-uri.' },
  { code: 'T3', name: 'Assetizare', area: 'Tehnologie & Date', score: 2,
    raw_input: { procent: 15 },
    confidence: 0.90, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Cod monolitic, nimic reutilizabil. Nu exista biblioteci interne sau microservicii.' },
  { code: 'S1', name: 'Focusul EBIT', area: 'Strategie & ROI', score: 1,
    raw_input: { areTarget: false, procentInitiative: 0 },
    confidence: 0.90, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Nicio initiativa cu target EBIT. CEO gandeste in MRR si headcount, nu in profitabilitate.' },
  { code: 'S2', name: 'Validarea Capstone', area: 'Strategie & ROI', score: 1,
    raw_input: { stadiu: 'NU' },
    confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Zero piloturi structurate. Nu exista concept de capstone sau ROI tracking.' },
  { code: 'S3', name: 'Trustworthy AI', area: 'Strategie & ROI', score: 1,
    raw_input: { procent: 5 },
    confidence: 0.95, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Zero AI governance. Normal — nu folosesc AI inca.' },
]

async function seedCloudServe(): Promise<void> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    const projectExists = await client.query(
      'SELECT 1 FROM ctd_projects WHERE id = $1',
      [SEED_PROJECT_ID],
    )

    if ((projectExists.rowCount ?? 0) > 0) {
      // Proiectul există — backfill doar pe tabele F4 dacă lipsesc rânduri (pattern din init.ts).
      await backfillProjectTables(client)
      await client.query('COMMIT')
      return
    }

    const now = new Date().toISOString()

    await client.query(`
      INSERT INTO ctd_clients (id, company_name, cui, industry, country, company_size,
        employee_count, annual_revenue, main_contact_name, main_contact_role,
        main_contact_email, main_contact_phone, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO NOTHING
    `, [
      SEED_CLIENT_ID, 'CloudServe SRL', '44521837', 'SaaS B2B — CRM', 'România', '50-100',
      68, 4200000, 'Andrei Popescu', 'CEO', 'andrei@cloudserve.ro', null, now, now,
    ])

    await client.query(`
      INSERT INTO ctd_projects (id, client_id, name, status, current_stage, methodology_version,
        completion_progress, start_date, target_end_date, consultant_owner, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING
    `, [
      SEED_PROJECT_ID, SEED_CLIENT_ID, 'CloudServe SRL — Diagnostic CTD',
      'CIORNA', 'maturitate', 'v1.1', 0.3, null, null, 'cristian@acda.ro', now, now,
    ])

    await client.query(`
      INSERT INTO ctd_ebit_baselines (id, project_id, annual_revenue, operational_costs,
        ebit_current, ebit_margin_current, ebit_target, ebit_target_delta_percent,
        it_spend_current, change_management_spend_current, rule_1_to_1_ratio,
        financial_notes, confidence, confidence_level, data_source, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (project_id) DO NOTHING
    `, [
      `ebit-${SEED_PROJECT_ID}`, SEED_PROJECT_ID,
      4200000, 3780000, 420000, 10.0, 840000, 100.0, 1450000,
      10000, 0.0069, 'Raport 1:1 aproape zero. Buget IT 1.45M vs adopție 10k.',
      0.85, 'HIGH', 'transcriere_whisper', now, now,
    ])

    for (const ind of SEED_INDICATORS) {
      await client.query(`
        INSERT INTO ctd_maturity_indicators (id, project_id, indicator_code, indicator_name,
          area, raw_input_json, score, calculation_method, consultant_comment,
          confidence, confidence_level, data_source, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (project_id, indicator_code) DO NOTHING
      `, [
        `${SEED_PROJECT_ID}-${ind.code}`, SEED_PROJECT_ID, ind.code, ind.name, ind.area,
        JSON.stringify(ind.raw_input), ind.score, null, ind.consultant_comment,
        ind.confidence, ind.confidence_level, ind.data_source, now, now,
      ])
    }

    await backfillProjectTables(client)
    await client.query('COMMIT')
    console.log('[pg] seed CloudServe SRL inserted')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function backfillProjectTables(client: import('pg').PoolClient): Promise<void> {
  const now = new Date().toISOString()

  const procCount = await client.query(
    'SELECT COUNT(*)::int AS n FROM ctd_processes WHERE project_id = $1', [SEED_PROJECT_ID])
  if (procCount.rows[0].n === 0) {
    const processes = [
      { name: 'Onboarding client nou', description: 'Manual, 5 zile, copy-paste.',
        time_execution: '5 zile', cost_estimated: 2500, blocking_score: 4, ebit_impact: 45000,
        citation: 'Onboarding-ul dureaza cam o saptamana. E mult manual.',
        confidence: 0.8, confidence_level: 'HIGH', data_source: 'transcriere_whisper' },
      { name: 'Support tier-1', description: '4 agenti, 60% intrebari repetitive.',
        time_execution: 'continuu', cost_estimated: 8000, blocking_score: 3, ebit_impact: 35000,
        citation: '60% din tickete sunt aceleasi 20 de intrebari.',
        confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper' },
      { name: 'Raportare financiara', description: 'CFO extern, 3 surse, 3 zile/luna.',
        time_execution: '3 zile/luna', cost_estimated: 3000, blocking_score: 2, ebit_impact: 15000,
        citation: 'CFO-ul ia date din Stripe, contabilitate, Metabase, si face un Excel.',
        confidence: 0.75, confidence_level: 'MEDIUM', data_source: 'transcriere_whisper' },
    ]
    for (let i = 0; i < processes.length; i++) {
      const p = processes[i]
      await client.query(`
        INSERT INTO ctd_processes (id, project_id, name, description, time_execution,
          cost_estimated, blocking_score, ebit_impact, citation,
          confidence, confidence_level, data_source, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `, [
        `${SEED_PROJECT_ID}-proc-${i + 1}`, SEED_PROJECT_ID, p.name, p.description, p.time_execution,
        p.cost_estimated, p.blocking_score, p.ebit_impact, p.citation,
        p.confidence, p.confidence_level, p.data_source, now, now,
      ])
    }
  }

  const probCount = await client.query(
    'SELECT COUNT(*)::int AS n FROM ctd_problems WHERE project_id = $1', [SEED_PROJECT_ID])
  if (probCount.rows[0].n === 0) {
    const problems = [
      { title: 'Churn rate in crestere (3.2% la 5.1%)',
        description: 'Rata de abandon crescuta Q4 2025. Cauza: lipsa features AI.',
        financial_impact: 210000, root_cause: 'Lipsa capabilitatilor AI fata de competitori',
        linked_indicators: JSON.stringify(['S1', 'T1']),
        citation: 'Am pierdut 15 clienti in Q4 care au migrat la HubSpot.',
        confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper' },
      { title: 'Tech debt — monolit blocat',
        description: 'Arhitectura monolitica impiedica lansarea de features noi.',
        financial_impact: 120000, root_cause: 'Decizie arhitecturala din 2019 nerevisitata',
        linked_indicators: JSON.stringify(['T3', 'T2']),
        citation: 'Fiecare feature noua dureaza de 3 ori mai mult.',
        confidence: 0.9, confidence_level: 'HIGH', data_source: 'transcriere_whisper' },
      { title: 'Zero competente AI in echipa',
        description: 'Niciun membru cu experienta AI/ML. Recrutarea a esuat.',
        financial_impact: null, root_cause: 'Piata competitiva talent AI, salarizare sub piata',
        linked_indicators: JSON.stringify(['O2', 'O3']),
        citation: 'Am postat 3 joburi de ML engineer anul trecut. Zero aplicanti.',
        confidence: 0.8, confidence_level: 'HIGH', data_source: 'transcriere_whisper' },
    ]
    for (let i = 0; i < problems.length; i++) {
      const p = problems[i]
      await client.query(`
        INSERT INTO ctd_problems (id, project_id, title, description, financial_impact,
          root_cause, linked_indicators, citation,
          confidence, confidence_level, data_source, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [
        `${SEED_PROJECT_ID}-prob-${i + 1}`, SEED_PROJECT_ID, p.title, p.description, p.financial_impact,
        p.root_cause, p.linked_indicators, p.citation,
        p.confidence, p.confidence_level, p.data_source, now, now,
      ])
    }
  }

  const oppCount = await client.query(
    'SELECT COUNT(*)::int AS n FROM ctd_opportunities WHERE project_id = $1', [SEED_PROJECT_ID])
  if (oppCount.rows[0].n === 0) {
    const opps = [
      { title: 'AI lead scoring pentru CloudCRM', type: 'AI', ebit_impact_estimated: 85000,
        effort: 'L', risk: 3,
        citation: 'Clientii ne tot intreaba daca avem lead scoring automat.',
        confidence: 0.7, confidence_level: 'MEDIUM', data_source: 'transcriere_whisper' },
      { title: 'Chatbot AI support tier-1', type: 'automatizare', ebit_impact_estimated: 35000,
        effort: 'M', risk: 2,
        citation: '60% din tickete sunt aceleasi 20 de intrebari.',
        confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper' },
      { title: 'Automatizare onboarding (5 zile la 1 zi)', type: 'automatizare',
        ebit_impact_estimated: 45000, effort: 'M', risk: 2,
        citation: 'Onboarding-ul dureaza cam o saptamana.',
        confidence: 0.8, confidence_level: 'HIGH', data_source: 'transcriere_whisper' },
      { title: 'Predictive churn analysis', type: 'AI', ebit_impact_estimated: 65000,
        effort: 'L', risk: 3,
        citation: 'Am pierdut 15 clienti in Q4. Nu am vazut-o venind.',
        confidence: 0.65, confidence_level: 'MEDIUM', data_source: 'transcriere_whisper' },
    ]
    for (let i = 0; i < opps.length; i++) {
      const o = opps[i]
      await client.query(`
        INSERT INTO ctd_opportunities (id, project_id, title, type, ebit_impact_estimated,
          effort, risk, citation,
          confidence, confidence_level, data_source, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [
        `${SEED_PROJECT_ID}-opp-${i + 1}`, SEED_PROJECT_ID, o.title, o.type, o.ebit_impact_estimated,
        o.effort, o.risk, o.citation,
        o.confidence, o.confidence_level, o.data_source, now, now,
      ])
    }
  }
}

// ─── Public init ─────────────────────────────────────────────────────────────

// Așteaptă conectivitate PG cu retry-uri. Absoarbe cold-start race în Cloud Run:
// Tailscale peer sync poate să nu fie finalizat când initPostgres() se apelează,
// iar socat → HTTP-CONNECT → tailnet → DGX eșuează cu connect timeout. Retry-urile
// se întind pe max ~84s (12 × 7s), sub bugetul 4-min Cloud Run startup.
async function waitForPgReady(): Promise<void> {
  const MAX_ATTEMPTS = 12
  const DELAY_MS = 2_000
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      const r = await getPool().query('SELECT 1 AS ok')
      if (r.rows[0].ok === 1) {
        console.log(`[pg] connectivity ready (attempt ${i}/${MAX_ATTEMPTS})`)
        return
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (i === MAX_ATTEMPTS) {
        throw new Error(`[pg] unreachable after ${MAX_ATTEMPTS} attempts: ${msg}`)
      }
      console.log(`[pg] attempt ${i}/${MAX_ATTEMPTS} failed (${msg}) — retry ${DELAY_MS / 1000}s`)
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }
}

export async function initPostgres(): Promise<void> {
  await waitForPgReady()
  await applySchema()
  await seedCloudServe()
  console.log('[pg] initPostgres complete')
}

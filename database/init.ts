import Database from 'better-sqlite3'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const DB_PATH = resolve(__dirname, 'acda.db')
const SCHEMA_PATH = resolve(__dirname, 'schema.sql')

const SEED_CLIENT_ID = 'c-cloudserve'
const SEED_PROJECT_ID = 'p-cloudserve-001'

// Scorurile întregi sunt alese astfel încât scoreOX(raw_input_json) === score, ca
// MaturityRisk.tsx să nu suprascrie seed-ul la prima vizită. Nivelele rămân fidele
// naraţiunii din mock-cloudserve.ts (scor global ~1.72, NECONFORM pe toate ariile).
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
  {
    code: 'O1', name: 'Regula 1:1', area: 'Oameni & Adopție', score: 1,
    raw_input: { adoptie: 10000, tech: 1450000 },
    confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Buget adoptie aproape inexistent. 95% din buget merge pe dezvoltare si infrastructura.',
  },
  {
    code: 'O2', name: 'Densitatea Talentului', area: 'Oameni & Adopție', score: 3,
    raw_input: { executanti: 36, manageri: 12 },
    confidence: 0.80, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Raport executanti/manageri ~3:1. Echipa competenta dar fara experienta AI/ML.',
  },
  {
    code: 'O3', name: 'Riscul de Instruire', area: 'Oameni & Adopție', score: 2,
    raw_input: { areRisc: true, nivel: 3 },
    confidence: 0.75, confidence_level: 'MEDIUM', data_source: 'transcriere_whisper',
    consultant_comment: 'Nu exista program formal de training. Risc ridicat: echipa fara competente AI/ML.',
  },
  {
    code: 'T1', name: 'Data Products', area: 'Tehnologie & Date', score: 2,
    raw_input: { procent: 15 },
    confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Date exista (320 clienti) dar nu sunt structurate ca produse. Un singur PostgreSQL monolitic.',
  },
  {
    code: 'T2', name: 'API-First', area: 'Tehnologie & Date', score: 3,
    raw_input: { procent: 40 },
    confidence: 0.80, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'CloudCRM are API public REST, ~40% functionalitati expuse. Sistemele interne nu au API-uri.',
  },
  {
    code: 'T3', name: 'Assetizare', area: 'Tehnologie & Date', score: 2,
    raw_input: { procent: 15 },
    confidence: 0.90, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Cod monolitic, nimic reutilizabil. Nu exista biblioteci interne sau microservicii.',
  },
  {
    code: 'S1', name: 'Focusul EBIT', area: 'Strategie & ROI', score: 1,
    raw_input: { areTarget: false, procentInitiative: 0 },
    confidence: 0.90, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Nicio initiativa cu target EBIT. CEO gandeste in MRR si headcount, nu in profitabilitate.',
  },
  {
    code: 'S2', name: 'Validarea Capstone', area: 'Strategie & ROI', score: 1,
    raw_input: { stadiu: 'NU' },
    confidence: 0.85, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Zero piloturi structurate. Nu exista concept de capstone sau ROI tracking.',
  },
  {
    code: 'S3', name: 'Trustworthy AI', area: 'Strategie & ROI', score: 1,
    raw_input: { procent: 5 },
    confidence: 0.95, confidence_level: 'HIGH', data_source: 'transcriere_whisper',
    consultant_comment: 'Zero AI governance. Normal — nu folosesc AI inca.',
  },
]

function seedCloudServe(db: Database.Database): void {
  const exists = db.prepare('SELECT 1 FROM Project WHERE id = ?').get(SEED_PROJECT_ID)
  if (exists) return

  const now = new Date().toISOString()

  const insertClient = db.prepare(`
    INSERT INTO Client (id, company_name, cui, industry, country, company_size,
      employee_count, annual_revenue, main_contact_name, main_contact_role,
      main_contact_email, main_contact_phone, created_at, updated_at)
    VALUES (@id, @company_name, @cui, @industry, @country, @company_size,
      @employee_count, @annual_revenue, @main_contact_name, @main_contact_role,
      @main_contact_email, @main_contact_phone, @created_at, @updated_at)
  `)
  const insertProject = db.prepare(`
    INSERT INTO Project (id, client_id, name, status, current_stage, methodology_version,
      completion_progress, start_date, target_end_date, consultant_owner, created_at, updated_at)
    VALUES (@id, @client_id, @name, @status, @current_stage, @methodology_version,
      @completion_progress, @start_date, @target_end_date, @consultant_owner, @created_at, @updated_at)
  `)
  const insertEbit = db.prepare(`
    INSERT INTO EBITBaseline (id, project_id, annual_revenue, operational_costs, ebit_current,
      ebit_margin_current, ebit_target, ebit_target_delta_percent, it_spend_current,
      change_management_spend_current, rule_1_to_1_ratio, financial_notes,
      confidence, confidence_level, data_source, created_at, updated_at)
    VALUES (@id, @project_id, @annual_revenue, @operational_costs, @ebit_current,
      @ebit_margin_current, @ebit_target, @ebit_target_delta_percent, @it_spend_current,
      @change_management_spend_current, @rule_1_to_1_ratio, @financial_notes,
      @confidence, @confidence_level, @data_source, @created_at, @updated_at)
  `)
  const insertIndicator = db.prepare(`
    INSERT INTO MaturityIndicator (id, project_id, indicator_code, indicator_name, area,
      raw_input_json, score, calculation_method, consultant_comment,
      confidence, confidence_level, data_source, created_at, updated_at)
    VALUES (@id, @project_id, @indicator_code, @indicator_name, @area,
      @raw_input_json, @score, @calculation_method, @consultant_comment,
      @confidence, @confidence_level, @data_source, @created_at, @updated_at)
  `)

  const seedTx = db.transaction(() => {
    if (!db.prepare('SELECT 1 FROM Client WHERE id = ?').get(SEED_CLIENT_ID)) {
      insertClient.run({
        id: SEED_CLIENT_ID,
        company_name: 'CloudServe SRL',
        cui: '44521837',
        industry: 'SaaS B2B — CRM',
        country: 'România',
        company_size: '50-100',
        employee_count: 68,
        annual_revenue: 4200000,
        main_contact_name: 'Andrei Popescu',
        main_contact_role: 'CEO',
        main_contact_email: 'andrei@cloudserve.ro',
        main_contact_phone: null,
        created_at: now, updated_at: now,
      })
    }

    insertProject.run({
      id: SEED_PROJECT_ID,
      client_id: SEED_CLIENT_ID,
      name: 'CloudServe SRL — Diagnostic CTD',
      status: 'CIORNA',
      current_stage: 'maturity_assessment',
      methodology_version: 'v1.1',
      completion_progress: 0.35,
      start_date: '2026-04-15',
      target_end_date: '2026-05-15',
      consultant_owner: 'Cristian Lungu',
      created_at: now, updated_at: now,
    })

    insertEbit.run({
      id: `ebit-${SEED_PROJECT_ID}`,
      project_id: SEED_PROJECT_ID,
      annual_revenue: 4200000,
      operational_costs: 3820000,
      ebit_current: 380000,
      ebit_margin_current: 9.05,
      ebit_target: 456000,
      ebit_target_delta_percent: 20,
      it_spend_current: 1450000,
      change_management_spend_current: 10000,
      rule_1_to_1_ratio: 10000 / 1450000,
      financial_notes: 'CFO extern, raportare lunara. Sursa: anaf + transcriere call 2026-04-15.',
      confidence: 0.7,
      confidence_level: 'MEDIUM',
      data_source: 'transcriere_whisper+anaf',
      created_at: now, updated_at: now,
    })

    for (const ind of SEED_INDICATORS) {
      insertIndicator.run({
        id: `${SEED_PROJECT_ID}-${ind.code}`,
        project_id: SEED_PROJECT_ID,
        indicator_code: ind.code,
        indicator_name: ind.name,
        area: ind.area,
        raw_input_json: JSON.stringify(ind.raw_input),
        score: ind.score,
        calculation_method: 'maturityCalculator.score' + ind.code,
        consultant_comment: ind.consultant_comment,
        confidence: ind.confidence,
        confidence_level: ind.confidence_level,
        data_source: ind.data_source,
        created_at: now, updated_at: now,
      })
    }
  })
  seedTx()
}

export function initDatabase(dbPath: string = DB_PATH): Database.Database {
  const dir = dirname(dbPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const schema = readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(schema)

  // Migraţie idempotentă pt DB-uri create înainte de P3-T5.
  const cols = db.prepare("PRAGMA table_info(Project)").all() as Array<{ name: string }>
  const colNames = new Set(cols.map((c) => c.name))
  if (!colNames.has('validation_time_seconds')) {
    db.exec('ALTER TABLE Project ADD COLUMN validation_time_seconds INTEGER')
  }
  if (!colNames.has('validated_at')) {
    db.exec('ALTER TABLE Project ADD COLUMN validated_at TEXT')
  }

  seedCloudServe(db)

  return db
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const db = initDatabase()
  console.log(`[init] DB ready at ${DB_PATH}`)
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
  console.log('[init] tables:', tables.map((t) => (t as { name: string }).name).join(', '))
  const projects = db.prepare('SELECT id, name, status FROM Project').all()
  console.log('[init] projects seeded:', projects)
  const indCount = db.prepare('SELECT COUNT(*) as n FROM MaturityIndicator WHERE project_id = ?')
    .get(SEED_PROJECT_ID) as { n: number }
  console.log(`[init] CloudServe indicators: ${indCount.n}/9`)
  db.close()
}

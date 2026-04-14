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

// ─── F4 seed helpers ─────────────────────────────────────────────────────────
// Apelate şi din seed iniţial (proiect nou) şi din backfill (DB pre-F4).
// Folosesc parameterized queries (CLAUDE.md: nu interpola SQL).

function seedProcesses(db: Database.Database, now: string): void {
  const stmt = db.prepare(`
    INSERT INTO Process (id, project_id, name, description, time_execution, cost_estimated,
      blocking_score, ebit_impact, citation, confidence, confidence_level, data_source,
      created_at, updated_at)
    VALUES (@id, @project_id, @name, @description, @time_execution, @cost_estimated,
      @blocking_score, @ebit_impact, @citation, @confidence, @confidence_level, @data_source,
      @created_at, @updated_at)
  `)
  const rows = [
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
  rows.forEach((p, i) => stmt.run({
    id: `${SEED_PROJECT_ID}-proc-${i + 1}`, project_id: SEED_PROJECT_ID,
    ...p, created_at: now, updated_at: now,
  }))
}

function seedProblems(db: Database.Database, now: string): void {
  const stmt = db.prepare(`
    INSERT INTO Problem (id, project_id, title, description, financial_impact, root_cause,
      linked_indicators, citation, confidence, confidence_level, data_source,
      created_at, updated_at)
    VALUES (@id, @project_id, @title, @description, @financial_impact, @root_cause,
      @linked_indicators, @citation, @confidence, @confidence_level, @data_source,
      @created_at, @updated_at)
  `)
  const rows = [
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
  rows.forEach((p, i) => stmt.run({
    id: `${SEED_PROJECT_ID}-prob-${i + 1}`, project_id: SEED_PROJECT_ID,
    ...p, created_at: now, updated_at: now,
  }))
}

function seedOpportunities(db: Database.Database, now: string): void {
  const stmt = db.prepare(`
    INSERT INTO Opportunity (id, project_id, title, type, ebit_impact_estimated, effort, risk,
      citation, confidence, confidence_level, data_source, created_at, updated_at)
    VALUES (@id, @project_id, @title, @type, @ebit_impact_estimated, @effort, @risk,
      @citation, @confidence, @confidence_level, @data_source, @created_at, @updated_at)
  `)
  const rows = [
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
  rows.forEach((o, i) => stmt.run({
    id: `${SEED_PROJECT_ID}-opp-${i + 1}`, project_id: SEED_PROJECT_ID,
    ...o, created_at: now, updated_at: now,
  }))
}

function seedCloudServe(db: Database.Database): void {
  const projectExists = db.prepare('SELECT 1 FROM Project WHERE id = ?').get(SEED_PROJECT_ID)
  // Dacă proiectul există, verificăm dacă tabelele operaţionale (F4) au fost seeded.
  // Dacă lipsesc rânduri pentru SEED_PROJECT_ID, vom popula doar acele tabele (backfill).
  const needFullSeed = !projectExists

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
    if (!needFullSeed) {
      // Backfill tabele F4 doar dacă lipsesc rânduri pentru proiectul seed.
      const procCount = (db.prepare('SELECT COUNT(*) AS n FROM Process WHERE project_id = ?').get(SEED_PROJECT_ID) as { n: number }).n
      const probCount = (db.prepare('SELECT COUNT(*) AS n FROM Problem WHERE project_id = ?').get(SEED_PROJECT_ID) as { n: number }).n
      const oppCount  = (db.prepare('SELECT COUNT(*) AS n FROM Opportunity WHERE project_id = ?').get(SEED_PROJECT_ID) as { n: number }).n
      if (procCount === 0) seedProcesses(db, now)
      if (probCount === 0) seedProblems(db, now)
      if (oppCount === 0) seedOpportunities(db, now)
      return
    }
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

    seedProcesses(db, now)
    seedProblems(db, now)
    seedOpportunities(db, now)
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

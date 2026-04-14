import type {
  Client, Project, EBITBaseline, MaturityIndicator,
  Process, ProblemStatement, Opportunity,
} from '../types/acda.types'

/** Sumar de proiect afișat în ProjectSelector (lista de pe Dashboard). */
export interface ProjectSummary extends Project {
  client_company_name: string | null
  indicator_scores: Array<{ indicator_code: string; score: number | null }>
}

/**
 * Interfață abstractă pentru persistența datelor ACDA.
 *
 * Adaptoare concrete azi: APIAdapter (REST → Express + better-sqlite3).
 * Mâine: PalaceAdapter, IndexedDBAdapter, etc — același contract.
 */
export interface DataIngestionLayer {
  // ── Project ───────────────────────────────────────────────────────────────
  listProjects(): Promise<ProjectSummary[]>
  getProject(id: string): Promise<Project | null>
  saveProject(project: Project): Promise<Project>
  deleteProject(id: string): Promise<void>

  // ── EBIT Baseline ─────────────────────────────────────────────────────────
  getEBITBaseline(projectId: string): Promise<EBITBaseline | null>
  saveEBITBaseline(projectId: string, data: EBITBaseline | null): Promise<EBITBaseline | null>

  // ── Maturity Indicators ───────────────────────────────────────────────────
  /** Returnează toți indicatorii de maturitate (per indicator_code) pentru un proiect. */
  getMaturityScores(projectId: string): Promise<MaturityIndicator[]>
  /** Salvează (upsert) lista completă de indicatori pentru proiect. */
  saveMaturityScores(projectId: string, scores: MaturityIndicator[]): Promise<MaturityIndicator[]>

  // ── F4: Process / Problem / Opportunity ──────────────────────────────────
  getProcesses(projectId: string): Promise<Process[]>
  saveProcesses(projectId: string, items: Process[]): Promise<Process[]>

  getProblems(projectId: string): Promise<ProblemStatement[]>
  saveProblems(projectId: string, items: ProblemStatement[]): Promise<ProblemStatement[]>

  getOpportunities(projectId: string): Promise<Opportunity[]>
  saveOpportunities(projectId: string, items: Opportunity[]): Promise<Opportunity[]>
}

/**
 * Bundle returnat la încărcare iniţială pentru a evita N requesturi.
 * Folosit de ProjectContext.tsx la mount.
 */
export interface ProjectBundle {
  project: Project | null
  client: Client | null
  ebitBaseline: EBITBaseline | null
  maturityIndicators: MaturityIndicator[]
  processes: Process[]
  problems: ProblemStatement[]
  opportunities: Opportunity[]
}

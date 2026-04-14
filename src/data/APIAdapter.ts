import type {
  Project, EBITBaseline, MaturityIndicator,
  Process, ProblemStatement, Opportunity,
} from '../types/acda.types'
import type { DataIngestionLayer, ProjectBundle, ProjectSummary } from './DataIngestionLayer'

const BASE = '/api'

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${method} ${path}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class APIAdapter implements DataIngestionLayer {
  async listProjects(): Promise<ProjectSummary[]> {
    return http<ProjectSummary[]>('GET', '/projects')
  }

  async createProject(project: Partial<Project> & { id: string; client_company_name?: string }): Promise<Project> {
    return http<Project>('POST', '/projects', project)
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const bundle = await http<{ project: Project }>('GET', `/projects/${encodeURIComponent(id)}`)
      return bundle.project ?? null
    } catch {
      return null
    }
  }

  async getProjectBundle(id: string): Promise<ProjectBundle | null> {
    try {
      return await http<ProjectBundle>('GET', `/projects/${encodeURIComponent(id)}`)
    } catch {
      return null
    }
  }

  async saveProject(project: Project): Promise<Project> {
    return http<Project>('PUT', `/projects/${encodeURIComponent(project.id)}`, project)
  }

  async updateProjectStatus(id: string, payload: { status: string; validation_time_seconds?: number }): Promise<Project> {
    return http<Project>('PUT', `/projects/${encodeURIComponent(id)}/status`, payload)
  }

  async deleteProject(id: string): Promise<void> {
    await http<{ ok: true }>('DELETE', `/projects/${encodeURIComponent(id)}`)
  }

  async getEBITBaseline(projectId: string): Promise<EBITBaseline | null> {
    const bundle = await this.getProjectBundle(projectId)
    return bundle?.ebitBaseline ?? null
  }

  async saveEBITBaseline(projectId: string, data: EBITBaseline | null): Promise<EBITBaseline | null> {
    if (data === null) {
      await fetch(`${BASE}/projects/${encodeURIComponent(projectId)}/ebit`, { method: 'DELETE' })
      return null
    }
    return http<EBITBaseline>('PUT', `/projects/${encodeURIComponent(projectId)}/ebit`, data)
  }

  async getMaturityScores(projectId: string): Promise<MaturityIndicator[]> {
    const bundle = await this.getProjectBundle(projectId)
    return bundle?.maturityIndicators ?? []
  }

  async saveMaturityScores(projectId: string, scores: MaturityIndicator[]): Promise<MaturityIndicator[]> {
    return http<MaturityIndicator[]>('PUT', `/projects/${encodeURIComponent(projectId)}/maturity`, scores)
  }

  // ── F4: Process / Problem / Opportunity ────────────────────────────────
  async getProcesses(projectId: string): Promise<Process[]> {
    return http<Process[]>('GET', `/projects/${encodeURIComponent(projectId)}/processes`)
  }
  async saveProcesses(projectId: string, items: Process[]): Promise<Process[]> {
    return http<Process[]>('PUT', `/projects/${encodeURIComponent(projectId)}/processes`, items)
  }
  async getProblems(projectId: string): Promise<ProblemStatement[]> {
    return http<ProblemStatement[]>('GET', `/projects/${encodeURIComponent(projectId)}/problems`)
  }
  async saveProblems(projectId: string, items: ProblemStatement[]): Promise<ProblemStatement[]> {
    return http<ProblemStatement[]>('PUT', `/projects/${encodeURIComponent(projectId)}/problems`, items)
  }
  async getOpportunities(projectId: string): Promise<Opportunity[]> {
    return http<Opportunity[]>('GET', `/projects/${encodeURIComponent(projectId)}/opportunities`)
  }
  async saveOpportunities(projectId: string, items: Opportunity[]): Promise<Opportunity[]> {
    return http<Opportunity[]>('PUT', `/projects/${encodeURIComponent(projectId)}/opportunities`, items)
  }

  async ingestCTD(projectId: string, payload: unknown): Promise<ProjectBundle & {
    processes: Process[]; problems: ProblemStatement[]; opportunities: Opportunity[];
  }> {
    return http('POST', `/projects/${encodeURIComponent(projectId)}/ingest`, payload)
  }
}

export const apiAdapter = new APIAdapter()

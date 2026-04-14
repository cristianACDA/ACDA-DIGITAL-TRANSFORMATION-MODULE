import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Client,
  Project,
  BusinessContext,
  EBITBaseline,
  MaturityIndicator,
  MaturityScore,
  Process,
  ValueStream,
  ProblemStatement,
  Opportunity,
  BusinessCase,
  Initiative,
  StrategyPillar,
  RoadmapPhase,
  ReportSection,
} from '../types/acda.types'
import { apiAdapter } from '../data/APIAdapter'

// ─── State shape ──────────────────────────────────────────────────────────────

interface ProjectState {
  client:              Client | null
  project:             Project | null
  businessContext:     BusinessContext | null
  ebitBaseline:        EBITBaseline | null
  maturityIndicators:  MaturityIndicator[]
  maturityScore:       MaturityScore | null
  processes:           Process[]
  valueStreams:        ValueStream[]
  problemStatements:   ProblemStatement[]
  opportunities:       Opportunity[]
  businessCases:       BusinessCase[]
  initiatives:         Initiative[]
  strategyPillars:     StrategyPillar[]
  roadmapPhases:       RoadmapPhase[]
  reportSections:      ReportSection[]
}

interface ProjectActions {
  setClient:                (v: Client | null)            => void
  setProject:               (v: Project | null)           => void
  setBusinessContext:       (v: BusinessContext | null)   => void
  setEbitBaseline:          (v: EBITBaseline | null)      => void
  setMaturityScore:         (v: MaturityScore | null)     => void
  setMaturityIndicators:    (v: MaturityIndicator[])      => void
  updateMaturityIndicator:  (v: MaturityIndicator)        => void
  setProcesses:             (v: Process[])                => void
  setValueStreams:          (v: ValueStream[])            => void
  setProblemStatements:     (v: ProblemStatement[])       => void
  setOpportunities:         (v: Opportunity[])            => void
  setBusinessCases:         (v: BusinessCase[])           => void
  setInitiatives:           (v: Initiative[])             => void
  setStrategyPillars:       (v: StrategyPillar[])         => void
  setRoadmapPhases:         (v: RoadmapPhase[])           => void
  setReportSections:        (v: ReportSection[])          => void
  // F1-T2: multi-project — selecţia activă comandă încărcarea/persistenţa.
  setActiveProjectId:       (id: string | null)           => void
}

type ProjectContextValue = ProjectState & ProjectActions & {
  activeProjectId: string | null
  isHydrating: boolean
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

const INITIAL_STATE: ProjectState = {
  client:             null,
  project:            null,
  businessContext:    null,
  ebitBaseline:       null,
  maturityIndicators: [],
  maturityScore:      null,
  processes:          [],
  valueStreams:       [],
  problemStatements:  [],
  opportunities:      [],
  businessCases:      [],
  initiatives:        [],
  strategyPillars:    [],
  roadmapPhases:      [],
  reportSections:     [],
}

const PERSIST_DEBOUNCE_MS = 350

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProjectState>(INITIAL_STATE)
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null)
  // Indică pentru ce proiect am încheiat hidratarea — gateaază scrierile.
  const [hydratedFor, setHydratedFor] = useState<string | null>(null)

  const ebitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const matTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const procTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const probTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const oppTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id)
    if (id === null) {
      setState(INITIAL_STATE)
      setHydratedFor(null)
    }
  }, [])

  // Hidratare la schimbare proiect activ.
  useEffect(() => {
    if (!activeProjectId) return
    let cancelled = false
    setHydratedFor(null)
    apiAdapter.getProjectBundle(activeProjectId).then((bundle) => {
      if (cancelled) return
      if (bundle) {
        setState((prev) => ({
          ...prev,
          project: bundle.project,
          client: bundle.client,
          ebitBaseline: bundle.ebitBaseline,
          maturityIndicators: bundle.maturityIndicators ?? [],
          processes: bundle.processes ?? [],
          problemStatements: bundle.problems ?? [],
          opportunities: bundle.opportunities ?? [],
        }))
      }
      setHydratedFor(activeProjectId)
    }).catch(() => setHydratedFor(activeProjectId))
    return () => { cancelled = true }
  }, [activeProjectId])

  // Persist EBIT — gateat pe hidratare completă a proiectului curent.
  useEffect(() => {
    if (!activeProjectId || hydratedFor !== activeProjectId) return
    if (ebitTimer.current) clearTimeout(ebitTimer.current)
    const snapshot = state.ebitBaseline
    const pid = activeProjectId
    ebitTimer.current = setTimeout(() => {
      apiAdapter.saveEBITBaseline(pid, snapshot).catch((err) => {
        console.error('[ProjectContext] saveEBITBaseline failed', err)
      })
    }, PERSIST_DEBOUNCE_MS)
    return () => { if (ebitTimer.current) clearTimeout(ebitTimer.current) }
  }, [state.ebitBaseline, hydratedFor, activeProjectId])

  // Persist indicatori — batch.
  useEffect(() => {
    if (!activeProjectId || hydratedFor !== activeProjectId) return
    if (state.maturityIndicators.length === 0) return
    if (matTimer.current) clearTimeout(matTimer.current)
    const snapshot = state.maturityIndicators
    const pid = activeProjectId
    matTimer.current = setTimeout(() => {
      apiAdapter.saveMaturityScores(pid, snapshot).catch((err) => {
        console.error('[ProjectContext] saveMaturityScores failed', err)
      })
    }, PERSIST_DEBOUNCE_MS)
    return () => { if (matTimer.current) clearTimeout(matTimer.current) }
  }, [state.maturityIndicators, hydratedFor, activeProjectId])

  // Persist procese (F4) — replace-all debounced.
  useEffect(() => {
    if (!activeProjectId || hydratedFor !== activeProjectId) return
    if (procTimer.current) clearTimeout(procTimer.current)
    const snapshot = state.processes
    const pid = activeProjectId
    procTimer.current = setTimeout(() => {
      apiAdapter.saveProcesses(pid, snapshot).catch((err) => {
        console.error('[ProjectContext] saveProcesses failed', err)
      })
    }, PERSIST_DEBOUNCE_MS)
    return () => { if (procTimer.current) clearTimeout(procTimer.current) }
  }, [state.processes, hydratedFor, activeProjectId])

  // Persist probleme.
  useEffect(() => {
    if (!activeProjectId || hydratedFor !== activeProjectId) return
    if (probTimer.current) clearTimeout(probTimer.current)
    const snapshot = state.problemStatements
    const pid = activeProjectId
    probTimer.current = setTimeout(() => {
      apiAdapter.saveProblems(pid, snapshot).catch((err) => {
        console.error('[ProjectContext] saveProblems failed', err)
      })
    }, PERSIST_DEBOUNCE_MS)
    return () => { if (probTimer.current) clearTimeout(probTimer.current) }
  }, [state.problemStatements, hydratedFor, activeProjectId])

  // Persist oportunităţi.
  useEffect(() => {
    if (!activeProjectId || hydratedFor !== activeProjectId) return
    if (oppTimer.current) clearTimeout(oppTimer.current)
    const snapshot = state.opportunities
    const pid = activeProjectId
    oppTimer.current = setTimeout(() => {
      apiAdapter.saveOpportunities(pid, snapshot).catch((err) => {
        console.error('[ProjectContext] saveOpportunities failed', err)
      })
    }, PERSIST_DEBOUNCE_MS)
    return () => { if (oppTimer.current) clearTimeout(oppTimer.current) }
  }, [state.opportunities, hydratedFor, activeProjectId])

  const actions = useMemo<ProjectActions>(() => ({
    setClient:             (v) => setState((p) => ({ ...p, client: v })),
    setProject:            (v) => setState((p) => ({ ...p, project: v })),
    setBusinessContext:    (v) => setState((p) => ({ ...p, businessContext: v })),
    setEbitBaseline:       (v) => setState((p) => ({ ...p, ebitBaseline: v })),
    setMaturityScore:      (v) => setState((p) => ({ ...p, maturityScore: v })),
    setMaturityIndicators: (v) => setState((p) => ({ ...p, maturityIndicators: v })),
    updateMaturityIndicator: (updated) => setState((p) => {
      const existing = p.maturityIndicators.find((ind) => ind.indicator_code === updated.indicator_code)
      if (existing && existing.score === updated.score) return p
      const idx = p.maturityIndicators.findIndex((ind) => ind.indicator_code === updated.indicator_code)
      const next = [...p.maturityIndicators]
      if (idx >= 0) next[idx] = updated
      else next.push(updated)
      return { ...p, maturityIndicators: next }
    }),
    setProcesses:          (v) => setState((p) => ({ ...p, processes: v })),
    setValueStreams:       (v) => setState((p) => ({ ...p, valueStreams: v })),
    setProblemStatements:  (v) => setState((p) => ({ ...p, problemStatements: v })),
    setOpportunities:      (v) => setState((p) => ({ ...p, opportunities: v })),
    setBusinessCases:      (v) => setState((p) => ({ ...p, businessCases: v })),
    setInitiatives:        (v) => setState((p) => ({ ...p, initiatives: v })),
    setStrategyPillars:    (v) => setState((p) => ({ ...p, strategyPillars: v })),
    setRoadmapPhases:      (v) => setState((p) => ({ ...p, roadmapPhases: v })),
    setReportSections:     (v) => setState((p) => ({ ...p, reportSections: v })),
    setActiveProjectId,
  }), [setActiveProjectId])

  const value = useMemo<ProjectContextValue>(() => ({
    ...state,
    ...actions,
    activeProjectId,
    isHydrating: activeProjectId !== null && hydratedFor !== activeProjectId,
  }), [state, actions, activeProjectId, hydratedFor])

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (ctx === null) {
    throw new Error('useProjectContext must be used inside <ProjectProvider>')
  }
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { PAGINI_COCKPIT } from '../contracts/agent-contracts'
import type { StatusPagina } from '../contracts/agent-contracts'
import type { ConfidenceLevelExtended } from '../types/confidence'
import { useProjectContext } from '../context/ProjectContext'
import CockpitProgress from '../components/CockpitProgress'
import ConfidenceSummary from '../components/ConfidenceSummary'
import ConsultantTimer from '../components/ConsultantTimer'

// ─── Field registry types ────────────────────────────────────────────────────

export interface CockpitFieldEntry {
  id: string
  label: string
  confidence: number
  confidence_level: ConfidenceLevelExtended
  data_source: string | null
  original_value: string
  edited: boolean
}

type FieldsByPage = Record<number, Record<string, CockpitFieldEntry>>

// ─── Narrative state (P3-T4) ─────────────────────────────────────────────────

export interface NarrativeEntry {
  text: string
  source: 'template' | 'llm' | 'manual'
  generatedAt: string | null
  isManuallyEdited: boolean
}

type NarrativesByPage = Record<number, NarrativeEntry>

// ─── Cockpit context ─────────────────────────────────────────────────────────

interface CockpitContextValue {
  statuses: Record<number, StatusPagina>
  setStatus: (pageNum: number, status: StatusPagina) => boolean
  totalPages: number
  validatedCount: number
  fieldsByPage: FieldsByPage
  registerField: (pageNum: number, fieldId: string, entry: CockpitFieldEntry) => void
  unregisterField: (pageNum: number, fieldId: string) => void
  /** True dacă pagina poate fi marcată "validat" (zero LOW needitate). */
  canValidate: (pageNum: number) => boolean
  // ── Narrative
  narratives: NarrativesByPage
  setNarrative: (pageNum: number, entry: NarrativeEntry) => void
  clearNarrative: (pageNum: number) => void
  // ── Timer (P3-T5)
  timerSeconds: number
  timerPaused: boolean
  toggleTimer: () => void
  resetTimer: () => void
}

const CockpitCtx = createContext<CockpitContextValue | null>(null)

export function useCockpit(): CockpitContextValue {
  const v = useContext(CockpitCtx)
  if (!v) throw new Error('useCockpit must be inside CockpitLayout')
  return v
}

// ─── Status visuals (dot color + label) ──────────────────────────────────────

const STATUS_STYLE: Record<StatusPagina, { dot: string; label: string }> = {
  pre_populat: { dot: 'bg-accent-warning', label: 'Pre-populat' },
  in_review:   { dot: 'bg-accent-warning', label: 'În review'   },
  validat:     { dot: 'bg-accent-success', label: 'Validat'     },
  skip:        { dot: 'bg-subtle',         label: 'Skip'        },
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function CockpitLayout() {
  const { activeProjectId, project, client } = useProjectContext()
  const { pageNum } = useParams<{ pageNum?: string }>()
  const location = useLocation()
  const isValidationRoute = location.pathname.endsWith('/validation')
  const currentPage = Number(pageNum ?? '1')

  const [statuses, setStatuses] = useState<Record<number, StatusPagina>>(() => {
    const init: Record<number, StatusPagina> = {}
    for (const p of PAGINI_COCKPIT) init[p.numar] = 'pre_populat'
    return init
  })
  const [fieldsByPage, setFieldsByPage] = useState<FieldsByPage>({})
  const [narratives, setNarratives] = useState<NarrativesByPage>({})
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerPaused, setTimerPaused] = useState(false)

  useEffect(() => {
    if (timerPaused) return
    const id = window.setInterval(() => setTimerSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [timerPaused])

  const toggleTimer = useCallback(() => setTimerPaused((p) => !p), [])
  const resetTimer = useCallback(() => { setTimerSeconds(0); setTimerPaused(false) }, [])

  const setNarrative = useCallback((pn: number, entry: NarrativeEntry) => {
    setNarratives((prev) => ({ ...prev, [pn]: entry }))
  }, [])
  const clearNarrative = useCallback((pn: number) => {
    setNarratives((prev) => {
      const { [pn]: _omit, ...rest } = prev
      void _omit
      return rest
    })
  }, [])

  const registerField = useCallback((pn: number, fid: string, entry: CockpitFieldEntry) => {
    setFieldsByPage((prev) => ({
      ...prev,
      [pn]: { ...(prev[pn] ?? {}), [fid]: entry },
    }))
  }, [])

  const unregisterField = useCallback((pn: number, fid: string) => {
    setFieldsByPage((prev) => {
      const pageFields = prev[pn]
      if (!pageFields || !(fid in pageFields)) return prev
      const { [fid]: _omit, ...rest } = pageFields
      void _omit
      return { ...prev, [pn]: rest }
    })
  }, [])

  const canValidate = useCallback((pn: number) => {
    const fields = Object.values(fieldsByPage[pn] ?? {})
    return fields.every((f) => f.confidence_level !== 'LOW')
  }, [fieldsByPage])

  const setStatus = useCallback((pn: number, status: StatusPagina): boolean => {
    if (status === 'validat') {
      const fields = Object.values(fieldsByPage[pn] ?? {})
      const blockedBy = fields.filter((f) => f.confidence_level === 'LOW')
      if (blockedBy.length > 0) {
        console.warn(`[Cockpit] pagina ${pn} nu poate fi validată: ${blockedBy.length} câmp(uri) LOW needitate`)
        return false
      }
    }
    setStatuses((prev) => ({ ...prev, [pn]: status }))
    return true
  }, [fieldsByPage])

  const ctxValue = useMemo<CockpitContextValue>(() => {
    const validated = Object.values(statuses).filter((s) => s === 'validat').length
    return {
      statuses,
      setStatus,
      totalPages: PAGINI_COCKPIT.length,
      validatedCount: validated,
      fieldsByPage,
      registerField,
      unregisterField,
      canValidate,
      narratives,
      setNarrative,
      clearNarrative,
      timerSeconds,
      timerPaused,
      toggleTimer,
      resetTimer,
    }
  }, [statuses, setStatus, fieldsByPage, registerField, unregisterField, canValidate,
      narratives, setNarrative, clearNarrative,
      timerSeconds, timerPaused, toggleTimer, resetTimer])

  if (!activeProjectId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-card border border-border-subtle rounded-lg p-8 text-center shadow-card">
          <p className="text-5xl mb-3" aria-hidden="true">📋</p>
          <h2 className="text-xl font-medium text-text-primary mb-2">Niciun proiect selectat</h2>
          <p className="text-sm text-text-secondary">
            Întoarce-te la <NavLink to="/dashboard" className="text-accent-primary font-medium hover:underline">Dashboard</NavLink>{' '}
            şi alege un proiect pentru a deschide cockpitul.
          </p>
        </div>
      </div>
    )
  }

  const currentStatus = statuses[currentPage] ?? 'pre_populat'
  const currentSty = STATUS_STYLE[currentStatus]
  const currentCanValidate = canValidate(currentPage)

  return (
    <CockpitCtx.Provider value={ctxValue}>
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col gap-5">

        {/* Header — proiect + progress + timer */}
        <div className="bg-card border border-border-subtle rounded-lg shadow-card px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted font-medium">Cockpit CTD</p>
              <h1 className="text-[22px] font-medium text-text-primary tracking-tight truncate mt-0.5">
                {client?.company_name ?? '—'}
              </h1>
              <p className="text-sm text-text-secondary truncate mt-0.5">{project?.name ?? '—'}</p>
            </div>
            <div className="flex-1 max-w-md">
              <CockpitProgress />
            </div>
            <ConsultantTimer />
          </div>

          <div className={`flex items-center justify-between gap-4 pt-4 border-t border-border-subtle ${isValidationRoute ? 'hidden' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.14em]">
                Pagina {currentPage}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-sm bg-subtle text-text-primary inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${currentSty.dot}`} aria-hidden="true" />
                {currentSty.label}
              </span>
              <ConfidenceSummary />
            </div>
            <button
              type="button"
              disabled={!currentCanValidate || currentStatus === 'validat'}
              onClick={() => setStatus(currentPage, 'validat')}
              title={!currentCanValidate
                ? 'Editează câmpurile LOW (roşii) înainte de a valida pagina.'
                : 'Marchează pagina ca validată.'}
              className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
                !currentCanValidate
                  ? 'bg-subtle text-text-muted cursor-not-allowed'
                  : currentStatus === 'validat'
                    ? 'bg-subtle text-accent-success cursor-default'
                    : 'bg-accent-primary text-white hover:bg-accent-primary-hover'
              }`}
            >
              {currentStatus === 'validat' ? '✓ Validat' : 'Marchează validat'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Sidebar 12 pagini */}
          <aside className="bg-card border border-border-subtle rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3">
              <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-[0.14em]">
                Pagini cockpit
              </h2>
            </div>
            <ul className="px-2 pb-2 space-y-0.5">
              {PAGINI_COCKPIT.map((p) => {
                const status = statuses[p.numar] ?? 'pre_populat'
                const sty = STATUS_STYLE[status]
                const isActive = !isValidationRoute && p.numar === currentPage
                return (
                  <li key={p.numar}>
                    <NavLink
                      to={`/cockpit/${p.numar}`}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                        isActive
                          ? 'bg-subtle border-l-2 border-accent-primary'
                          : 'border-l-2 border-transparent hover:bg-subtle'
                      }`}
                      title={sty.label}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                        isActive ? 'bg-accent-primary text-white' : 'bg-subtle text-text-secondary'
                      }`}>
                        {p.numar}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isActive ? 'text-text-primary font-medium' : 'text-text-body'}`}>
                          {p.titlu_ro}
                        </p>
                        {p.optionala && (
                          <span className="inline-block mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                            opţional
                          </span>
                        )}
                      </div>
                      <span
                        className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${sty.dot}`}
                        aria-label={`status: ${sty.label}`}
                      />
                    </NavLink>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-border-subtle mt-1 pt-1 pb-2 px-2">
              <NavLink
                to="/cockpit/validation"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isValidationRoute
                    ? 'bg-subtle border-l-2 border-accent-primary'
                    : 'border-l-2 border-transparent hover:bg-subtle'
                }`}
              >
                <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                  isValidationRoute ? 'bg-accent-primary text-white' : 'bg-subtle text-text-secondary'
                }`}>
                  ✓
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isValidationRoute ? 'text-text-primary font-medium' : 'text-text-body'}`}>
                    Validare finală
                  </p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">checklist + submit</p>
                </div>
              </NavLink>
            </div>
          </aside>

          {/* Conţinut pagină */}
          <main className="bg-card border border-border-subtle rounded-lg shadow-card min-h-[60vh]">
            <Outlet />
          </main>
        </div>
      </div>
    </CockpitCtx.Provider>
  )
}

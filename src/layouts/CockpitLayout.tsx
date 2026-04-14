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

// ─── Status visuals ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<StatusPagina, { dot: string; label: string; chip: string }> = {
  pre_populat: { dot: 'bg-[#071F80]',    label: 'Pre-populat', chip: 'bg-blue-50 border-blue-200 text-[#071F80]' },
  in_review:   { dot: 'bg-amber-500',    label: 'În review',   chip: 'bg-amber-50 border-amber-200 text-amber-700' },
  validat:     { dot: 'bg-green-500',    label: 'Validat',     chip: 'bg-green-50 border-green-200 text-green-700' },
  skip:        { dot: 'bg-[#0A2540]/30', label: 'Skip',        chip: 'bg-[#F6F9FC] border-[#E6E6E6] text-[#0A2540]/50' },
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

  // Tick timer (1Hz) — porneşte automat la mount cockpit, opreşte la unmount.
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
    // Regulă P3-T2: pagina poate fi "validat" doar dacă zero câmpuri LOW
    // rămân needitate (un LOW editat devine MANUAL şi nu mai blochează).
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
        <div className="bg-white border border-[#E6E6E6] rounded-xl p-8 text-center shadow-sm">
          <p className="text-5xl mb-3">📋</p>
          <h2 className="text-xl font-black text-[#071F80] mb-2">Niciun proiect selectat</h2>
          <p className="text-sm text-[#0A2540]/60">
            Întoarce-te la <NavLink to="/dashboard" className="text-[#071F80] font-semibold hover:underline">Dashboard</NavLink>{' '}
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
      <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Header — proiect + progress + summary */}
        <div className="bg-white border border-[#E6E6E6] rounded-xl shadow-sm px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[#0A2540]/40 uppercase tracking-widest mb-0.5">Cockpit CTD</p>
              <h1 className="text-lg font-black text-[#071F80] truncate">
                {client?.company_name ?? '—'}
              </h1>
              <p className="text-xs text-[#0A2540]/60 truncate">{project?.name ?? '—'}</p>
            </div>
            <div className="flex-1 max-w-md">
              <CockpitProgress />
            </div>
            <ConsultantTimer />
          </div>

          <div className={`flex items-center justify-between gap-4 pt-3 border-t border-[#E6E6E6] ${isValidationRoute ? 'hidden' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#0A2540]/50 uppercase tracking-widest">
                Pagina {currentPage}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${currentSty.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentSty.dot}`} />
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
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                !currentCanValidate
                  ? 'border-[#E6E6E6] text-[#0A2540]/30 bg-white cursor-not-allowed'
                  : currentStatus === 'validat'
                    ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                    : 'border-[#071F80] bg-[#071F80] text-white hover:bg-[#0A2540]'
              }`}
            >
              {currentStatus === 'validat' ? '✓ Validat' : 'Marchează validat'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar 12 pagini */}
          <aside className="bg-white border border-[#E6E6E6] rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E6E6E6]">
              <h2 className="text-xs font-semibold text-[#0A2540]/50 uppercase tracking-widest">
                Pagini cockpit
              </h2>
            </div>
            <ul className="divide-y divide-[#E6E6E6]">
              {PAGINI_COCKPIT.map((p) => {
                const status = statuses[p.numar] ?? 'pre_populat'
                const sty = STATUS_STYLE[status]
                const isActive = !isValidationRoute && p.numar === currentPage
                return (
                  <li key={p.numar}>
                    <NavLink
                      to={`/cockpit/${p.numar}`}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        isActive ? 'bg-[#EEF3FF] border-l-4 border-[#071F80]' : 'hover:bg-[#F6F9FC] border-l-4 border-transparent'
                      }`}
                      title={sty.label}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded text-xs font-mono font-bold flex items-center justify-center border ${
                        isActive ? 'bg-[#071F80] text-white border-[#071F80]' : 'bg-[#F6F9FC] border-[#E6E6E6] text-[#0A2540]/60'
                      }`}>
                        {p.numar}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-[#071F80]' : 'text-[#0A2540]'}`}>
                          {p.titlu_ro}
                        </p>
                        {p.optionala && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0A2540]/40 bg-[#F6F9FC] border border-[#E6E6E6] px-1.5 py-0.5 rounded">
                            opţional
                          </span>
                        )}
                      </div>
                      <span
                        className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${sty.dot}`}
                        aria-label={`status: ${sty.label}`}
                      />
                    </NavLink>
                  </li>
                )
              })}
            </ul>
            <div className="border-t-2 border-[#E6E6E6]">
              <NavLink
                to="/cockpit/validation"
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isValidationRoute
                    ? 'bg-[#EEF3FF] border-l-4 border-[#071F80]'
                    : 'hover:bg-[#F6F9FC] border-l-4 border-transparent'
                }`}
              >
                <span className={`flex-shrink-0 w-6 h-6 rounded text-sm flex items-center justify-center ${
                  isValidationRoute ? 'bg-[#071F80] text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  ✓
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${isValidationRoute ? 'text-[#071F80]' : 'text-[#0A2540]'}`}>
                    Validare finală
                  </p>
                  <p className="text-[10px] text-[#0A2540]/50 uppercase tracking-wider">checklist + submit</p>
                </div>
              </NavLink>
            </div>
          </aside>

          {/* Conţinut pagină */}
          <main className="bg-white border border-[#E6E6E6] rounded-xl shadow-sm min-h-[60vh]">
            <Outlet />
          </main>
        </div>
      </div>
    </CockpitCtx.Provider>
  )
}

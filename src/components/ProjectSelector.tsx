import { useEffect, useState } from 'react'
import { useProjectContext } from '../context/ProjectContext'
import { apiAdapter } from '../data/APIAdapter'
import type { ProjectSummary } from '../data/DataIngestionLayer'
import { calculateAreaScore, calculateGlobalScore, getMaturityLevel } from '../utils/maturityCalculator'
import { MATURITY_INDICATORS } from '../constants/acda.constants'
import { LEVEL_STYLE } from '../theme/levelStyles'
import type { IndicatorCode } from '../types/acda.types'

interface ProjectScoreInfo {
  globalScore: number
  level: keyof typeof LEVEL_STYLE
  hasScores: boolean
}

function computeProjectScore(summary: ProjectSummary): ProjectScoreInfo {
  const scoreByCode: Partial<Record<IndicatorCode, number>> = {}
  for (const s of summary.indicator_scores) {
    if (s.score !== null && s.score !== undefined) {
      scoreByCode[s.indicator_code as IndicatorCode] = s.score
    }
  }
  const hasScores = Object.keys(scoreByCode).length > 0
  if (!hasScores) return { globalScore: 0, level: 'NECONFORM', hasScores: false }

  const ariaScores = { oameni: 0, tehnologie: 0, strategie: 0 }
  const ariaMap: Array<{ key: keyof typeof ariaScores; label: string }> = [
    { key: 'oameni', label: 'Oameni & Adopție' },
    { key: 'tehnologie', label: 'Tehnologie & Date' },
    { key: 'strategie', label: 'Strategie & ROI' },
  ]
  for (const a of ariaMap) {
    const scores = MATURITY_INDICATORS
      .filter((i) => i.aria === a.label)
      .map((i) => scoreByCode[i.id])
      .filter((s): s is number => typeof s === 'number')
    ariaScores[a.key] = calculateAreaScore(scores)
  }
  const globalScore = calculateGlobalScore(ariaScores)
  return { globalScore, level: getMaturityLevel(globalScore), hasScores: true }
}

export default function ProjectSelector() {
  const { setActiveProjectId } = useProjectContext()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiAdapter.listProjects()
      .then((rows) => { if (!cancelled) { setProjects(rows); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(String(err)); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="bg-white border border-[#E6E6E6] rounded-xl p-8 text-center shadow-sm">
        <p className="text-sm text-[#0A2540]/60">Se încarcă proiectele…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-sm text-red-700 font-semibold mb-1">Eroare la încărcare</p>
        <p className="text-xs text-red-700/80">{error}</p>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-[#E6E6E6] rounded-xl p-8 text-center shadow-sm">
        <p className="text-5xl mb-3">📁</p>
        <h2 className="text-xl font-black text-[#071F80] mb-2">Niciun proiect</h2>
        <p className="text-sm text-[#0A2540]/60">
          Rulează <code className="bg-[#F6F9FC] px-1.5 py-0.5 rounded text-xs">npm run db:init</code> pentru a popula cu seed.
        </p>
      </div>
    )
  }

  return (
    <section className="bg-white border border-[#E6E6E6] rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E6E6E6] flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[#0A2540]/50 uppercase tracking-widest">
          Proiecte ({projects.length})
        </h2>
        <span className="text-xs text-[#0A2540]/40">Click pentru a încărca</span>
      </div>
      <ul className="divide-y divide-[#E6E6E6]">
        {projects.map((p) => {
          const info = computeProjectScore(p)
          const cfg = LEVEL_STYLE[info.level]
          return (
            <li key={p.id}>
              <button
                onClick={() => setActiveProjectId(p.id)}
                className="w-full text-left px-5 py-4 hover:bg-[#F6F9FC] transition-colors flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[#0A2540] truncate">
                      {p.client_company_name ?? '—'}
                    </span>
                    <span className="text-xs font-mono bg-[#F6F9FC] border border-[#E6E6E6] text-[#0A2540]/50 px-1.5 py-0.5 rounded">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#0A2540]/60 truncate">{p.name}</p>
                </div>

                <div className="flex-shrink-0 text-right">
                  {info.hasScores ? (
                    <>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className={`text-2xl font-black tabular-nums ${cfg.text}`}>
                          {info.globalScore.toFixed(2)}
                        </span>
                        <span className="text-[#0A2540]/30 text-xs">/ 5</span>
                      </div>
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.chip}`}>
                        {cfg.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-[#0A2540]/40">fără scor</span>
                  )}
                </div>

                <span className="text-[#0A2540]/30 text-lg flex-shrink-0">›</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

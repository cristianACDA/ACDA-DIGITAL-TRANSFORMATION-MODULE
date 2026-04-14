import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProjectContext } from '../context/ProjectContext'
import { MATURITY_INDICATORS, PONDERI_ARII, RULE_1_TO_1_MINIMUM } from '../constants/acda.constants'
import {
  calculateAreaScore,
  calculateGlobalScore,
  getMaturityLevel,
} from '../utils/maturityCalculator'
import { LEVEL_STYLE } from '../theme/levelStyles'
import type { IndicatorCode } from '../types/acda.types'
import ProjectSelector from '../components/ProjectSelector'

const AREA_META = [
  { key: 'oameni'     as const, icon: '👥', label: 'Oameni & Adopție',  aria: 'Oameni & Adopție',   pondere: PONDERI_ARII.oameni     },
  { key: 'tehnologie' as const, icon: '⚙️', label: 'Tehnologie & Date', aria: 'Tehnologie & Date',  pondere: PONDERI_ARII.tehnologie },
  { key: 'strategie'  as const, icon: '📈', label: 'Strategie & ROI',   aria: 'Strategie & ROI',    pondere: PONDERI_ARII.strategie  },
]

function ProjectListView() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div>
        <p className="text-xs text-[#0A2540]/40 uppercase tracking-widest mb-1">Evaluare ACDA</p>
        <h1 className="text-2xl font-black" style={{ color: '#071F80' }}>Dashboard</h1>
        <p className="text-sm text-[#0A2540]/60 mt-1">
          Selectează un proiect pentru a încărca scoruri, EBIT și indicatori.
        </p>
      </div>
      <ProjectSelector />
    </div>
  )
}

function ScoreBar({ value, levelKey }: { value: number; levelKey: keyof typeof LEVEL_STYLE }) {
  const cfg = LEVEL_STYLE[levelKey]
  return (
    <div className="w-full bg-[#E6E6E6] rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-500 ${cfg.bar}`}
        style={{ width: `${(value / 5) * 100}%` }} />
    </div>
  )
}

function formatRON(v: number): string {
  return v.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' RON'
}

export default function Dashboard() {
  const { maturityIndicators, ebitBaseline, activeProjectId, project, client, isHydrating, setActiveProjectId } = useProjectContext()

  if (!activeProjectId) return <ProjectListView />

  const scoreByCode = useMemo(() => {
    const map: Partial<Record<IndicatorCode, number>> = {}
    for (const ind of maturityIndicators) {
      if (typeof ind.score === 'number') map[ind.indicator_code] = ind.score
    }
    return map
  }, [maturityIndicators])

  const hasScores = Object.keys(scoreByCode).length > 0

  const areaScores = useMemo(() => {
    const result = { oameni: 0, tehnologie: 0, strategie: 0 }
    for (const area of AREA_META) {
      const scores = MATURITY_INDICATORS
        .filter((i) => i.aria === area.aria)
        .map((i) => scoreByCode[i.id])
        .filter((s): s is number => typeof s === 'number')
      result[area.key] = calculateAreaScore(scores)
    }
    return result
  }, [scoreByCode])

  const globalScore = useMemo(() => calculateGlobalScore(areaScores), [areaScores])
  const globalLevel = getMaturityLevel(globalScore)
  const globalCfg   = LEVEL_STYLE[globalLevel]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Header + project crumb */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => setActiveProjectId(null)}
            className="text-xs text-[#071F80] hover:underline mb-1 inline-flex items-center gap-1">
            ← Lista proiecte
          </button>
          <h1 className="text-2xl font-black" style={{ color: '#071F80' }}>
            {client?.company_name ?? project?.name ?? 'Dashboard'}
          </h1>
          <p className="text-sm text-[#0A2540]/60 mt-1">
            {project?.name ?? '—'} · status <span className="font-mono text-xs">{project?.status ?? '—'}</span>
            {isHydrating && <span className="ml-2 text-xs text-amber-700">(încarc…)</span>}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <Link to="/deliverables/diagnostic"
            className="bg-white border border-[#071F80] text-[#071F80] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#EEF3FF] transition-colors inline-flex items-center gap-2">
            ⚡ Diagnostic 90s
          </Link>
          <Link to="/deliverables/strategy"
            className="bg-white border border-[#071F80] text-[#071F80] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#EEF3FF] transition-colors inline-flex items-center gap-2">
            🎯 Strategie 10min
          </Link>
          <Link to="/deliverables/ai-readiness"
            className="bg-white border border-[#071F80] text-[#071F80] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#EEF3FF] transition-colors inline-flex items-center gap-2">
            🤖 AI Readiness
          </Link>
          <Link to="/cockpit"
            className="bg-[#071F80] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0A2540] transition-colors inline-flex items-center gap-2">
            📋 Deschide Cockpit →
          </Link>
        </div>
      </div>

      {/* Top row — Global + EBIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Global score */}
        <section className={`lg:col-span-2 rounded-xl border-2 p-6 shadow-sm ${globalCfg.bg} ${globalCfg.border}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[#0A2540]/50 uppercase tracking-widest">Scor Global ACDA — Ponderat</h2>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border ${globalCfg.chip}`}>
              {globalCfg.label}
            </span>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className={`text-6xl font-black tabular-nums ${globalCfg.text}`}>{globalScore.toFixed(2)}</span>
            <span className="text-[#0A2540]/30 text-xl mb-2">/ 5.00</span>
          </div>
          <ScoreBar value={globalScore} levelKey={globalLevel} />
          <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-[#E6E6E6]">
            {AREA_META.map((area) => {
              const v   = areaScores[area.key]
              const cfg = LEVEL_STYLE[getMaturityLevel(v)]
              return (
                <div key={area.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#0A2540]/70">{area.icon} {area.label}</span>
                    <span className="text-xs text-[#0A2540]/40 tabular-nums">×{area.pondere}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className={`text-xl font-black tabular-nums ${cfg.text}`}>{v.toFixed(2)}</span>
                    <span className="text-[#0A2540]/30 text-xs">/ 5</span>
                  </div>
                  <ScoreBar value={v} levelKey={getMaturityLevel(v)} />
                </div>
              )
            })}
          </div>
        </section>

        {/* EBIT card */}
        <section className="bg-white rounded-xl border border-[#E6E6E6] p-5 shadow-sm flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-[#0A2540]/50 uppercase tracking-widest">EBIT Baseline</h2>
          {ebitBaseline ? (
            <>
              <div>
                <p className="text-xs text-[#0A2540]/50 mb-1">EBIT Curent</p>
                <p className="text-lg font-black tabular-nums text-[#0A2540]">
                  {formatRON(ebitBaseline.ebit_current ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#0A2540]/50 mb-1">
                  EBIT Target (+{(ebitBaseline.ebit_target_delta_percent ?? 0).toFixed(1)}%)
                </p>
                <p className="text-lg font-black tabular-nums text-green-700">
                  {formatRON(ebitBaseline.ebit_target ?? 0)}
                </p>
              </div>
              {typeof ebitBaseline.rule_1_to_1_ratio === 'number' && (
                <div className={`rounded-lg p-2.5 border text-xs ${
                  ebitBaseline.rule_1_to_1_ratio >= RULE_1_TO_1_MINIMUM
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <span className="font-bold">Regula 1:1</span> — ratio {ebitBaseline.rule_1_to_1_ratio.toFixed(2)}{' '}
                  {ebitBaseline.rule_1_to_1_ratio >= RULE_1_TO_1_MINIMUM ? '✓' : '✗'}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-[#0A2540]/50 bg-[#F6F9FC] border border-[#E6E6E6] rounded-lg p-3">
              EBIT Baseline nu e completat.{' '}
              <Link to="/intake" className="text-[#071F80] font-semibold hover:underline">Completează →</Link>
            </div>
          )}
        </section>
      </div>

      {/* Indicator table */}
      <section className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#E6E6E6] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#0A2540]/50 uppercase tracking-widest">Indicatori ACDA (9)</h2>
          {!hasScores && (
            <Link to="/maturity" className="text-xs text-[#071F80] font-semibold hover:underline">
              Completează evaluarea →
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6E6E6] bg-[#F6F9FC]">
                <th className="text-left px-5 py-3 text-xs text-[#0A2540]/50 font-semibold uppercase tracking-wider w-12">Cod</th>
                <th className="text-left px-3 py-3 text-xs text-[#0A2540]/50 font-semibold uppercase tracking-wider">Indicator</th>
                <th className="text-left px-3 py-3 text-xs text-[#0A2540]/50 font-semibold uppercase tracking-wider">Arie</th>
                <th className="text-right px-5 py-3 text-xs text-[#0A2540]/50 font-semibold uppercase tracking-wider">Scor</th>
                <th className="text-right px-5 py-3 text-xs text-[#0A2540]/50 font-semibold uppercase tracking-wider w-32">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {MATURITY_INDICATORS.map((ind, i) => {
                const score = scoreByCode[ind.id]
                const has   = typeof score === 'number'
                const cfg   = has ? LEVEL_STYLE[getMaturityLevel(score)] : null
                return (
                  <tr key={ind.id} className={`border-b border-[#E6E6E6] hover:bg-[#F6F9FC] transition-colors ${i % 2 !== 0 ? 'bg-[#F6F9FC]' : 'bg-white'}`}>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-bold text-[#0A2540]/50 bg-[#F6F9FC] border border-[#E6E6E6] px-1.5 py-0.5 rounded">{ind.id}</span>
                    </td>
                    <td className="px-3 py-3 text-[#0A2540] font-medium">{ind.name}</td>
                    <td className="px-3 py-3 text-[#0A2540]/50 text-xs">{ind.aria}</td>
                    <td className="px-5 py-3 text-right">
                      {has && cfg
                        ? <span className={`font-bold tabular-nums ${cfg.text}`}>{score.toFixed(1)}</span>
                        : <span className="text-[#0A2540]/30 tabular-nums">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {has && cfg
                        ? <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${cfg.chip}`}>{cfg.label}</span>
                        : <span className="text-xs text-[#0A2540]/30">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E6E6E6] bg-[#F6F9FC]">
                <td colSpan={3} className="px-5 py-3 text-xs font-bold text-[#0A2540] uppercase tracking-wider">
                  Scor Global (ponderat)
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-black tabular-nums text-base ${globalCfg.text}`}>{globalScore.toFixed(2)}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${globalCfg.chip}`}>{globalCfg.label}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}

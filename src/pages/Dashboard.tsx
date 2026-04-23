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
        <p className="text-xs text-[color:var(--color-text-body)]/40 uppercase tracking-widest mb-1">Evaluare ACDA</p>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-[color:var(--color-text-body)]/60 mt-1">
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
    <div className="w-full bg-[color:var(--color-border-subtle)] rounded-full h-2 overflow-hidden">
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
            className="text-xs text-[color:var(--color-text-primary)] hover:underline mb-1 inline-flex items-center gap-1">
            ← Lista proiecte
          </button>
          <h1 className="text-2xl font-semibold text-text-primary">
            {client?.company_name ?? project?.name ?? 'Dashboard'}
          </h1>
          <p className="text-sm text-[color:var(--color-text-body)]/60 mt-1">
            {project?.name ?? '—'} · status <span className="font-mono text-xs">{project?.status ?? '—'}</span>
            {isHydrating && <span className="ml-2 text-xs text-accent-warning">(încarc…)</span>}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <Link to="/deliverables/diagnostic"
            className="bg-white border border-[color:var(--color-text-primary)] text-[color:var(--color-text-primary)] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[color:var(--color-subtle)] transition-colors inline-flex items-center gap-2">
            ⚡ Diagnostic 90s
          </Link>
          <Link to="/deliverables/strategy"
            className="bg-white border border-[color:var(--color-text-primary)] text-[color:var(--color-text-primary)] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[color:var(--color-subtle)] transition-colors inline-flex items-center gap-2">
            🎯 Strategie 10min
          </Link>
          <Link to="/deliverables/ai-readiness"
            className="bg-white border border-[color:var(--color-text-primary)] text-[color:var(--color-text-primary)] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[color:var(--color-subtle)] transition-colors inline-flex items-center gap-2">
            🤖 AI Readiness
          </Link>
          <Link to="/cockpit"
            className="bg-[color:var(--color-text-primary)] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[color:var(--color-text-body)] transition-colors inline-flex items-center gap-2">
            📋 Deschide Cockpit →
          </Link>
        </div>
      </div>

      {/* Top row — Global + EBIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Global score */}
        <section className={`lg:col-span-2 rounded-lg border p-6 shadow-sm ${globalCfg.bg} ${globalCfg.border}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[color:var(--color-text-body)]/50 uppercase tracking-widest">Scor Global ACDA — Ponderat</h2>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border ${globalCfg.chip}`}>
              {globalCfg.label}
            </span>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className={`text-6xl font-semibold tabular-nums ${globalCfg.text}`}>{globalScore.toFixed(2)}</span>
            <span className="text-[color:var(--color-text-body)]/30 text-xl mb-2">/ 5.00</span>
          </div>
          <ScoreBar value={globalScore} levelKey={globalLevel} />
          <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-[color:var(--color-border-subtle)]">
            {AREA_META.map((area) => {
              const v   = areaScores[area.key]
              const cfg = LEVEL_STYLE[getMaturityLevel(v)]
              return (
                <div key={area.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[color:var(--color-text-body)]/70">{area.icon} {area.label}</span>
                    <span className="text-xs text-[color:var(--color-text-body)]/40 tabular-nums">×{area.pondere}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className={`text-xl font-semibold tabular-nums ${cfg.text}`}>{v.toFixed(2)}</span>
                    <span className="text-[color:var(--color-text-body)]/30 text-xs">/ 5</span>
                  </div>
                  <ScoreBar value={v} levelKey={getMaturityLevel(v)} />
                </div>
              )
            })}
          </div>
        </section>

        {/* EBIT card */}
        <section className="bg-white rounded-lg border border-[color:var(--color-border-subtle)] p-5 shadow-sm flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-[color:var(--color-text-body)]/50 uppercase tracking-widest">EBIT Baseline</h2>
          {ebitBaseline ? (
            <>
              <div>
                <p className="text-xs text-[color:var(--color-text-body)]/50 mb-1">EBIT Curent</p>
                <p className="text-lg font-semibold tabular-nums text-[color:var(--color-text-body)]">
                  {formatRON(ebitBaseline.ebit_current ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[color:var(--color-text-body)]/50 mb-1">
                  EBIT Target (+{(ebitBaseline.ebit_target_delta_percent ?? 0).toFixed(1)}%)
                </p>
                <p className="text-lg font-semibold tabular-nums text-accent-success">
                  {formatRON(ebitBaseline.ebit_target ?? 0)}
                </p>
              </div>
              {typeof ebitBaseline.rule_1_to_1_ratio === 'number' && (
                <div className={`rounded-lg p-2.5 border text-xs ${
                  ebitBaseline.rule_1_to_1_ratio >= RULE_1_TO_1_MINIMUM
                    ? 'bg-[color:rgba(34,197,94,0.08)] border-border-subtle text-accent-success'
                    : 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle text-accent-warning'
                }`}>
                  <span className="font-bold">Regula 1:1</span> — ratio {ebitBaseline.rule_1_to_1_ratio.toFixed(2)}{' '}
                  {ebitBaseline.rule_1_to_1_ratio >= RULE_1_TO_1_MINIMUM ? '✓' : '✗'}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-[color:var(--color-text-body)]/50 bg-[color:var(--color-page)] border border-[color:var(--color-border-subtle)] rounded-lg p-3">
              EBIT Baseline nu e completat.{' '}
              <Link to="/intake" className="text-[color:var(--color-text-primary)] font-semibold hover:underline">Completează →</Link>
            </div>
          )}
        </section>
      </div>

      {/* Indicator table */}
      <section className="bg-white rounded-lg border border-[color:var(--color-border-subtle)] overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[color:var(--color-border-subtle)] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[color:var(--color-text-body)]/50 uppercase tracking-widest">Indicatori ACDA (9)</h2>
          {!hasScores && (
            <Link to="/maturity" className="text-xs text-[color:var(--color-text-primary)] font-semibold hover:underline">
              Completează evaluarea →
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)]">
                <th className="text-left px-5 py-3 text-xs text-[color:var(--color-text-body)]/50 font-semibold uppercase tracking-wider w-12">Cod</th>
                <th className="text-left px-3 py-3 text-xs text-[color:var(--color-text-body)]/50 font-semibold uppercase tracking-wider">Indicator</th>
                <th className="text-left px-3 py-3 text-xs text-[color:var(--color-text-body)]/50 font-semibold uppercase tracking-wider">Arie</th>
                <th className="text-right px-5 py-3 text-xs text-[color:var(--color-text-body)]/50 font-semibold uppercase tracking-wider">Scor</th>
                <th className="text-right px-5 py-3 text-xs text-[color:var(--color-text-body)]/50 font-semibold uppercase tracking-wider w-32">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {MATURITY_INDICATORS.map((ind, i) => {
                const score = scoreByCode[ind.id]
                const has   = typeof score === 'number'
                const cfg   = has ? LEVEL_STYLE[getMaturityLevel(score)] : null
                return (
                  <tr key={ind.id} className={`border-b border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-page)] transition-colors ${i % 2 !== 0 ? 'bg-[color:var(--color-page)]' : 'bg-white'}`}>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-bold text-[color:var(--color-text-body)]/50 bg-[color:var(--color-page)] border border-[color:var(--color-border-subtle)] px-1.5 py-0.5 rounded">{ind.id}</span>
                    </td>
                    <td className="px-3 py-3 text-[color:var(--color-text-body)] font-medium">{ind.name}</td>
                    <td className="px-3 py-3 text-[color:var(--color-text-body)]/50 text-xs">{ind.aria}</td>
                    <td className="px-5 py-3 text-right">
                      {has && cfg
                        ? <span className={`font-bold tabular-nums ${cfg.text}`}>{score.toFixed(1)}</span>
                        : <span className="text-[color:var(--color-text-body)]/30 tabular-nums">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {has && cfg
                        ? <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${cfg.chip}`}>{cfg.label}</span>
                        : <span className="text-xs text-[color:var(--color-text-body)]/30">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)]">
                <td colSpan={3} className="px-5 py-3 text-xs font-bold text-[color:var(--color-text-body)] uppercase tracking-wider">
                  Scor Global (ponderat)
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-semibold tabular-nums text-base ${globalCfg.text}`}>{globalScore.toFixed(2)}</span>
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

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConfidenceField from '../../../components/ConfidenceField'
import ArchitectureRadar from '../../../components/ArchitectureRadar'
import { useProjectContext } from '../../../context/ProjectContext'
import { LEVEL_STYLE } from '../../../theme/levelStyles'
import {
  calculateAreaScore,
  calculateGlobalScore,
  getMaturityLevel,
} from '../../../utils/maturityCalculator'
import {
  ARCH_DEFINITIONS,
  mapSetulAToArchitectures,
  normalizeIndicator,
  type IndicatorScores,
} from '../../../lib/methodology'
import type { ConfidenceLevelExtended } from '../../../types/confidence'
import type { MaturityIndicator } from '../../../types/acda.types'

type Lens = 'arhitecturi' | 'setulA'

const LENS_DEFAULT: Lens = 'arhitecturi'

/** Citește scorurile indicatorilor într-un map cheiat pe cod (formă scurtă sau lungă). */
function toIndicatorScores(indicators: MaturityIndicator[]): IndicatorScores {
  const out: IndicatorScores = {}
  for (const ind of indicators) {
    if (typeof ind.score === 'number') out[ind.indicator_code] = ind.score
  }
  return out
}

/** Scor global ACDA (medie ponderată pe arii) din indicatorii de maturitate. */
function globalFromIndicators(indicators: MaturityIndicator[]): number {
  const buckets: Record<'oameni' | 'tehnologie' | 'strategie', number[]> = {
    oameni: [],
    tehnologie: [],
    strategie: [],
  }
  for (const ind of indicators) {
    if (typeof ind.score !== 'number') continue
    const key = normalizeIndicator(ind.indicator_code)
    if (!key) continue
    if (key.startsWith('O')) buckets.oameni.push(ind.score)
    else if (key.startsWith('T')) buckets.tehnologie.push(ind.score)
    else if (key.startsWith('S')) buckets.strategie.push(ind.score)
  }
  return calculateGlobalScore({
    oameni: calculateAreaScore(buckets.oameni),
    tehnologie: calculateAreaScore(buckets.tehnologie),
    strategie: calculateAreaScore(buckets.strategie),
  })
}

/** Comutator de lentilă [Cele 6 Arhitecturi] [Setul A v1.1]. */
function LensToggle({ lens, onChange }: { lens: Lens; onChange: (l: Lens) => void }) {
  const base =
    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-text-primary)]/30'
  const active = 'bg-[color:var(--color-text-primary)] text-white'
  const idle = 'text-[color:var(--color-text-body)]/60 hover:text-[color:var(--color-text-body)]'
  return (
    <div
      role="tablist"
      aria-label="Lentilă scor maturitate"
      className="inline-flex gap-1 p-1 bg-subtle border border-[color:var(--color-border-subtle)] rounded-lg"
    >
      <button
        type="button"
        role="tab"
        aria-selected={lens === 'arhitecturi'}
        className={`${base} ${lens === 'arhitecturi' ? active : idle}`}
        onClick={() => onChange('arhitecturi')}
      >
        Cele 6 Arhitecturi
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={lens === 'setulA'}
        className={`${base} ${lens === 'setulA' ? active : idle}`}
        onClick={() => onChange('setulA')}
      >
        Setul A v1.1
      </button>
    </div>
  )
}

/** Lentila „Cele 6 Arhitecturi": hexagon + scor global + carduri scor/nivel (fără narativ). */
function ArhitecturiLens({ indicators }: { indicators: MaturityIndicator[] }) {
  const arch = useMemo(() => mapSetulAToArchitectures(toIndicatorScores(indicators)), [indicators])
  const global = useMemo(() => globalFromIndicators(indicators), [indicators])
  const globalNivel = getMaturityLevel(global)
  const gcfg = LEVEL_STYLE[globalNivel]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] items-center">
        <div className="bg-[color:var(--color-page)] border border-[color:var(--color-border-subtle)] rounded-lg p-4">
          <ArchitectureRadar values={arch} />
        </div>
        <div className={`rounded-lg border p-5 text-center min-w-[160px] ${gcfg.border} ${gcfg.bg}`}>
          <p className="text-xs text-[color:var(--color-text-body)]/50 mb-1">Scor global ACDA</p>
          <p className={`text-4xl font-semibold tabular-nums ${gcfg.text}`}>{global.toFixed(2)}</p>
          <p className="text-[color:var(--color-text-body)]/30 text-xs mb-2">/ 5</p>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${gcfg.chip}`}>
            {gcfg.label}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {arch.map((a) => {
          const cfg = LEVEL_STYLE[a.nivel]
          const def = ARCH_DEFINITIONS[a.key]
          return (
            <div key={a.key} className={`border rounded-lg p-4 ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[color:var(--color-text-body)]">{def.nume}</h3>
                <span className={`text-2xl font-semibold tabular-nums ${cfg.text}`}>{a.scor.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[color:var(--color-text-body)]/50 mb-2">{def.descriere}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${cfg.chip}`}>{cfg.label}</span>
                <span className="font-mono text-[10px] text-[color:var(--color-text-body)]/40">
                  {a.contribuitori.join(' · ')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface IndState {
  comment: string
}

/** Lentila „Setul A v1.1": tabelul tehnic editabil existent (9 indicatori). */
function SetulALens({ indicators }: { indicators: MaturityIndicator[] }) {
  const [comments, setComments] = useState<Record<string, IndState>>(() => {
    const init: Record<string, IndState> = {}
    for (const ind of indicators) init[ind.indicator_code] = { comment: ind.consultant_comment ?? '' }
    return init
  })

  return (
    <section className="flex flex-col gap-4">
      {indicators
        .slice()
        .sort((a, b) => a.indicator_code.localeCompare(b.indicator_code))
        .map((ind) => {
          const score = ind.score ?? 0
          const cfg = LEVEL_STYLE[getMaturityLevel(score)]
          const lvl = (ind.confidence_level ?? 'MEDIUM') as ConfidenceLevelExtended
          return (
            <div key={ind.indicator_code} className={`border rounded-lg p-4 ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="font-mono text-xs font-bold bg-white border border-[color:var(--color-border-subtle)] text-[color:var(--color-text-body)]/60 px-1.5 py-0.5 rounded">
                    {ind.indicator_code}
                  </span>
                  <h3 className="text-sm font-semibold text-[color:var(--color-text-body)] mt-1">{ind.indicator_name ?? ind.indicator_code}</h3>
                  <p className="text-xs text-[color:var(--color-text-body)]/50">{ind.area ?? ''}</p>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-semibold tabular-nums ${cfg.text}`}>{score.toFixed(1)}</span>
                  <span className="text-[color:var(--color-text-body)]/30 text-xs ml-1">/ 5</span>
                </div>
              </div>
              <ConfidenceField
                label="Justificare consultant"
                value={comments[ind.indicator_code]?.comment ?? ''}
                onChange={(v) => setComments((p) => ({ ...p, [ind.indicator_code]: { comment: v } }))}
                type="textarea"
                confidence={ind.confidence ?? 0.5}
                confidenceLevel={lvl}
                dataSource={ind.data_source ?? null}
                fieldId={`mat.${ind.indicator_code}.comment`}
              />
            </div>
          )
        })}
    </section>
  )
}

export default function MaturitateACDA() {
  const { maturityIndicators } = useProjectContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const lens: Lens = searchParams.get('lens') === 'setulA' ? 'setulA' : LENS_DEFAULT

  const setLens = (l: Lens) => {
    const next = new URLSearchParams(searchParams)
    if (l === LENS_DEFAULT) next.delete('lens')
    else next.set('lens', l)
    setSearchParams(next, { replace: true })
  }

  if (maturityIndicators.length === 0) {
    return (
      <div className="bg-[color:var(--color-page)] border border-dashed border-[color:var(--color-border-subtle)] rounded-lg px-5 py-8 text-center">
        <p className="text-sm text-[color:var(--color-text-body)]/60">
          Niciun indicator încă. Completează evaluarea în pagina <strong>Maturitate &amp; Risc</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <LensToggle lens={lens} onChange={setLens} />
      </div>
      {lens === 'arhitecturi' ? (
        <ArhitecturiLens indicators={maturityIndicators} />
      ) : (
        <SetulALens indicators={maturityIndicators} />
      )}
    </div>
  )
}

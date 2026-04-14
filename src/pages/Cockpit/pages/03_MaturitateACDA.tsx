import { useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import { LEVEL_STYLE } from '../../../theme/levelStyles'
import { getMaturityLevel } from '../../../utils/maturityCalculator'
import type { ConfidenceLevelExtended } from '../../../types/confidence'

interface IndState {
  comment: string
}

export default function MaturitateACDA() {
  const { maturityIndicators } = useProjectContext()
  const [comments, setComments] = useState<Record<string, IndState>>(() => {
    const init: Record<string, IndState> = {}
    for (const ind of maturityIndicators) {
      init[ind.indicator_code] = { comment: ind.consultant_comment ?? '' }
    }
    return init
  })

  if (maturityIndicators.length === 0) {
    return (
      <div className="bg-[#F6F9FC] border border-dashed border-[#E6E6E6] rounded-lg px-5 py-8 text-center">
        <p className="text-sm text-[#0A2540]/60">
          Niciun indicator încă. Completează evaluarea în pagina <strong>Maturitate &amp; Risc</strong>.
        </p>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      {maturityIndicators
        .slice()
        .sort((a, b) => a.indicator_code.localeCompare(b.indicator_code))
        .map((ind) => {
          const score = ind.score ?? 0
          const cfg = LEVEL_STYLE[getMaturityLevel(score)]
          const lvl = (ind.confidence_level ?? 'MEDIUM') as ConfidenceLevelExtended
          return (
            <div key={ind.indicator_code} className={`border rounded-xl p-4 ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="font-mono text-xs font-bold bg-white border border-[#E6E6E6] text-[#0A2540]/60 px-1.5 py-0.5 rounded">
                    {ind.indicator_code}
                  </span>
                  <h3 className="text-sm font-semibold text-[#0A2540] mt-1">{ind.indicator_name ?? ind.indicator_code}</h3>
                  <p className="text-xs text-[#0A2540]/50">{ind.area ?? ''}</p>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-black tabular-nums ${cfg.text}`}>{score.toFixed(1)}</span>
                  <span className="text-[#0A2540]/30 text-xs ml-1">/ 5</span>
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

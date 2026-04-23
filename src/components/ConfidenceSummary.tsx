import { useParams } from 'react-router-dom'
import { useCockpit } from '../layouts/CockpitLayout'
import { CONFIDENCE_STYLE } from './ConfidenceIndicator'
import type { ConfidenceLevelExtended } from '../types/confidence'

const ORDER: ConfidenceLevelExtended[] = ['HIGH', 'MEDIUM', 'LOW', 'MANUAL']

export default function ConfidenceSummary() {
  const { pageNum: pageNumStr } = useParams<{ pageNum?: string }>()
  const pageNum = Number(pageNumStr ?? '1')
  const { fieldsByPage } = useCockpit()

  const fields = Object.values(fieldsByPage[pageNum] ?? {})
  const counts: Record<ConfidenceLevelExtended, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, MANUAL: 0 }
  for (const f of fields) counts[f.confidence_level] += 1

  if (fields.length === 0) {
    return (
      <span className="text-xs text-[color:var(--color-text-body)]/40 italic">Niciun câmp pe această pagină</span>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ORDER.map((lvl) => {
        const sty = CONFIDENCE_STYLE[lvl]
        const n = counts[lvl]
        return (
          <span key={lvl}
            className={`inline-flex items-center gap-1.5 text-xs font-bold tabular-nums px-2 py-1 rounded border ${
              n > 0 ? sty.chip : 'bg-[color:var(--color-page)] border-[color:var(--color-border-subtle)] text-[color:var(--color-text-body)]/30'
            }`}
            title={`${n} câmp(uri) cu nivel ${sty.label}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${n > 0 ? sty.dot : 'bg-[color:var(--color-text-body)]/20'}`} />
            {n} <span className="font-normal opacity-70">{sty.label.toLowerCase()}</span>
          </span>
        )
      })}
    </div>
  )
}

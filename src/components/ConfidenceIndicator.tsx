import type { ConfidenceLevelExtended } from '../types/confidence'

interface ConfidenceIndicatorProps {
  confidence: number
  confidenceLevel: ConfidenceLevelExtended
  dataSource?: string | null
  /** Render compact ca mic dot (default true) — dacă false, badge cu label. */
  compact?: boolean
}

export const CONFIDENCE_STYLE: Record<ConfidenceLevelExtended, {
  dot: string; ring: string; chip: string; label: string; border: string
}> = {
  HIGH:   { dot: 'bg-green-500',   ring: 'ring-green-200',   chip: 'bg-green-50 border-green-200 text-green-700',     label: 'HIGH',   border: 'border-green-300' },
  MEDIUM: { dot: 'bg-amber-500',   ring: 'ring-amber-200',   chip: 'bg-amber-50 border-amber-200 text-amber-700',     label: 'MEDIUM', border: 'border-amber-300' },
  LOW:    { dot: 'bg-red-500',     ring: 'ring-red-200',     chip: 'bg-red-50 border-red-200 text-red-700',           label: 'LOW',    border: 'border-red-300' },
  MANUAL: { dot: 'bg-[#071F80]',   ring: 'ring-blue-200',    chip: 'bg-blue-50 border-blue-200 text-[#071F80]',       label: 'MANUAL', border: 'border-blue-300' },
}

export default function ConfidenceIndicator({
  confidence, confidenceLevel, dataSource, compact = true,
}: ConfidenceIndicatorProps) {
  const sty = CONFIDENCE_STYLE[confidenceLevel]
  const tip = `Confidence: ${confidence.toFixed(2)} · ${sty.label}${dataSource ? ` · sursă: ${dataSource}` : ''}`

  if (!compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sty.chip}`}
            title={tip}>
        <span className={`w-1.5 h-1.5 rounded-full ${sty.dot}`} />
        {sty.label} {confidence.toFixed(2)}
      </span>
    )
  }

  return (
    <span className="relative inline-flex group" title={tip}>
      <span className={`w-2.5 h-2.5 rounded-full ${sty.dot} ring-2 ${sty.ring}`} aria-label={tip} />
      {/* Tooltip vizual (hover) — title rămâne fallback. */}
      <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0A2540] text-white text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {sty.label} · {confidence.toFixed(2)}
        {dataSource && <span className="text-white/60"> · {dataSource}</span>}
      </span>
    </span>
  )
}

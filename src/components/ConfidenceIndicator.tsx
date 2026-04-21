import type { ConfidenceLevelExtended } from '../types/confidence'

interface ConfidenceIndicatorProps {
  confidence: number
  confidenceLevel: ConfidenceLevelExtended
  dataSource?: string | null
  /** Render compact ca mic dot (default true) — dacă false, badge cu label. */
  compact?: boolean
}

export const CONFIDENCE_STYLE: Record<ConfidenceLevelExtended, {
  dot: string; chip: string; label: string; border: string
}> = {
  HIGH:   { dot: 'bg-accent-success', chip: 'bg-subtle text-accent-success',  label: 'HIGH',   border: 'border-border-subtle' },
  MEDIUM: { dot: 'bg-accent-warning', chip: 'bg-subtle text-accent-warning',  label: 'MEDIUM', border: 'border-border-subtle' },
  LOW:    { dot: 'bg-accent-danger',  chip: 'bg-subtle text-accent-danger',   label: 'LOW',    border: 'border-border-subtle' },
  MANUAL: { dot: 'bg-accent-primary', chip: 'bg-subtle text-accent-primary',  label: 'MANUAL', border: 'border-border-subtle' },
}

export default function ConfidenceIndicator({
  confidence, confidenceLevel, dataSource, compact = true,
}: ConfidenceIndicatorProps) {
  const sty = CONFIDENCE_STYLE[confidenceLevel]
  const tip = `Confidence: ${confidence.toFixed(2)} · ${sty.label}${dataSource ? ` · sursă: ${dataSource}` : ''}`

  if (!compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-sm ${sty.chip}`}
            title={tip}>
        <span className={`w-1.5 h-1.5 rounded-full ${sty.dot}`} aria-hidden="true" />
        {sty.label} {confidence.toFixed(2)}
      </span>
    )
  }

  return (
    <span className="relative inline-flex group" title={tip}>
      <span className={`w-1.5 h-1.5 rounded-full ${sty.dot}`} aria-label={tip} />
      <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-text-body text-white text-[11px] px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {sty.label} · {confidence.toFixed(2)}
        {dataSource && <span className="text-white/60"> · {dataSource}</span>}
      </span>
    </span>
  )
}

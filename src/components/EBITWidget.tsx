import { useProjectContext } from '../context/ProjectContext'

function formatRON(value: number): string {
  return value.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' RON'
}

export default function EBITWidget() {
  const { ebitBaseline } = useProjectContext()

  if (ebitBaseline === null) return null

  const { ebit_target_delta_percent, ebit_target, ebit_current } = ebitBaseline

  const deltaPercent = ebit_target_delta_percent ?? 0
  const deltaRON     = (ebit_target ?? 0) - (ebit_current ?? 0)
  const coverage     = 0  // Sprint 2: calculat din inițiative

  const deltaPct = deltaPercent >= 0 ? 'text-accent-success' : 'text-accent-warning'
  const deltaRONCls = deltaRON >= 0 ? 'text-accent-success' : 'text-accent-warning'
  const coverageCls = coverage >= 100
    ? 'text-accent-success'
    : coverage > 0
      ? 'text-accent-primary'
      : 'text-text-muted'

  return (
    <div className="hidden md:flex items-center gap-5 text-[12px] tabular-nums">
      <KPI label="EBIT Target" value={`${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`} cls={deltaPct} />
      <span className="w-px h-5 bg-border-subtle" aria-hidden="true" />
      <KPI label="Delta vizat" value={`${deltaRON >= 0 ? '+' : ''}${formatRON(deltaRON)}`} cls={deltaRONCls} />
      <span className="w-px h-5 bg-border-subtle" aria-hidden="true" />
      <KPI label="Acoperit" value={`${coverage}%`} cls={coverageCls} />
    </div>
  )
}

function KPI({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">{label}</span>
      <span className={`font-medium ${cls}`}>{value}</span>
    </div>
  )
}

import { useCockpit } from '../layouts/CockpitLayout'

export default function CockpitProgress() {
  const { validatedCount, totalPages } = useCockpit()
  const pct = totalPages > 0 ? (validatedCount / totalPages) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[color:var(--color-text-body)]/60 uppercase tracking-widest">
          Progres validare
        </span>
        <span className="text-xs font-bold text-[color:var(--color-text-primary)] tabular-nums">
          {validatedCount} din {totalPages} validate
        </span>
      </div>
      <div className="w-full bg-[color:var(--color-border-subtle)] rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-[color:var(--color-text-primary)] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

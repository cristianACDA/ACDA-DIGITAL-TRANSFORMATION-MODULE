import { useCockpit } from '../layouts/CockpitLayout'

export default function CockpitProgress() {
  const { validatedCount, totalPages } = useCockpit()
  const pct = totalPages > 0 ? (validatedCount / totalPages) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[#0A2540]/60 uppercase tracking-widest">
          Progres validare
        </span>
        <span className="text-xs font-bold text-[#071F80] tabular-nums">
          {validatedCount} din {totalPages} validate
        </span>
      </div>
      <div className="w-full bg-[#E6E6E6] rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-[#071F80] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

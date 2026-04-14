import { useProjectContext } from '../context/ProjectContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRON(value: number): string {
  return value.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' RON'
}

function coverageStyle(pct: number): { text: string; bg: string; dot: string } {
  if (pct >= 100) return { text: 'text-[#48D56F]',  bg: 'bg-white/10', dot: 'bg-[#48D56F]'  }
  if (pct >= 50)  return { text: 'text-amber-300',   bg: 'bg-white/10', dot: 'bg-amber-300'   }
  return             { text: 'text-red-300',      bg: 'bg-white/10', dot: 'bg-red-300'      }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EBITWidget() {
  const { ebitBaseline } = useProjectContext()

  if (ebitBaseline === null) return null

  const { ebit_target_delta_percent, ebit_target, ebit_current } = ebitBaseline

  const deltaPercent = ebit_target_delta_percent ?? 0
  const deltaRON     = (ebit_target ?? 0) - (ebit_current ?? 0)
  const coverage     = 0  // Sprint 2: calculat din inițiative

  const style = coverageStyle(coverage)

  return (
    <div className="flex items-center rounded-lg border border-white/20 overflow-hidden text-xs font-medium">

      {/* Segment 1 — Target % */}
      <div className="bg-white/10 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-white/60">EBIT Target</span>
        <span className="text-[#48D56F] font-bold tabular-nums">
          +{deltaPercent.toFixed(1)}%
        </span>
      </div>

      <div className="w-px h-5 bg-white/20" />

      {/* Segment 2 — Delta RON */}
      <div className="bg-white/10 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-white/60">Delta vizat</span>
        <span className="text-white font-bold tabular-nums">
          {deltaRON >= 0 ? '+' : ''}{formatRON(deltaRON)}
        </span>
      </div>

      <div className="w-px h-5 bg-white/20" />

      {/* Segment 3 — Coverage */}
      <div className={`px-3 py-1.5 flex items-center gap-1.5 ${style.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
        <span className="text-white/60">Acoperit</span>
        <span className={`font-bold tabular-nums ${style.text}`}>{coverage}%</span>
      </div>

    </div>
  )
}

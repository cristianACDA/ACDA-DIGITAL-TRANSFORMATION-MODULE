import { useCockpit } from '../layouts/CockpitLayout'

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function barClass(seconds: number): string {
  if (seconds < 15 * 60) return 'bg-accent-primary'
  if (seconds < 30 * 60) return 'bg-accent-warning'
  return 'bg-accent-danger'
}

export default function ConsultantTimer() {
  const { timerSeconds, timerPaused, toggleTimer, resetTimer } = useCockpit()
  const targetMin = 30
  const pct = Math.min(100, (timerSeconds / (targetMin * 60)) * 100)

  return (
    <div className="bg-subtle rounded-md px-4 py-3 flex flex-col gap-2 min-w-[200px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
          Timer validare
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTimer}
            title={timerPaused ? 'Reia' : 'Pauză'}
            className="w-6 h-6 flex items-center justify-center text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            {timerPaused ? '▶' : '❚❚'}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            title="Reset timer"
            className="w-6 h-6 flex items-center justify-center text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            ↺
          </button>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-medium text-text-primary tabular-nums leading-none">
          {fmt(timerSeconds)}
        </span>
        <span className="text-sm text-text-secondary">/ țintă {targetMin} min</span>
        {timerPaused && (
          <span className="text-[10px] text-accent-warning font-medium ml-auto">PAUZĂ</span>
        )}
      </div>
      <div className="w-full bg-border-subtle rounded-full h-1 overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all ${barClass(timerSeconds)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

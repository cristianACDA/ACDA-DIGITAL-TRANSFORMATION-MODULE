import { useCockpit } from '../layouts/CockpitLayout'

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function colorFor(seconds: number): { text: string; bg: string; border: string; bar: string } {
  if (seconds < 15 * 60)  return { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500' }
  if (seconds < 30 * 60)  return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500' }
  return                          { text: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   bar: 'bg-red-500' }
}

export default function ConsultantTimer() {
  const { timerSeconds, timerPaused, toggleTimer, resetTimer } = useCockpit()
  const c = colorFor(timerSeconds)
  const targetMin = 30
  const pct = Math.min(100, (timerSeconds / (targetMin * 60)) * 100)

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-3 py-2 flex flex-col gap-1.5 min-w-[180px]`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#0A2540]/60">
          Timer validare
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={toggleTimer}
            title={timerPaused ? 'Reia' : 'Pauză'}
            className="text-xs px-1.5 py-0.5 rounded border border-[#E6E6E6] bg-white hover:border-[#071F80] text-[#071F80]">
            {timerPaused ? '▶' : '❚❚'}
          </button>
          <button type="button" onClick={resetTimer}
            title="Reset timer"
            className="text-xs px-1.5 py-0.5 rounded border border-[#E6E6E6] bg-white hover:border-[#071F80] text-[#0A2540]/60">
            ↺
          </button>
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-black tabular-nums ${c.text}`}>{fmt(timerSeconds)}</span>
        <span className="text-[10px] text-[#0A2540]/40">/ ţintă {targetMin} min</span>
        {timerPaused && <span className="text-[10px] text-amber-700 font-bold ml-1">PAUZĂ</span>}
      </div>
      <div className="w-full bg-[#E6E6E6] rounded-full h-1 overflow-hidden">
        <div className={`h-1 rounded-full transition-all ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

import { useState } from 'react'

interface Phase {
  nume: string
  durata_sapt: number
  buget_tech: number
  buget_adoptie: number
  scop: string
}

const DEFAULT_PHASES: Phase[] = [
  { nume: 'Faza 1 — Discovery & Pilot', durata_sapt: 8,  buget_tech: 200000, buget_adoptie: 200000, scop: 'Pilot pe un singur use case (chatbot tier-1).' },
  { nume: 'Faza 2 — Foundations',       durata_sapt: 12, buget_tech: 600000, buget_adoptie: 600000, scop: 'Data products + API gateway + training echipă.' },
  { nume: 'Faza 3 — Scale',             durata_sapt: 16, buget_tech: 1200000, buget_adoptie: 1200000, scop: 'Roll-out AI lead scoring + churn predictor.' },
  { nume: 'Faza 4 — Operationalize',    durata_sapt: 12, buget_tech: 400000, buget_adoptie: 400000, scop: 'Guvernanţă, monitorizare, optimizare continuă.' },
]

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#071F80]'

export default function ImplementationRoadmap() {
  const [phases, setPhases] = useState<Phase[]>(DEFAULT_PHASES)

  const update = (i: number, k: keyof Phase, v: string) => setPhases((p) => p.map((ph, idx) => {
    if (idx !== i) return ph
    const num = (k === 'nume' || k === 'scop') ? v : Number(v)
    return { ...ph, [k]: num as never }
  }))

  return (
    <section className="flex flex-col gap-4">
      <p className="text-xs text-[#0A2540]/50 italic">
        Timeline pe 4 faze ACDA. Bugetele Tech &amp; Adopţie urmăresc Regula 1:1 (CM ≥ Tech).
      </p>
      <div className="grid gap-3">
        {phases.map((ph, i) => {
          const ratio = ph.buget_tech > 0 ? ph.buget_adoptie / ph.buget_tech : 0
          const ok = ratio >= 1.0
          return (
            <div key={i} className="border border-[#E6E6E6] rounded-xl p-4 bg-white flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <input value={ph.nume} onChange={(e) => update(i, 'nume', e.target.value)}
                  className={`${cellCls} font-bold text-sm flex-1`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  ok ? 'bg-green-50 border-green-200 text-green-700'
                     : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  Regula 1:1 — ratio {ratio.toFixed(2)} {ok ? '✓' : '✗'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#0A2540]/50 mb-1">Durată (săpt)</label>
                  <input type="number" value={ph.durata_sapt} onChange={(e) => update(i, 'durata_sapt', e.target.value)} className={`${cellCls} tabular-nums`} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#0A2540]/50 mb-1">Buget Tech (RON)</label>
                  <input type="number" value={ph.buget_tech} onChange={(e) => update(i, 'buget_tech', e.target.value)} className={`${cellCls} tabular-nums`} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#0A2540]/50 mb-1">Buget Adopţie (RON)</label>
                  <input type="number" value={ph.buget_adoptie} onChange={(e) => update(i, 'buget_adoptie', e.target.value)} className={`${cellCls} tabular-nums`} />
                </div>
              </div>
              <textarea rows={2} value={ph.scop} placeholder="Scop fază"
                onChange={(e) => update(i, 'scop', e.target.value)}
                className={`${cellCls} resize-none`} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

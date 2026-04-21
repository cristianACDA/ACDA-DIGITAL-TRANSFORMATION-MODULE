import { useMemo } from 'react'
import { useProjectContext } from '../../../context/ProjectContext'
import { mockCTDOutput } from '../../../mocks/mock-cloudserve'

const EFORT_COST: Record<string, number> = { S: 50000, M: 150000, L: 400000, XL: 800000 }

export default function Prioritizare() {
  const { client } = useProjectContext()
  const items = useMemo(() => {
    if (client?.cui !== '44521837') return []
    const sorted = [...mockCTDOutput.oportunitati].sort(
      (a, b) => (b.impact_ebit_estimat ?? 0) - (a.impact_ebit_estimat ?? 0)
    )
    return sorted.map((o) => {
      const impact = o.impact_ebit_estimat ?? 0
      const cost = EFORT_COST[o.efort] ?? 100000
      const roi = cost > 0 ? ((impact - cost) / cost) * 100 : 0
      return { ...o, costEst: cost, roiPct: roi }
    })
  }, [client?.cui])

  if (items.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-text-body)]/60">
        Nicio oportunitate disponibilă pentru prioritizare. Completează pagina 7 (Opportunity Map).
      </p>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <p className="text-xs text-[color:var(--color-text-body)]/50 italic">
        Sortat după impact EBIT descrescător. ROI estimat din cost prezumat per nivel efort
        (S=50k, M=150k, L=400k, XL=800k RON). Editabilitate fină în P3-T3+.
      </p>
      <div className="overflow-x-auto border border-[color:var(--color-border-subtle)] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--color-page)] text-[10px] uppercase tracking-wider text-[color:var(--color-text-body)]/50">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Oportunitate</th>
              <th className="px-3 py-2 text-right">Impact EBIT</th>
              <th className="px-3 py-2 text-center">Efort</th>
              <th className="px-3 py-2 text-right">Cost estimat</th>
              <th className="px-3 py-2 text-right">ROI %</th>
              <th className="px-3 py-2 text-center">Risc</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o, i) => (
              <tr key={o.titlu} className="border-t border-[color:var(--color-border-subtle)]">
                <td className="px-3 py-2 font-mono text-xs text-[color:var(--color-text-body)]/50">#{i + 1}</td>
                <td className="px-3 py-2 font-medium">{o.titlu}</td>
                <td className="px-3 py-2 text-right tabular-nums text-accent-success font-bold">
                  {(o.impact_ebit_estimat ?? 0).toLocaleString('ro-RO')}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs font-mono bg-[color:var(--color-page)] border border-[color:var(--color-border-subtle)] px-1.5 py-0.5 rounded">{o.efort}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{o.costEst.toLocaleString('ro-RO')}</td>
                <td className={`px-3 py-2 text-right tabular-nums font-bold ${o.roiPct >= 0 ? 'text-accent-success' : 'text-accent-warning'}`}>
                  {o.roiPct.toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs font-mono">{o.risc}/5</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

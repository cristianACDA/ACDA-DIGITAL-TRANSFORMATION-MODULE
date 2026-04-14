import { useMemo, useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import { mockCTDOutput } from '../../../mocks/mock-cloudserve'

interface Row {
  titlu: string
  tip: string
  impact_ebit: string
  efort: 'S' | 'M' | 'L' | 'XL'
  risc: string
  confidence: number
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW'
  data_source: string
}

function seedFromMock(cui: string | undefined): Row[] {
  if (cui !== '44521837') return []
  return mockCTDOutput.oportunitati.map((o) => ({
    titlu: o.titlu,
    tip: o.tip,
    impact_ebit: String(o.impact_ebit_estimat ?? ''),
    efort: o.efort,
    risc: String(o.risc),
    confidence: o.confidence.confidence,
    confidence_level: o.confidence.confidence_level,
    data_source: o.confidence.data_source ?? '',
  }))
}

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#071F80]'

export const OPPORTUNITY_ROWS_KEY = 'cockpit-opportunities'

export default function OpportunityMap() {
  const { client } = useProjectContext()
  const [rows, setRows] = useState<Row[]>(() => seedFromMock(client?.cui))

  const update = (i: number, k: keyof Row, v: string) =>
    setRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } as Row : r))
  const addRow = () => setRows((p) => [...p, {
    titlu: '', tip: '', impact_ebit: '', efort: 'M', risc: '3',
    confidence: 0.3, confidence_level: 'LOW', data_source: 'manual',
  }])
  const delRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))

  const totalImpact = useMemo(() =>
    rows.reduce((acc, r) => acc + (parseFloat(r.impact_ebit) || 0), 0), [rows])

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto border border-[#E6E6E6] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[#F6F9FC] text-[10px] uppercase tracking-wider text-[#0A2540]/50">
            <tr>
              <th className="px-3 py-2 text-left">Oportunitate</th>
              <th className="px-3 py-2 text-left">Tip</th>
              <th className="px-3 py-2 text-right">Impact EBIT (RON)</th>
              <th className="px-3 py-2 text-center">Efort</th>
              <th className="px-3 py-2 text-right">Risc 1-5</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#E6E6E6] align-top">
                <td className="px-3 py-2 min-w-[200px]">
                  <ConfidenceField label="" value={r.titlu} onChange={(v) => update(i, 'titlu', v)}
                    confidence={r.confidence} confidenceLevel={r.confidence_level} dataSource={r.data_source}
                    fieldId={`op.row${i}.titlu`} />
                </td>
                <td className="px-3 py-2"><input value={r.tip} onChange={(e) => update(i, 'tip', e.target.value)} className={cellCls} /></td>
                <td className="px-3 py-2"><input type="number" value={r.impact_ebit} onChange={(e) => update(i, 'impact_ebit', e.target.value)} className={`${cellCls} text-right tabular-nums`} /></td>
                <td className="px-3 py-2 text-center">
                  <select value={r.efort} onChange={(e) => update(i, 'efort', e.target.value as Row['efort'])} className={cellCls}>
                    <option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option>
                  </select>
                </td>
                <td className="px-3 py-2"><input type="number" min={1} max={5} value={r.risc} onChange={(e) => update(i, 'risc', e.target.value)} className={`${cellCls} text-right tabular-nums`} /></td>
                <td className="px-3 py-2"><button onClick={() => delRow(i)} className="text-red-600 hover:text-red-800 text-sm" title="Şterge">×</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-[#0A2540]/40">Nicio oportunitate.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-[#F6F9FC] border-t-2 border-[#E6E6E6]">
                <td colSpan={2} className="px-3 py-2 text-xs font-bold text-[#0A2540]/60 uppercase tracking-wider">Total impact</td>
                <td className="px-3 py-2 text-right text-sm font-black tabular-nums text-green-700">{totalImpact.toLocaleString('ro-RO')}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <button onClick={addRow}
        className="self-start text-xs font-semibold text-[#071F80] border border-[#E6E6E6] hover:border-[#071F80] bg-white px-3 py-1.5 rounded-lg">
        + Adaugă oportunitate
      </button>
    </section>
  )
}

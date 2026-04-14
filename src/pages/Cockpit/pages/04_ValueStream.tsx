import { useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import { mockCTDOutput } from '../../../mocks/mock-cloudserve'

interface Row {
  nume: string
  descriere: string
  timp_executie: string
  cost_estimat: string
  grad_blocare: string
  impact_ebit: string
  confidence: number
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW'
  data_source: string
}

// TODO P3-T3+: persist procese în DB (acum doar local + seed din mock).
function seedFromMock(cui: string | undefined): Row[] {
  if (cui !== '44521837') return []
  return mockCTDOutput.procese.map((p) => ({
    nume: p.nume,
    descriere: p.descriere,
    timp_executie: p.timp_executie ?? '',
    cost_estimat: String(p.cost_estimat ?? ''),
    grad_blocare: String(p.grad_blocare ?? ''),
    impact_ebit: String(p.impact_ebit ?? ''),
    confidence: p.confidence.confidence,
    confidence_level: p.confidence.confidence_level,
    data_source: p.confidence.data_source ?? '',
  }))
}

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#071F80]'

export default function ValueStream() {
  const { client } = useProjectContext()
  const [rows, setRows] = useState<Row[]>(() => seedFromMock(client?.cui))

  const update = (i: number, k: keyof Row, v: string) =>
    setRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const addRow = () => setRows((p) => [...p, {
    nume: '', descriere: '', timp_executie: '', cost_estimat: '', grad_blocare: '', impact_ebit: '',
    confidence: 0.3, confidence_level: 'LOW', data_source: 'manual',
  }])
  const delRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto border border-[#E6E6E6] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[#F6F9FC] text-[10px] uppercase tracking-wider text-[#0A2540]/50">
            <tr>
              <th className="px-3 py-2 text-left">Proces</th>
              <th className="px-3 py-2 text-left">Descriere</th>
              <th className="px-3 py-2 text-left">Timp</th>
              <th className="px-3 py-2 text-right">Cost (RON)</th>
              <th className="px-3 py-2 text-right">Blocare 1-5</th>
              <th className="px-3 py-2 text-right">Impact EBIT</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#E6E6E6] align-top">
                <td className="px-3 py-2 min-w-[180px]">
                  <ConfidenceField
                    label=""
                    value={r.nume}
                    onChange={(v) => update(i, 'nume', v)}
                    confidence={r.confidence}
                    confidenceLevel={r.confidence_level}
                    dataSource={r.data_source}
                    fieldId={`vs.row${i}.nume`}
                  />
                </td>
                <td className="px-3 py-2 min-w-[200px]">
                  <textarea rows={2} value={r.descriere} onChange={(e) => update(i, 'descriere', e.target.value)} className={`${cellCls} resize-none`} />
                </td>
                <td className="px-3 py-2"><input value={r.timp_executie} onChange={(e) => update(i, 'timp_executie', e.target.value)} className={cellCls} /></td>
                <td className="px-3 py-2"><input type="number" value={r.cost_estimat} onChange={(e) => update(i, 'cost_estimat', e.target.value)} className={`${cellCls} text-right tabular-nums`} /></td>
                <td className="px-3 py-2"><input type="number" min={1} max={5} value={r.grad_blocare} onChange={(e) => update(i, 'grad_blocare', e.target.value)} className={`${cellCls} text-right tabular-nums`} /></td>
                <td className="px-3 py-2"><input type="number" value={r.impact_ebit} onChange={(e) => update(i, 'impact_ebit', e.target.value)} className={`${cellCls} text-right tabular-nums`} /></td>
                <td className="px-3 py-2"><button onClick={() => delRow(i)} className="text-red-600 hover:text-red-800 text-sm" title="Şterge rând">×</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-[#0A2540]/40">Niciun proces. Apasă „+ Adaugă proces".</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button onClick={addRow}
        className="self-start text-xs font-semibold text-[#071F80] border border-[#E6E6E6] hover:border-[#071F80] bg-white px-3 py-1.5 rounded-lg">
        + Adaugă proces
      </button>
    </section>
  )
}

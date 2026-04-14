import { useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import { mockCTDOutput } from '../../../mocks/mock-cloudserve'

interface Row {
  titlu: string
  descriere: string
  impact_financiar: string
  cauza_radacina: string
  indicatori_legati: string
  confidence: number
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW'
  data_source: string
}

function seedFromMock(cui: string | undefined): Row[] {
  if (cui !== '44521837') return []
  return mockCTDOutput.probleme.map((p) => ({
    titlu: p.titlu,
    descriere: p.descriere,
    impact_financiar: String(p.impact_financiar ?? ''),
    cauza_radacina: p.cauza_radacina ?? '',
    indicatori_legati: p.indicatori_legati.join(', '),
    confidence: p.confidence.confidence,
    confidence_level: p.confidence.confidence_level,
    data_source: p.confidence.data_source ?? '',
  }))
}

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#071F80]'

export default function ProblemFraming() {
  const { client } = useProjectContext()
  const [rows, setRows] = useState<Row[]>(() => seedFromMock(client?.cui))

  const update = (i: number, k: keyof Row, v: string) =>
    setRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const addRow = () => setRows((p) => [...p, {
    titlu: '', descriere: '', impact_financiar: '', cauza_radacina: '', indicatori_legati: '',
    confidence: 0.3, confidence_level: 'LOW', data_source: 'manual',
  }])
  const delRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))

  return (
    <section className="flex flex-col gap-4">
      {rows.map((r, i) => (
        <div key={i} className="border border-[#E6E6E6] rounded-xl p-4 flex flex-col gap-3 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <ConfidenceField
                label="Titlu problemă"
                value={r.titlu}
                onChange={(v) => update(i, 'titlu', v)}
                confidence={r.confidence}
                confidenceLevel={r.confidence_level}
                dataSource={r.data_source}
                fieldId={`pf.row${i}.titlu`}
              />
            </div>
            <button onClick={() => delRow(i)} className="text-red-600 hover:text-red-800 text-lg" title="Şterge">×</button>
          </div>
          <textarea rows={2} value={r.descriere} placeholder="Descriere"
            onChange={(e) => update(i, 'descriere', e.target.value)}
            className={`${cellCls} resize-none`} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="number" value={r.impact_financiar} placeholder="Impact financiar (RON)"
              onChange={(e) => update(i, 'impact_financiar', e.target.value)} className={`${cellCls} tabular-nums`} />
            <input value={r.indicatori_legati} placeholder="Indicatori legaţi (ex: O1, T3)"
              onChange={(e) => update(i, 'indicatori_legati', e.target.value)} className={cellCls} />
          </div>
          <textarea rows={2} value={r.cauza_radacina} placeholder="Cauza rădăcină"
            onChange={(e) => update(i, 'cauza_radacina', e.target.value)}
            className={`${cellCls} resize-none`} />
        </div>
      ))}
      {rows.length === 0 && (
        <div className="bg-[#F6F9FC] border border-dashed border-[#E6E6E6] rounded-lg px-5 py-8 text-center text-xs text-[#0A2540]/40">
          Nicio problemă. Apasă „+ Adaugă problemă".
        </div>
      )}
      <button onClick={addRow}
        className="self-start text-xs font-semibold text-[#071F80] border border-[#E6E6E6] hover:border-[#071F80] bg-white px-3 py-1.5 rounded-lg">
        + Adaugă problemă
      </button>
    </section>
  )
}

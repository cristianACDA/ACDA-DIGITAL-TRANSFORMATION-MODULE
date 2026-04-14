import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import type { ProblemStatement } from '../../../types/acda.types'

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#071F80]'

function parseLinked(raw?: string): string {
  if (!raw) return ''
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.join(', ') : String(raw)
  } catch {
    return raw
  }
}

function stringifyLinked(csv: string): string {
  const parts = csv.split(',').map((s) => s.trim()).filter(Boolean)
  return JSON.stringify(parts)
}

export default function ProblemFraming() {
  const { problemStatements, setProblemStatements, activeProjectId } = useProjectContext()

  const update = (i: number, patch: Partial<ProblemStatement>) =>
    setProblemStatements(problemStatements.map((r, idx) =>
      idx === i ? { ...r, ...patch, updated_at: new Date().toISOString() } : r))

  const addRow = () => {
    const ts = new Date().toISOString()
    setProblemStatements([...problemStatements, {
      id: `${activeProjectId ?? 'local'}-prob-${Date.now()}`,
      project_id: activeProjectId ?? '',
      title: '', description: '', financial_impact: undefined,
      root_cause: '', linked_indicators: '[]', citation: '',
      confidence: 0.3, confidence_level: 'LOW', data_source: 'manual',
      created_at: ts, updated_at: ts,
    }])
  }
  const delRow = (i: number) => setProblemStatements(problemStatements.filter((_, idx) => idx !== i))

  return (
    <section className="flex flex-col gap-4">
      {problemStatements.map((r, i) => (
        <div key={r.id} className="border border-[#E6E6E6] rounded-xl p-4 flex flex-col gap-3 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <ConfidenceField
                label="Titlu problemă"
                value={r.title}
                onChange={(v) => update(i, { title: v })}
                confidence={r.confidence ?? 0.3}
                confidenceLevel={r.confidence_level ?? 'LOW'}
                dataSource={r.data_source ?? 'manual'}
                fieldId={`pf.row${i}.titlu`}
              />
            </div>
            <button onClick={() => delRow(i)} className="text-red-600 hover:text-red-800 text-lg" title="Şterge">×</button>
          </div>
          <textarea rows={2} value={r.description ?? ''} placeholder="Descriere"
            onChange={(e) => update(i, { description: e.target.value })}
            className={`${cellCls} resize-none`} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="number" value={r.financial_impact ?? ''} placeholder="Impact financiar (RON)"
              onChange={(e) => update(i, { financial_impact: e.target.value === '' ? undefined : Number(e.target.value) })}
              className={`${cellCls} tabular-nums`} />
            <input value={parseLinked(r.linked_indicators)} placeholder="Indicatori legaţi (ex: O1, T3)"
              onChange={(e) => update(i, { linked_indicators: stringifyLinked(e.target.value) })}
              className={cellCls} />
          </div>
          <textarea rows={2} value={r.root_cause ?? ''} placeholder="Cauza rădăcină"
            onChange={(e) => update(i, { root_cause: e.target.value })}
            className={`${cellCls} resize-none`} />
        </div>
      ))}
      {problemStatements.length === 0 && (
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

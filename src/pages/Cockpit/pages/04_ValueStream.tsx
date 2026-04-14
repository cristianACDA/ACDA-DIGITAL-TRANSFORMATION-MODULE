import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import type { Process } from '../../../types/acda.types'

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#071F80]'

export default function ValueStream() {
  const { processes, setProcesses, activeProjectId } = useProjectContext()

  const update = (i: number, patch: Partial<Process>) => {
    setProcesses(processes.map((r, idx) => idx === i ? { ...r, ...patch, updated_at: new Date().toISOString() } : r))
  }
  const addRow = () => {
    const ts = new Date().toISOString()
    setProcesses([...processes, {
      id: `${activeProjectId ?? 'local'}-proc-${Date.now()}`,
      project_id: activeProjectId ?? '',
      name: '', description: '', time_execution: '',
      cost_estimated: undefined, blocking_score: undefined, ebit_impact: undefined,
      citation: undefined, confidence: 0.3, confidence_level: 'LOW', data_source: 'manual',
      created_at: ts, updated_at: ts,
    }])
  }
  const delRow = (i: number) => setProcesses(processes.filter((_, idx) => idx !== i))

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
            {processes.map((r, i) => (
              <tr key={r.id} className="border-t border-[#E6E6E6] align-top">
                <td className="px-3 py-2 min-w-[180px]">
                  <ConfidenceField
                    label=""
                    value={r.name}
                    onChange={(v) => update(i, { name: v })}
                    confidence={r.confidence ?? 0.3}
                    confidenceLevel={r.confidence_level ?? 'LOW'}
                    dataSource={r.data_source ?? 'manual'}
                    fieldId={`vs.row${i}.nume`}
                  />
                </td>
                <td className="px-3 py-2 min-w-[200px]">
                  <textarea rows={2} value={r.description ?? ''}
                    onChange={(e) => update(i, { description: e.target.value })}
                    className={`${cellCls} resize-none`} />
                </td>
                <td className="px-3 py-2">
                  <input value={r.time_execution ?? ''}
                    onChange={(e) => update(i, { time_execution: e.target.value })} className={cellCls} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={r.cost_estimated ?? ''}
                    onChange={(e) => update(i, { cost_estimated: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className={`${cellCls} text-right tabular-nums`} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min={1} max={5} value={r.blocking_score ?? ''}
                    onChange={(e) => update(i, { blocking_score: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className={`${cellCls} text-right tabular-nums`} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={r.ebit_impact ?? ''}
                    onChange={(e) => update(i, { ebit_impact: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className={`${cellCls} text-right tabular-nums`} />
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => delRow(i)} className="text-red-600 hover:text-red-800 text-sm" title="Şterge rând">×</button>
                </td>
              </tr>
            ))}
            {processes.length === 0 && (
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

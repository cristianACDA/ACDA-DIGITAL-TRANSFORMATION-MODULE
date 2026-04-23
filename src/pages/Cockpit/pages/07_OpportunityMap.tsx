import { useMemo } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import type { Opportunity } from '../../../types/acda.types'
import { EffortSize } from '../../../types/acda.types'

const cellCls = 'w-full bg-white border border-[color:var(--color-border-subtle)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[color:var(--color-text-primary)]'

export default function OpportunityMap() {
  const { opportunities, setOpportunities, activeProjectId } = useProjectContext()

  const update = (i: number, patch: Partial<Opportunity>) =>
    setOpportunities(opportunities.map((r, idx) =>
      idx === i ? { ...r, ...patch, updated_at: new Date().toISOString() } : r))

  const addRow = () => {
    const ts = new Date().toISOString()
    setOpportunities([...opportunities, {
      id: `${activeProjectId ?? 'local'}-opp-${Date.now()}`,
      project_id: activeProjectId ?? '',
      title: '', type: '', ebit_impact_estimated: undefined,
      effort: EffortSize.M, risk: 3, citation: '',
      confidence: 0.3, confidence_level: 'LOW', data_source: 'manual',
      created_at: ts, updated_at: ts,
    }])
  }
  const delRow = (i: number) => setOpportunities(opportunities.filter((_, idx) => idx !== i))

  const totalImpact = useMemo(() =>
    opportunities.reduce((acc, r) => acc + (r.ebit_impact_estimated ?? 0), 0), [opportunities])

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto border border-[color:var(--color-border-subtle)] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--color-page)] text-[10px] uppercase tracking-wider text-[color:var(--color-text-body)]/50">
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
            {opportunities.map((r, i) => (
              <tr key={r.id} className="border-t border-[color:var(--color-border-subtle)] align-top">
                <td className="px-3 py-2 min-w-[200px]">
                  <ConfidenceField label="" value={r.title}
                    onChange={(v) => update(i, { title: v })}
                    confidence={r.confidence ?? 0.3}
                    confidenceLevel={r.confidence_level ?? 'LOW'}
                    dataSource={r.data_source ?? 'manual'}
                    fieldId={`op.row${i}.titlu`} />
                </td>
                <td className="px-3 py-2">
                  <input value={r.type ?? ''}
                    onChange={(e) => update(i, { type: e.target.value })} className={cellCls} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={r.ebit_impact_estimated ?? ''}
                    onChange={(e) => update(i, { ebit_impact_estimated: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className={`${cellCls} text-right tabular-nums`} />
                </td>
                <td className="px-3 py-2 text-center">
                  <select value={r.effort ?? EffortSize.M}
                    onChange={(e) => update(i, { effort: e.target.value as Opportunity['effort'] })}
                    className={cellCls}>
                    <option value="S">S</option><option value="M">M</option>
                    <option value="L">L</option><option value="XL">XL</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="number" min={1} max={5} value={r.risk ?? ''}
                    onChange={(e) => update(i, { risk: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className={`${cellCls} text-right tabular-nums`} />
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => delRow(i)} className="text-accent-warning hover:text-accent-warning text-sm" title="Şterge">×</button>
                </td>
              </tr>
            ))}
            {opportunities.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-[color:var(--color-text-body)]/40">Nicio oportunitate.</td></tr>
            )}
          </tbody>
          {opportunities.length > 0 && (
            <tfoot>
              <tr className="bg-[color:var(--color-page)] border-t-2 border-[color:var(--color-border-subtle)]">
                <td colSpan={2} className="px-3 py-2 text-xs font-bold text-[color:var(--color-text-body)]/60 uppercase tracking-wider">Total impact</td>
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-accent-success">{totalImpact.toLocaleString('ro-RO')}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <button onClick={addRow}
        className="self-start text-xs font-semibold text-[color:var(--color-text-primary)] border border-[color:var(--color-border-subtle)] hover:border-[color:var(--color-text-primary)] bg-white px-3 py-1.5 rounded-lg">
        + Adaugă oportunitate
      </button>
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'

const SRC = { confidence: 0.7, confidenceLevel: 'MEDIUM' as const, dataSource: 'transcriere_whisper+anaf' }

function fmt(n: number | undefined | null): string {
  return typeof n === 'number' ? String(n) : ''
}
function num(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

export default function EBITBaselinePage() {
  const { ebitBaseline, setEbitBaseline, isHydrating, activeProjectId } = useProjectContext()

  const [form, setForm] = useState(() => ({
    annual_revenue:       fmt(ebitBaseline?.annual_revenue),
    operational_costs:    fmt(ebitBaseline?.operational_costs),
    ebit_current:         fmt(ebitBaseline?.ebit_current),
    ebit_margin_current:  fmt(ebitBaseline?.ebit_margin_current),
    it_spend_current:     fmt(ebitBaseline?.it_spend_current),
    ebit_target:          fmt(ebitBaseline?.ebit_target),
    ebit_target_delta:    fmt(ebitBaseline?.ebit_target_delta_percent),
    financial_notes:      ebitBaseline?.financial_notes ?? '',
  }))

  // seededRef previne scrierea înapoi la context până nu s-a hidratat formul.
  const seededRef = useRef(false)

  // Re-hidratează formul la prima ocazie după ce ebitBaseline devine disponibil
  // (hidratare asincronă sau schimbare proiect activ).
  useEffect(() => {
    if (activeProjectId && isHydrating) return
    if (seededRef.current) return
    seededRef.current = true
    if (!ebitBaseline) return
    setForm({
      annual_revenue:       fmt(ebitBaseline.annual_revenue),
      operational_costs:    fmt(ebitBaseline.operational_costs),
      ebit_current:         fmt(ebitBaseline.ebit_current),
      ebit_margin_current:  fmt(ebitBaseline.ebit_margin_current),
      it_spend_current:     fmt(ebitBaseline.it_spend_current),
      ebit_target:          fmt(ebitBaseline.ebit_target),
      ebit_target_delta:    fmt(ebitBaseline.ebit_target_delta_percent),
      financial_notes:      ebitBaseline.financial_notes ?? '',
    })
  }, [ebitBaseline, isHydrating, activeProjectId])

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

  const delta = useMemo(() => {
    const t = parseFloat(form.ebit_target), c = parseFloat(form.ebit_current)
    return Number.isFinite(t) && Number.isFinite(c) ? t - c : 0
  }, [form.ebit_current, form.ebit_target])

  // Sincronizare înapoi la context — merge peste ebitBaseline existent, ca să
  // păstrăm câmpurile care nu sunt pe pagina 2 (change_management_spend,
  // rule_1_to_1_ratio, confidence etc.). Serverul face merge la PUT.
  useEffect(() => {
    if (!seededRef.current) return
    const now = new Date().toISOString()
    const base = ebitBaseline ?? {
      id: `ebit-${activeProjectId ?? 'local'}`,
      project_id: activeProjectId ?? 'local',
      created_at: now,
      updated_at: now,
    }
    setEbitBaseline({
      ...base,
      annual_revenue:            num(form.annual_revenue),
      operational_costs:         num(form.operational_costs),
      ebit_current:              num(form.ebit_current),
      ebit_margin_current:       num(form.ebit_margin_current),
      it_spend_current:          num(form.it_spend_current),
      ebit_target:               num(form.ebit_target),
      ebit_target_delta_percent: num(form.ebit_target_delta),
      financial_notes:           form.financial_notes || undefined,
      updated_at: now,
    })
    // Intenţionat fără `ebitBaseline`/`setEbitBaseline` în deps — spread-ul pe
    // `base` e sincron şi nu vrem să re-declanşăm scrierea la oglindirea
    // contextului înapoi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConfidenceField label="Cifră de afaceri anuală (RON)" value={form.annual_revenue} onChange={set('annual_revenue')} type="number" {...SRC} fieldId="ebit.annual_revenue" />
        <ConfidenceField label="Costuri operaţionale (RON)" value={form.operational_costs} onChange={set('operational_costs')} type="number" {...SRC} fieldId="ebit.operational_costs" />
        <ConfidenceField label="EBIT curent (RON)" value={form.ebit_current} onChange={set('ebit_current')} type="number" {...SRC} fieldId="ebit.current" />
        <ConfidenceField label="Marja EBIT curentă (%)" value={form.ebit_margin_current} onChange={set('ebit_margin_current')} type="number" {...SRC} fieldId="ebit.margin" />
        <ConfidenceField label="Buget IT curent (RON)" value={form.it_spend_current} onChange={set('it_spend_current')} type="number" {...SRC} fieldId="ebit.it_spend" />
        <ConfidenceField label="Delta target EBIT (%)" value={form.ebit_target_delta} onChange={set('ebit_target_delta')} type="number" {...SRC} fieldId="ebit.target_delta" />
        <ConfidenceField label="EBIT target (RON)" value={form.ebit_target} onChange={set('ebit_target')} type="number" {...SRC} fieldId="ebit.target" />
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-col justify-center">
          <p className="text-xs text-amber-700/70 uppercase tracking-wider font-semibold">Delta calculat</p>
          <p className="text-lg font-black tabular-nums text-amber-700">
            {delta >= 0 ? '+' : ''}{delta.toLocaleString('ro-RO')} RON
          </p>
        </div>
      </div>
      <ConfidenceField label="Note financiare" value={form.financial_notes} onChange={set('financial_notes')} type="textarea" {...SRC} fieldId="ebit.notes" />
    </section>
  )
}

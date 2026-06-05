import { useEffect, useMemo, useRef, useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'
import { computeCostOfInaction } from '../../../lib/methodology/cost-of-inaction'

const SRC = { confidence: 0.7, confidenceLevel: 'MEDIUM' as const, dataSource: 'transcriere_whisper+anaf' }
const RON = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 })

function fmt(n: number | undefined | null): string {
  return typeof n === 'number' ? String(n) : ''
}
/**
 * Merge numeric form field cu valoarea persistată:
 * - form gol → păstrează existing (NU suprascrie cu undefined)
 * - form non-numeric → păstrează existing
 * - form numeric valid → foloseşte valoarea nouă
 * Asta previne ştergerea ebit_target etc. când formul nu e încă hidratat.
 */
function mergeField(formVal: string, existing: number | undefined | null): number | undefined {
  if (formVal.trim() === '') return existing ?? undefined
  const n = parseFloat(formVal)
  return Number.isFinite(n) ? n : (existing ?? undefined)
}

export default function EBITBaselinePage() {
  const { ebitBaseline, setEbitBaseline, isHydrating, activeProjectId, processes, problemStatements } = useProjectContext()

  // Cost of Inaction — funcție canonică unică (aceeaşi cifră ca în Strategy10min + export).
  const coi = useMemo(
    () => computeCostOfInaction(processes, problemStatements),
    [processes, problemStatements],
  )

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
      annual_revenue:            mergeField(form.annual_revenue,      ebitBaseline?.annual_revenue),
      operational_costs:         mergeField(form.operational_costs,   ebitBaseline?.operational_costs),
      ebit_current:              mergeField(form.ebit_current,        ebitBaseline?.ebit_current),
      ebit_margin_current:       mergeField(form.ebit_margin_current, ebitBaseline?.ebit_margin_current),
      it_spend_current:          mergeField(form.it_spend_current,    ebitBaseline?.it_spend_current),
      ebit_target:               mergeField(form.ebit_target,         ebitBaseline?.ebit_target),
      ebit_target_delta_percent: mergeField(form.ebit_target_delta,   ebitBaseline?.ebit_target_delta_percent),
      financial_notes:           form.financial_notes.trim() === '' ? ebitBaseline?.financial_notes : form.financial_notes,
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
        {/* Câmpurile EBIT target rămân (coloana se păstrează) dar sunt DEPRECATE în v2.0:
            naraţiunea de valoare trece de la „target EBIT" la „Cost of Inaction" (vezi panoul de jos). */}
        <div className="opacity-60" title="Deprecat în v2.0 — păstrat pentru compatibilitate. Naraţiunea de valoare foloseşte Cost of Inaction.">
          <ConfidenceField label="Delta target EBIT (%) · deprecat" value={form.ebit_target_delta} onChange={set('ebit_target_delta')} type="number" {...SRC} fieldId="ebit.target_delta" />
        </div>
        <div className="opacity-60" title="Deprecat în v2.0 — păstrat pentru compatibilitate. Naraţiunea de valoare foloseşte Cost of Inaction.">
          <ConfidenceField label="EBIT target (RON) · deprecat" value={form.ebit_target} onChange={set('ebit_target')} type="number" {...SRC} fieldId="ebit.target" />
        </div>
      </div>

      {/* Cost of Inaction — scenarii pe 2 ani (sursă: pag. 4 procese + pag. 5 probleme). */}
      <div className="border border-[color:var(--color-border-subtle)] rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[color:var(--color-text-primary)] uppercase tracking-wider">Costul inacţiunii · {coi.ipoteze.orizontAni} ani</h3>
          {coi.status === 'ok' && (
            <span className="text-xs text-[color:var(--color-text-body)]/50">bază {RON(coi.baza)} RON/an</span>
          )}
        </div>

        {coi.status === 'empty' ? (
          <div className="bg-[color:var(--color-page)] border border-dashed border-[color:var(--color-border-subtle)] rounded-lg px-4 py-6 text-center text-xs text-[color:var(--color-text-body)]/50">
            {coi.mesajGol}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[color:rgba(220,38,38,0.06)] border border-border-subtle rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[#b91c1c]/80">Fără acţiune</p>
                <p className="text-xl font-semibold tabular-nums text-[#b91c1c]">{RON(coi.faraActiune.total)} RON</p>
                <p className="text-[11px] text-[color:var(--color-text-body)]/60">
                  An 1: {RON(coi.faraActiune.an1)} · An 2: {RON(coi.faraActiune.an2)} (erodare {Math.round((coi.ipoteze.erodareAn2 - 1) * 100)}%)
                </p>
              </div>
              <div className="bg-[color:rgba(34,197,94,0.06)] border border-border-subtle rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-accent-success/80">Cu transformare ACDA</p>
                <p className="text-xl font-semibold tabular-nums text-accent-success">−{RON(coi.cuTransformareACDA.totalRecuperat)} RON</p>
                <p className="text-[11px] text-[color:var(--color-text-body)]/60">
                  recuperat (An1 {Math.round(coi.ipoteze.recuperareAn1 * 100)}% / An2 {Math.round(coi.ipoteze.recuperareAn2 * 100)}%) · rezidual {RON(coi.cuTransformareACDA.totalRamas)} RON
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[color:var(--color-text-body)]/40 italic">{coi.disclaimer}</p>
          </>
        )}
      </div>

      <ConfidenceField label="Note financiare" value={form.financial_notes} onChange={set('financial_notes')} type="textarea" {...SRC} fieldId="ebit.notes" />
    </section>
  )
}

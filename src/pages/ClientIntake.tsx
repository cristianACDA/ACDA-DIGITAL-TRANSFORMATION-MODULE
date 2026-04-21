import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjectContext } from '../context/ProjectContext'
import { EBIT_TARGET_DEFAULT_PERCENT, RULE_1_TO_1_MINIMUM } from '../constants/acda.constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EBITForm {
  annual_revenue:                  string
  operational_costs:               string
  ebit_current:                    string
  it_spend_current:                string
  change_management_spend_current: string
  ebit_target_delta_percent:       string
  ebit_target:                     string
  financial_notes:                 string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(v: string): number {
  const parsed = parseFloat(v.replace(/\s/g, '').replace(',', '.'))
  return isNaN(parsed) ? 0 : parsed
}

function formatRON(v: number): string {
  return v.toLocaleString('ro-RO', { maximumFractionDigits: 0 })
}

const EMPTY_FORM: EBITForm = {
  annual_revenue: '', operational_costs: '', ebit_current: '',
  it_spend_current: '', change_management_spend_current: '',
  ebit_target_delta_percent: String(EBIT_TARGET_DEFAULT_PERCENT),
  ebit_target: '', financial_notes: '',
}

// ─── Shared classes ───────────────────────────────────────────────────────────

const inputCls = "w-full bg-white border border-[color:var(--color-border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[color:var(--color-text-body)] placeholder-[color:var(--color-text-body)]/30 focus:outline-none focus:border-[color:var(--color-text-primary)] focus:ring-1 focus:ring-[color:var(--color-text-primary)]/10 transition-all"

// ─── Field components ─────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-[color:var(--color-text-body)]/60 mb-1.5">
      {children}
      {required && <span className="text-accent-warning ml-0.5">*</span>}
    </label>
  )
}

function NumberField({ label, value, placeholder, required, onChange }: {
  label: string; value: string; placeholder?: string; required?: boolean; onChange: (v: string) => void
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input type="number" min={0} value={value} placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  )
}

function ReadOnlyField({ label, value, highlight }: {
  label: string; value: string; highlight?: 'green' | 'amber' | 'red' | 'blue'
}) {
  const colorMap = {
    green: 'text-accent-success  border-border-subtle  bg-[color:rgba(34,197,94,0.08)]',
    amber: 'text-accent-warning  border-border-subtle  bg-[color:rgba(245,158,11,0.08)]',
    red:   'text-accent-warning    border-border-subtle    bg-[color:rgba(245,158,11,0.08)]',
    blue:  'text-[color:var(--color-text-primary)]  border-border-subtle   bg-subtle',
  }
  const cls = highlight ? colorMap[highlight] : 'text-[color:var(--color-text-body)] border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)]'
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className={`w-full border rounded-lg px-3 py-2.5 text-sm font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  )
}

function SectionDivider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-[color:var(--color-border-subtle)]" />
      <span className="text-xs font-semibold text-[color:var(--color-text-body)]/40 uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-[color:var(--color-border-subtle)]" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientIntake() {
  const { setEbitBaseline, ebitBaseline, isHydrating, activeProjectId } = useProjectContext()
  const [form, setForm] = useState<EBITForm>(EMPTY_FORM)
  const [targetManuallyEdited, setTargetManuallyEdited] = useState(false)
  const seededRef = useRef(false)

  // Hidratează formul din EBIT persistat (la prima apariţie după load DB).
  useEffect(() => {
    if (seededRef.current) return
    // Aşteaptă finalizarea hidratării. Dacă există date persistate, le hidratăm
    // în form; dacă nu există (proiect nou), doar marcăm ref-ul ca „seeded" ca
    // scrierile ulterioare să fie permise.
    if (activeProjectId && isHydrating) return
    if (!ebitBaseline) {
      seededRef.current = true
      return
    }
    seededRef.current = true
    const numStr = (v: number | undefined | null) => (typeof v === 'number' ? String(v) : '')
    setForm({
      annual_revenue:                  numStr(ebitBaseline.annual_revenue),
      operational_costs:               numStr(ebitBaseline.operational_costs),
      ebit_current:                    numStr(ebitBaseline.ebit_current),
      it_spend_current:                numStr(ebitBaseline.it_spend_current),
      change_management_spend_current: numStr(ebitBaseline.change_management_spend_current),
      ebit_target_delta_percent:       numStr(ebitBaseline.ebit_target_delta_percent) || String(EBIT_TARGET_DEFAULT_PERCENT),
      ebit_target:                     numStr(ebitBaseline.ebit_target),
      financial_notes:                 ebitBaseline.financial_notes ?? '',
    })
    setTargetManuallyEdited(true)
  }, [ebitBaseline, isHydrating, activeProjectId])

  const set = (field: keyof EBITForm) => (v: string) => setForm((prev) => ({ ...prev, [field]: v }))

  const revenue  = useMemo(() => num(form.annual_revenue),   [form.annual_revenue])
  const ebitCur  = useMemo(() => num(form.ebit_current),     [form.ebit_current])
  const itSpend  = useMemo(() => num(form.it_spend_current), [form.it_spend_current])
  const cmSpend  = useMemo(() => num(form.change_management_spend_current), [form.change_management_spend_current])
  const deltaPct = useMemo(() => num(form.ebit_target_delta_percent),       [form.ebit_target_delta_percent])

  const marginCurrent = useMemo(() =>
    revenue > 0 ? (ebitCur / revenue) * 100 : 0, [ebitCur, revenue])

  const autoTarget = useMemo(() =>
    ebitCur > 0 ? ebitCur * (1 + deltaPct / 100) : 0, [ebitCur, deltaPct])

  useEffect(() => {
    if (!targetManuallyEdited) {
      setForm((prev) => ({
        ...prev,
        ebit_target: autoTarget > 0 ? String(Math.round(autoTarget)) : '',
      }))
    }
  }, [autoTarget, targetManuallyEdited])

  const ebitTarget = useMemo(() => num(form.ebit_target), [form.ebit_target])
  const deltaRON   = useMemo(() => ebitTarget - ebitCur,  [ebitTarget, ebitCur])
  const ratio1to1  = useMemo(() => itSpend > 0 ? cmSpend / itSpend : 0, [cmSpend, itSpend])
  const ratioOk    = ratio1to1 >= RULE_1_TO_1_MINIMUM

  useEffect(() => {
    // Guard: nu scrie până nu s-a hidratat formul din ebitBaseline persistat.
    // Fără asta, la mount form=EMPTY_FORM → revenue=0, ebitCur=0 → setEbitBaseline(null)
    // → DELETE pe /ebit → pierdem ebit_target+change_management_spend persistate.
    if (!seededRef.current) return
    const now = new Date().toISOString()
    if (revenue > 0 && ebitCur > 0) {
      setEbitBaseline({
        id: 'local-ebit', project_id: 'local',
        annual_revenue:                  revenue,
        operational_costs:               num(form.operational_costs)              || undefined,
        ebit_current:                    ebitCur,
        ebit_margin_current:             marginCurrent,
        ebit_target:                     ebitTarget                               || undefined,
        ebit_target_delta_percent:       deltaPct,
        it_spend_current:                itSpend                                  || undefined,
        change_management_spend_current: cmSpend                                  || undefined,
        rule_1_to_1_ratio:               ratio1to1                                || undefined,
        financial_notes:                 form.financial_notes                     || undefined,
        created_at: now, updated_at: now,
      })
    } else {
      setEbitBaseline(null)
    }
  }, [revenue, ebitCur, marginCurrent, ebitTarget, deltaPct, itSpend, cmSpend,
      ratio1to1, form.operational_costs, form.financial_notes, setEbitBaseline])

  function applyScenario() {
    setTargetManuallyEdited(false)
    setForm({
      annual_revenue: '10000000', operational_costs: '8800000',
      ebit_current: '1200000',   it_spend_current: '500000',
      change_management_spend_current: '500000',
      ebit_target_delta_percent: '20', ebit_target: '1440000',
      financial_notes: 'Scenariu demo ACDA Sprint 0',
    })
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-page)] text-[color:var(--color-text-body)] px-4 py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[color:var(--color-text-body)]/40 uppercase tracking-widest mb-1">Evaluare ACDA</p>
            <h1 className="text-2xl font-semibold text-text-primary">Date Client & EBIT Baseline</h1>
            <p className="text-sm text-[color:var(--color-text-body)]/60 mt-1">
              Completează datele financiare pentru a activa calculele automate ACDA.
            </p>
          </div>
          <button onClick={applyScenario}
            className="flex-shrink-0 text-xs border border-[color:var(--color-border-subtle)] hover:border-[color:var(--color-text-primary)] text-[color:var(--color-text-body)]/60 hover:text-[color:var(--color-text-primary)] px-3 py-2 rounded-lg transition-all font-medium bg-white">
            ▶ Scenariu Demo
          </button>
        </div>

        {/* EBIT Baseline card */}
        <section className="bg-white border border-[color:var(--color-border-subtle)] rounded-lg p-6 flex flex-col gap-4 shadow-sm">
          <h2 className="text-xs font-semibold text-[color:var(--color-text-body)]/50 uppercase tracking-widest flex items-center gap-2">
            <span className="text-text-primary">◈</span> EBIT Baseline
          </h2>

          <SectionDivider>Date Financiare de Bază</SectionDivider>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberField label="Cifră de Afaceri Anuală (RON)" value={form.annual_revenue}
              placeholder="Ex: 10000000" required onChange={set('annual_revenue')} />
            <NumberField label="Costuri Operaționale (RON)" value={form.operational_costs}
              placeholder="Ex: 8800000" onChange={set('operational_costs')} />
            <NumberField label="EBIT Curent (RON)" value={form.ebit_current}
              placeholder="Ex: 1200000" required onChange={set('ebit_current')} />
            <ReadOnlyField label="Marjă EBIT Curentă (calculat automat)"
              value={revenue > 0 && ebitCur > 0 ? `${marginCurrent.toFixed(2)}%` : '—'}
              highlight={marginCurrent >= 15 ? 'green' : marginCurrent >= 8 ? 'amber' : revenue > 0 ? 'red' : undefined} />
          </div>

          <SectionDivider>Cheltuieli IT & Change Management</SectionDivider>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberField label="Buget IT Curent (RON)" value={form.it_spend_current}
              placeholder="Ex: 500000" onChange={set('it_spend_current')} />
            <NumberField label="Buget Change Management (RON)" value={form.change_management_spend_current}
              placeholder="Ex: 500000" onChange={set('change_management_spend_current')} />
            <ReadOnlyField
              label={`Regula 1:1 — Ratio CM/IT (minim ${RULE_1_TO_1_MINIMUM.toFixed(1)})`}
              value={itSpend > 0 ? `${ratio1to1.toFixed(2)} ${ratioOk ? '✓ Îndeplinit' : '✗ Sub minim'}` : '—'}
              highlight={itSpend > 0 ? (ratioOk ? 'green' : 'red') : undefined} />
          </div>

          <SectionDivider>Target EBIT & Delta</SectionDivider>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberField
              label={`Delta Target EBIT (%) — default ${EBIT_TARGET_DEFAULT_PERCENT}%`}
              value={form.ebit_target_delta_percent}
              placeholder={String(EBIT_TARGET_DEFAULT_PERCENT)}
              onChange={(v) => { setTargetManuallyEdited(false); set('ebit_target_delta_percent')(v) }} />
            <div>
              <FieldLabel>EBIT Target (RON) — editabil manual</FieldLabel>
              <input type="number" min={0} value={form.ebit_target}
                placeholder={autoTarget > 0 ? String(Math.round(autoTarget)) : '0'}
                onChange={(e) => { setTargetManuallyEdited(true); set('ebit_target')(e.target.value) }}
                className="w-full bg-subtle border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-body)]/30 focus:outline-none focus:border-[color:var(--color-text-primary)] focus:ring-1 focus:ring-[color:var(--color-text-primary)]/10 transition-all font-bold tabular-nums" />
              {targetManuallyEdited && (
                <p className="text-xs text-accent-warning mt-1">
                  ✎ Valoare editată manual —{' '}
                  <button className="underline hover:text-amber-900" onClick={() => setTargetManuallyEdited(false)}>
                    resetează la calculat
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Delta RON computed cards */}
          {ebitCur > 0 && ebitTarget > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
              <div className="rounded-lg p-4 border bg-[color:var(--color-page)] border-[color:var(--color-border-subtle)]">
                <p className="text-xs text-[color:var(--color-text-body)]/50 mb-1.5 font-medium">EBIT Curent</p>
                <p className="text-xl font-semibold tabular-nums text-[color:var(--color-text-body)]">
                  {formatRON(ebitCur)} <span className="text-sm font-normal text-[color:var(--color-text-body)]/40">RON</span>
                </p>
              </div>
              <div className="rounded-lg p-4 border bg-[color:rgba(34,197,94,0.08)] border-border-subtle">
                <p className="text-xs text-[color:var(--color-text-body)]/50 mb-1.5 font-medium">EBIT Target</p>
                <p className="text-xl font-semibold tabular-nums text-accent-success">
                  {formatRON(ebitTarget)} <span className="text-sm font-normal text-[color:var(--color-text-body)]/40">RON</span>
                </p>
              </div>
              <div className={`rounded-lg p-4 border ${deltaRON >= 0 ? 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle' : 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle'}`}>
                <p className="text-xs text-[color:var(--color-text-body)]/50 mb-1.5 font-medium">Delta Vizat</p>
                <p className={`text-xl font-semibold tabular-nums ${deltaRON >= 0 ? 'text-accent-warning' : 'text-accent-warning'}`}>
                  {deltaRON >= 0 ? '+' : ''}{formatRON(deltaRON)} <span className="text-sm font-normal text-[color:var(--color-text-body)]/40">RON</span>
                </p>
              </div>
            </div>
          )}

          <SectionDivider>Note</SectionDivider>

          <div>
            <FieldLabel>Note Financiare</FieldLabel>
            <textarea rows={3} value={form.financial_notes}
              placeholder="Observații, ipoteze de calcul, context financiar..."
              onChange={(e) => set('financial_notes')(e.target.value)}
              className="w-full bg-white border border-[color:var(--color-border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[color:var(--color-text-body)] placeholder-[color:var(--color-text-body)]/30 focus:outline-none focus:border-[color:var(--color-text-primary)] focus:ring-1 focus:ring-[color:var(--color-text-primary)]/10 transition-all resize-none" />
          </div>

          {/* Context sync status */}
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            revenue > 0 && ebitCur > 0
              ? 'bg-[color:rgba(34,197,94,0.08)] border-border-subtle text-accent-success'
              : 'bg-[color:var(--color-page)] border-[color:var(--color-border-subtle)] text-[color:var(--color-text-body)]/40'
          }`}>
            <span>{revenue > 0 && ebitCur > 0 ? '✓' : '○'}</span>
            <span>
              {revenue > 0 && ebitCur > 0
                ? 'EBITBaseline activ în ProjectContext — EBITWidget vizibil în header'
                : 'Completează CA și EBIT Curent pentru a activa contextul EBIT'}
            </span>
          </div>
        </section>

      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  calculateAreaScore,
  calculateGlobalScore,
  getMaturityLevel,
  scoreO1, scoreO2, scoreO3,
  scoreT1, scoreT2, scoreT3,
  scoreS1, scoreS2, scoreS3,
} from '../utils/maturityCalculator'
import type {
  InputO1, InputO2, InputO3,
  InputT1, InputT2, InputT3,
  InputS1, InputS2, InputS3,
  StadiuS2,
} from '../utils/maturityCalculator'
import { useProjectContext } from '../context/ProjectContext'
import type { MaturityIndicator } from '../types/acda.types'
import { LEVEL_STYLE } from '../theme/levelStyles'

// ─── Types & Constants ────────────────────────────────────────────────────────

interface FormState {
  O1: InputO1; O2: InputO2; O3: InputO3
  T1: InputT1; T2: InputT2; T3: InputT3
  S1: InputS1; S2: InputS2; S3: InputS3
}

const INITIAL_FORM: FormState = {
  O1: { adoptie: 0,  tech: 1 },
  O2: { executanti: 0, manageri: 1 },
  O3: { areRisc: false, nivel: 1 },
  T1: { procent: 0 }, T2: { procent: 0 }, T3: { procent: 0 },
  S1: { areTarget: false, procentInitiative: 0 },
  S2: { stadiu: 'NU' },
  S3: { procent: 0 },
}

const STADIU_OPTIONS: { value: StadiuS2; label: string }[] = [
  { value: 'NU',            label: 'Nu există'     },
  { value: 'PLANIFICAT',    label: 'Planificat'    },
  { value: 'IN_CURS',       label: 'În curs'       },
  { value: 'FINALIZAT',     label: 'Finalizat'     },
  { value: 'ROI_CONFIRMAT', label: 'ROI Confirmat' },
]

const AREA_META = [
  { key: 'OA' as const, icon: '👥', label: 'Oameni & Adopție',  ids: ['O1','O2','O3'] },
  { key: 'TD' as const, icon: '⚙️', label: 'Tehnologie & Date', ids: ['T1','T2','T3'] },
  { key: 'SR' as const, icon: '📈', label: 'Strategie & ROI',   ids: ['S1','S2','S3'] },
]

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls = "w-full bg-white border border-[color:var(--color-border-subtle)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-text-body)] placeholder-[color:var(--color-text-body)]/30 focus:outline-none focus:border-[color:var(--color-text-primary)] focus:ring-1 focus:ring-[color:var(--color-text-primary)]/10 transition-all"
const selectCls = "w-full bg-white border border-[color:var(--color-border-subtle)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-text-body)] focus:outline-none focus:border-[color:var(--color-text-primary)] focus:ring-1 focus:ring-[color:var(--color-text-primary)]/10 transition-all"

// ─── Reusable field components ────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return <label className="block text-xs font-medium text-[color:var(--color-text-body)]/60 mb-1.5">{children}</label>
}

function NumericInput({ label, value, min = 0, placeholder = '0', onChange }: {
  label: string; value: number; min?: number; placeholder?: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input type="number" min={min} value={value === 0 ? '' : value} placeholder={placeholder}
        onChange={(e) => onChange(Math.max(min, parseFloat(e.target.value) || 0))}
        className={inputCls} />
    </div>
  )
}

function PercentSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-xs font-bold text-[color:var(--color-text-primary)] tabular-nums">{value}%</span>
      </div>
      <input type="range" min={0} max={100} step={5} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[color:var(--color-text-primary)] cursor-pointer" />
      <div className="flex justify-between text-xs text-[color:var(--color-text-body)]/30 mt-0.5"><span>0%</span><span>100%</span></div>
    </div>
  )
}

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={selectCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ label, icon, score, warnIds }: {
  label: string; icon: string; score: number; warnIds?: string[]
}) {
  const cfg = LEVEL_STYLE[getMaturityLevel(score)]
  return (
    <div className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border} flex flex-col gap-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[color:var(--color-text-body)]/60 font-medium">{icon} {label}</span>
        {warnIds && warnIds.length > 0 && (
          <span className="text-xs text-accent-warning font-bold bg-[color:rgba(245,158,11,0.08)] border border-border-subtle px-1.5 py-0.5 rounded">⚠ {warnIds.length}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-semibold tabular-nums ${cfg.text}`}>{score.toFixed(2)}</span>
        <span className="text-[color:var(--color-text-body)]/30 text-sm mb-0.5">/ 5</span>
      </div>
      <div className="w-full bg-[color:var(--color-border-subtle)] rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-500 ${cfg.bar}`} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border self-start ${cfg.chip}`}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── ScoreDashboard ───────────────────────────────────────────────────────────

interface ScoreDashboardProps {
  areaScores: Record<'OA' | 'TD' | 'SR', number>
  globalScore: number
  indicatorScores: Record<string, number>
}

function ScoreDashboard({ areaScores, globalScore, indicatorScores }: ScoreDashboardProps) {
  const globalCfg = LEVEL_STYLE[getMaturityLevel(globalScore)]

  const below3 = Object.entries(indicatorScores).filter(([, v]) => v < 3).map(([k]) => k)
  const areaWarnMap: Record<'OA' | 'TD' | 'SR', string[]> = {
    OA: below3.filter((id) => ['O1','O2','O3'].includes(id)),
    TD: below3.filter((id) => ['T1','T2','T3'].includes(id)),
    SR: below3.filter((id) => ['S1','S2','S3'].includes(id)),
  }

  return (
    <div className="bg-white border border-[color:var(--color-border-subtle)] rounded-lg p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-[color:var(--color-text-body)]/50 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-text-primary">◈</span> Scor ACDA — Live
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AREA_META.map((area) => (
          <ScoreCard key={area.key} label={area.label} icon={area.icon}
            score={areaScores[area.key]} warnIds={areaWarnMap[area.key]} />
        ))}

        {/* Global card — gradient border */}
        <div className={`lg:col-span-1 rounded-lg border p-4 ${globalCfg.bg} ${globalCfg.border} flex flex-col gap-3 shadow-card`}
          style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[color:var(--color-text-body)]/60 font-medium">🎯 Scor Global</span>
            {below3.length > 0 && (
              <span className="text-xs bg-[color:rgba(245,158,11,0.08)] border border-border-subtle text-accent-warning font-bold px-1.5 py-0.5 rounded">
                ⚠ {below3.length} sub 3.0
              </span>
            )}
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-semibold tabular-nums ${globalCfg.text}`}>{globalScore.toFixed(2)}</span>
            <span className="text-[color:var(--color-text-body)]/30 text-sm mb-0.5">/ 5</span>
          </div>
          <div className="w-full bg-[color:var(--color-border-subtle)] rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full transition-all duration-500 ${globalCfg.bar}`} style={{ width: `${(globalScore / 5) * 100}%` }} />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border self-start ${globalCfg.chip}`}>
            {globalCfg.label}
          </span>
          {below3.length > 0 && (
            <p className="text-xs text-accent-warning leading-relaxed">
              Critici: <span className="font-bold">{below3.join(', ')}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Indicator card shell ─────────────────────────────────────────────────────

function IndicatorCard({ id, name, score, children }: {
  id: string; name: string; score: number; children: React.ReactNode
}) {
  const cfg  = LEVEL_STYLE[getMaturityLevel(score)]
  const warn = score < 3
  return (
    <div className={`bg-white rounded-lg border p-5 flex flex-col gap-4 shadow-sm transition-all hover:shadow-card ${warn ? 'border-border-subtle' : 'border-[color:var(--color-border-subtle)]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${warn ? 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle text-accent-warning' : 'bg-[color:var(--color-page)] border-[color:var(--color-border-subtle)] text-[color:var(--color-text-body)]/50'}`}>
            {id} {warn && '⚠'}
          </span>
          <h3 className="text-sm font-semibold text-[color:var(--color-text-body)] mt-2">{name}</h3>
        </div>
        <div className={`text-2xl font-semibold tabular-nums flex-shrink-0 ${cfg.text}`}>{score.toFixed(1)}</div>
      </div>
      <div className="w-full bg-[color:var(--color-border-subtle)] rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-300 ${cfg.bar}`} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <div className="flex flex-col gap-3">{children}</div>
      <div className={`text-center text-xs font-bold uppercase tracking-wider py-1.5 rounded-lg border ${cfg.chip}`}>
        {cfg.label}
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label, score, isOpen, onToggle }: {
  icon: string; label: string; score: number; isOpen: boolean; onToggle: () => void
}) {
  const cfg = LEVEL_STYLE[getMaturityLevel(score)]
  return (
    <button onClick={onToggle}
      className={`w-full flex items-center justify-between px-5 py-4 rounded-lg border transition-all hover:shadow-card ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-[color:var(--color-text-body)]">{label}</span>
        <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded border ${cfg.chip}`}>
          {score.toFixed(2)} / 5
        </span>
        <span className={`text-xs font-bold uppercase ${cfg.text}`}>{cfg.label}</span>
      </div>
      <span className="text-[color:var(--color-text-body)]/40 text-xs">{isOpen ? '▲ Restrânge' : '▼ Extinde'}</span>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaturityRisk() {
  const { updateMaturityIndicator, maturityIndicators } = useProjectContext()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [open, setOpen] = useState<Record<'OA' | 'TD' | 'SR', boolean>>({ OA: true, TD: false, SR: false })
  const seededRef = useRef(false)

  // Hidratează formul din indicatorii persistaţi (raw_input_json) la prima apariţie.
  useEffect(() => {
    if (seededRef.current) return
    if (!maturityIndicators || maturityIndicators.length === 0) return
    seededRef.current = true
    const next: FormState = { ...INITIAL_FORM }
    for (const ind of maturityIndicators) {
      if (!ind.raw_input_json) continue
      try {
        const parsed = JSON.parse(ind.raw_input_json)
        const code = ind.indicator_code as keyof FormState
        if (code in next) (next as unknown as Record<string, unknown>)[code] = parsed
      } catch { /* ignoră intrări malformate */ }
    }
    setForm(next)
  }, [maturityIndicators])

  const scores = useMemo(() => ({
    O1: scoreO1(form.O1), O2: scoreO2(form.O2), O3: scoreO3(form.O3),
    T1: scoreT1(form.T1), T2: scoreT2(form.T2), T3: scoreT3(form.T3),
    S1: scoreS1(form.S1), S2: scoreS2(form.S2), S3: scoreS3(form.S3),
  }), [form])

  const areaScores = useMemo(() => ({
    OA: calculateAreaScore([scores.O1, scores.O2, scores.O3]),
    TD: calculateAreaScore([scores.T1, scores.T2, scores.T3]),
    SR: calculateAreaScore([scores.S1, scores.S2, scores.S3]),
  }), [scores])

  const globalScore = useMemo(() =>
    calculateGlobalScore({
      oameni:     areaScores.OA,
      tehnologie: areaScores.TD,
      strategie:  areaScores.SR,
    }), [areaScores])

  useEffect(() => {
    const now = new Date().toISOString()
    const toUpdate: MaturityIndicator[] = [
      { id: 'O1', project_id: 'local', indicator_code: 'O1', score: scores.O1, raw_input_json: JSON.stringify(form.O1), created_at: now, updated_at: now },
      { id: 'O2', project_id: 'local', indicator_code: 'O2', score: scores.O2, raw_input_json: JSON.stringify(form.O2), created_at: now, updated_at: now },
      { id: 'O3', project_id: 'local', indicator_code: 'O3', score: scores.O3, raw_input_json: JSON.stringify(form.O3), created_at: now, updated_at: now },
      { id: 'T1', project_id: 'local', indicator_code: 'T1', score: scores.T1, raw_input_json: JSON.stringify(form.T1), created_at: now, updated_at: now },
      { id: 'T2', project_id: 'local', indicator_code: 'T2', score: scores.T2, raw_input_json: JSON.stringify(form.T2), created_at: now, updated_at: now },
      { id: 'T3', project_id: 'local', indicator_code: 'T3', score: scores.T3, raw_input_json: JSON.stringify(form.T3), created_at: now, updated_at: now },
      { id: 'S1', project_id: 'local', indicator_code: 'S1', score: scores.S1, raw_input_json: JSON.stringify(form.S1), created_at: now, updated_at: now },
      { id: 'S2', project_id: 'local', indicator_code: 'S2', score: scores.S2, raw_input_json: JSON.stringify(form.S2), created_at: now, updated_at: now },
      { id: 'S3', project_id: 'local', indicator_code: 'S3', score: scores.S3, raw_input_json: JSON.stringify(form.S3), created_at: now, updated_at: now },
    ]
    toUpdate.forEach(updateMaturityIndicator)
  }, [scores, form, updateMaturityIndicator])

  const toggle = (key: 'OA' | 'TD' | 'SR') => setOpen((p) => ({ ...p, [key]: !p[key] }))

  const setO1    = (f: keyof InputO1, v: number)             => setForm((p) => ({ ...p, O1: { ...p.O1, [f]: v } }))
  const setO2    = (f: keyof InputO2, v: number)             => setForm((p) => ({ ...p, O2: { ...p.O2, [f]: v } }))
  const setO3R   = (v: boolean)                              => setForm((p) => ({ ...p, O3: { ...p.O3, areRisc: v } }))
  const setO3N   = (v: 1|2|3|4|5)                           => setForm((p) => ({ ...p, O3: { ...p.O3, nivel: v } }))
  const setPct   = (k: 'T1'|'T2'|'T3'|'S3', v: number)     => setForm((p) => ({ ...p, [k]: { procent: v } }))
  const setS1T   = (v: boolean)                              => setForm((p) => ({ ...p, S1: { ...p.S1, areTarget: v } }))
  const setS1P   = (v: number)                               => setForm((p) => ({ ...p, S1: { ...p.S1, procentInitiative: v } }))
  const setS2    = (v: StadiuS2)                             => setForm((p) => ({ ...p, S2: { stadiu: v } }))

  const boolOpts = [{ value: 'true', label: 'DA' }, { value: 'false', label: 'NU' }]

  return (
    <div className="min-h-screen bg-[color:var(--color-page)] text-[color:var(--color-text-body)] px-4 py-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div>
          <p className="text-xs text-[color:var(--color-text-body)]/40 uppercase tracking-widest mb-1">Evaluare ACDA</p>
          <h1 className="text-2xl font-semibold text-text-primary">Maturitate & Risc AI</h1>
          <p className="text-sm text-[color:var(--color-text-body)]/60 mt-1">
            Completează cei 9 indicatori pentru a calcula scorul de maturitate al organizației.
          </p>
        </div>

        <ScoreDashboard areaScores={areaScores} globalScore={globalScore} indicatorScores={scores} />

        {/* ── ARIA 1 ── */}
        <div className="flex flex-col gap-3">
          <SectionHeader icon="👥" label="Oameni & Adopție" score={areaScores.OA} isOpen={open.OA} onToggle={() => toggle('OA')} />
          {open.OA && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IndicatorCard id="O1" name="Regula 1:1" score={scores.O1}>
                <NumericInput label="Buget Change Management (RON)" value={form.O1.adoptie} placeholder="Ex: 50000"
                  onChange={(v) => setO1('adoptie', v)} />
                <NumericInput label="Buget Tehnologie (RON)" value={form.O1.tech} min={1} placeholder="Ex: 100000"
                  onChange={(v) => setO1('tech', v)} />
                <p className="text-xs text-[color:var(--color-text-body)]/40">
                  Ratio: <span className="text-[color:var(--color-text-body)] font-mono font-bold">
                    {(form.O1.tech > 0 ? form.O1.adoptie / form.O1.tech : 0).toFixed(2)}
                  </span>
                  <span className="ml-2">— minim: 1.0</span>
                </p>
              </IndicatorCard>

              <IndicatorCard id="O2" name="Densitatea Talentului" score={scores.O2}>
                <NumericInput label="Executanți tehnici AI" value={form.O2.executanti} placeholder="Ex: 12"
                  onChange={(v) => setO2('executanti', v)} />
                <NumericInput label="Manageri / Lead-uri" value={form.O2.manageri} min={1} placeholder="Ex: 3"
                  onChange={(v) => setO2('manageri', v)} />
                <p className="text-xs text-[color:var(--color-text-body)]/40">
                  Ratio: <span className="text-[color:var(--color-text-body)] font-mono font-bold">
                    {(form.O2.manageri > 0 ? form.O2.executanti / form.O2.manageri : 0).toFixed(1)}
                  </span>
                  <span className="ml-2">— optim: {'>'}4</span>
                </p>
              </IndicatorCard>

              <IndicatorCard id="O3" name="Riscul de Instruire" score={scores.O3}>
                <SelectField label="Există risc de obsolescență?"
                  value={form.O3.areRisc ? 'true' : 'false'}
                  options={boolOpts}
                  onChange={(v) => setO3R(v === 'true')} />
                {form.O3.areRisc && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <FieldLabel>Nivel risc (1 = scăzut, 5 = critic)</FieldLabel>
                      <span className="text-xs font-bold text-accent-warning tabular-nums">{form.O3.nivel}/5</span>
                    </div>
                    <input type="range" min={1} max={5} step={1} value={form.O3.nivel}
                      onChange={(e) => setO3N(parseInt(e.target.value) as 1|2|3|4|5)}
                      className="w-full accent-amber-500 cursor-pointer" />
                    <div className="flex justify-between text-xs text-[color:var(--color-text-body)]/30 mt-0.5">
                      <span>1 — Scăzut</span><span>5 — Critic</span>
                    </div>
                  </div>
                )}
                {!form.O3.areRisc && (
                  <p className="text-xs text-accent-success">✓ Fără risc de obsolescență identificat</p>
                )}
              </IndicatorCard>
            </div>
          )}
        </div>

        {/* ── ARIA 2 ── */}
        <div className="flex flex-col gap-3">
          <SectionHeader icon="⚙️" label="Tehnologie & Date" score={areaScores.TD} isOpen={open.TD} onToggle={() => toggle('TD')} />
          {open.TD && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IndicatorCard id="T1" name="Data Products" score={scores.T1}>
                <PercentSlider label="% date gestionate ca produse cu ownership clar"
                  value={form.T1.procent} onChange={(v) => setPct('T1', v)} />
              </IndicatorCard>
              <IndicatorCard id="T2" name="API-First" score={scores.T2}>
                <PercentSlider label="% capabilități expuse prin API"
                  value={form.T2.procent} onChange={(v) => setPct('T2', v)} />
              </IndicatorCard>
              <IndicatorCard id="T3" name="Assetizare" score={scores.T3}>
                <PercentSlider label="% capabilități AI transformate în active reutilizabile"
                  value={form.T3.procent} onChange={(v) => setPct('T3', v)} />
              </IndicatorCard>
            </div>
          )}
        </div>

        {/* ── ARIA 3 ── */}
        <div className="flex flex-col gap-3">
          <SectionHeader icon="📈" label="Strategie & ROI" score={areaScores.SR} isOpen={open.SR} onToggle={() => toggle('SR')} />
          {open.SR && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IndicatorCard id="S1" name="Focusul EBIT" score={scores.S1}>
                <SelectField label="Există target EBIT definit pentru AI?"
                  value={form.S1.areTarget ? 'true' : 'false'}
                  options={boolOpts}
                  onChange={(v) => setS1T(v === 'true')} />
                {form.S1.areTarget && (
                  <PercentSlider label="% inițiative AI cu KPI financiar legat de EBIT"
                    value={form.S1.procentInitiative} onChange={setS1P} />
                )}
                {!form.S1.areTarget && (
                  <p className="text-xs text-accent-warning">✗ Nicio inițiativă AI nu are target EBIT definit</p>
                )}
              </IndicatorCard>

              <IndicatorCard id="S2" name="Validarea Capstone" score={scores.S2}>
                <SelectField label="Stadiu proiect demonstrativ (Capstone)"
                  value={form.S2.stadiu} options={STADIU_OPTIONS} onChange={setS2} />
                <p className="text-xs text-[color:var(--color-text-body)]/40 leading-relaxed">
                  Proiect pilot care validează întregul model de transformare AI.
                </p>
              </IndicatorCard>

              <IndicatorCard id="S3" name="Trustworthy AI" score={scores.S3}>
                <PercentSlider label="% sisteme AI cu guvernanță și conformitate etică"
                  value={form.S3.procent} onChange={(v) => setPct('S3', v)} />
              </IndicatorCard>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

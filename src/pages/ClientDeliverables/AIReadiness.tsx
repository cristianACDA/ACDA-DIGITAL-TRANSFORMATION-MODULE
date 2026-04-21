// C3-T1 + C3-T2: AI Readiness Score per use case + Risk Map + Adoption Path.
// 4 criterii derivate din indicatori ACDA, editabile manual, status semafor.
// Scatter risc×impact cu tooltip + secvenţa de adopţie quick-wins → scalare.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectContext } from '../../context/ProjectContext'
import { mockCTDOutput } from '../../mocks/mock-cloudserve'
import { exportAIReadinessPDF } from '../../services/export/AIReadinessPDF'
import type { AIReadinessUseCase, AdoptionStep } from '../../services/export/AIReadinessPDF'
import { renderRiskMap, type RiskPoint } from '../../components/charts/riskMapCanvas'

type CriteriaKey = 'date' | 'infra' | 'skills' | 'reg'
type Scores = Record<CriteriaKey, number>

const CRITERIA_META: { key: CriteriaKey; label: string; hint: string }[] = [
  { key: 'date',   label: 'Date disponibile',  hint: 'Datele necesare există şi sunt accesibile?' },
  { key: 'infra',  label: 'Infrastructură',    hint: 'Infrastructura tech suportă implementarea?' },
  { key: 'skills', label: 'Competenţe echipă', hint: 'Echipa are skillurile necesare?' },
  { key: 'reg',    label: 'Reglementare',      hint: 'Constrângeri GDPR / AI Act / legal?' },
]

const ACTION_TEMPLATES: Record<CriteriaKey, string> = {
  date:   'Date disponibile: {{score}} — structuraţi datele relevante ca produse de date cu ownership definit, reguli de calitate şi acces controlat.',
  infra:  'Infrastructură: {{score}} — consolidaţi API-uri publice şi assetizare (containere, CI/CD) înainte de a introduce workload-uri AI în producţie.',
  skills: 'Competenţe echipă: {{score}} — investiţi în formare AI/ML pentru 2-3 roluri-cheie şi asiguraţi paritate 1:1 adopţie/tehnologie pentru acest use case.',
  reg:    'Reglementare: {{score}} — completaţi evaluarea de risc GDPR + AI Act, definiţi owner trustworthy-AI şi documentaţi guvernanţa modelelor.',
}

function statusOf(score: number): { key: 'ready' | 'needs' | 'not'; label: string; bg: string; chip: string; text: string } {
  if (score >= 3.5) return { key: 'ready', label: 'Ready',      bg: 'bg-[color:rgba(34,197,94,0.08)]',  chip: 'bg-accent-success',  text: 'text-accent-success' }
  if (score >= 2.0) return { key: 'needs', label: 'Needs Work', bg: 'bg-[color:rgba(245,158,11,0.08)]',  chip: 'bg-accent-warning',  text: 'text-accent-warning' }
  return                  { key: 'not',   label: 'Not Ready',  bg: 'bg-[color:rgba(245,158,11,0.08)]',    chip: 'bg-accent-danger',    text: 'text-accent-warning' }
}

function deriveScoresFromIndicators(indMap: Map<string, number>): Scores {
  const fallback = 3
  const t1 = indMap.get('T1') ?? fallback
  const t2 = indMap.get('T2') ?? fallback
  const t3 = indMap.get('T3') ?? fallback
  const o2 = indMap.get('O2') ?? fallback
  const o3 = indMap.get('O3') ?? fallback
  const s3 = indMap.get('S3') ?? fallback
  return {
    date:   t1,
    infra:  (t2 + t3) / 2,
    skills: (o2 + o3) / 2,
    reg:    s3,
  }
}

function buildActions(scores: Scores): string[] {
  const out: string[] = []
  for (const meta of CRITERIA_META) {
    const s = scores[meta.key]
    if (s < 3.0) {
      out.push(ACTION_TEMPLATES[meta.key].replace('{{score}}', s.toFixed(1)))
    }
  }
  return out
}

function average(scores: Scores): number {
  return (scores.date + scores.infra + scores.skills + scores.reg) / 4
}

export default function AIReadiness() {
  const { maturityIndicators, client, activeProjectId } = useProjectContext()
  const [exporting, setExporting] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  // Overrides per use case (manual edit).
  const [overrides, setOverrides] = useState<Record<string, Partial<Scores>>>({})

  const baseScores = useMemo(() => {
    const indMap = new Map<string, number>()
    for (const ind of maturityIndicators) {
      if (typeof ind.score === 'number') indMap.set(ind.indicator_code, ind.score)
    }
    return deriveScoresFromIndicators(indMap)
  }, [maturityIndicators])

  const useCases = useMemo(() => {
    const candidates = mockCTDOutput.oportunitati.filter(
      (o) => o.tip === 'AI' || o.tip === 'automatizare',
    )
    const impacts = candidates.map((o) => o.impact_ebit_estimat ?? 0)
    const maxImpact = Math.max(1, ...impacts)
    const minImpact = Math.min(...impacts, 0)
    const rangeImpact = Math.max(1, maxImpact - minImpact)

    const rows = candidates.map((o) => {
      const ov = overrides[o.titlu] ?? {}
      const scores: Scores = {
        date:   ov.date   ?? baseScores.date,
        infra:  ov.infra  ?? baseScores.infra,
        skills: ov.skills ?? baseScores.skills,
        reg:    ov.reg    ?? baseScores.reg,
      }
      const global = average(scores)
      const status = statusOf(global)
      const risc = o.risc ?? 3
      const impactNorm = 1 + ((o.impact_ebit_estimat ?? 0) - minImpact) / rangeImpact * 4
      return {
        titlu: o.titlu,
        tip: o.tip,
        efort: o.efort,
        impactEbit: o.impact_ebit_estimat ?? 0,
        risc,
        impactNorm,
        scores,
        global,
        status,
        actiuni: buildActions(scores),
      }
    })
    rows.sort((a, b) => b.global - a.global)
    return rows
  }, [baseScores, overrides])

  const { adoptionPath, scqaps } = useMemo(() => {
    // Compozit: readiness mare + risc mic = quick win. score = global - risc*0.5
    const scored = useCases.map((u) => ({ u, composite: u.global - u.risc * 0.5 }))
    const quickWins = scored.filter((s) => s.u.risc <= 2 && s.u.global >= 3.5).map((s) => s.u)
    const notReady = useCases.filter((u) => u.status.key === 'not')
    const pickedQW = new Set(quickWins.map((u) => u.titlu))
    const pickedNR = new Set(notReady.map((u) => u.titlu))
    const midRange = useCases.filter((u) => !pickedQW.has(u.titlu) && !pickedNR.has(u.titlu))

    const steps: AdoptionStep[] = []
    quickWins.forEach((u) => steps.push({
      pas: 1, titlu: 'Quick wins (low risk · high readiness)',
      useCaseTitlu: u.titlu, readiness: u.global, risc: u.risc,
      timeline: 'Luna 1-3',
      prerequisite: 'Sponsor executiv + echipă mixtă IT/business definită',
    }))
    midRange.forEach((u) => steps.push({
      pas: 2, titlu: 'Risc mediu · readiness mediu',
      useCaseTitlu: u.titlu, readiness: u.global, risc: u.risc,
      timeline: 'Luna 4-7',
      prerequisite: u.actiuni[0] ?? 'Consolidare rezultate Pas 1 + governance AI activă',
    }))
    notReady.forEach((u) => steps.push({
      pas: 3, titlu: 'Risc ridicat sau readiness scăzut',
      useCaseTitlu: u.titlu, readiness: u.global, risc: u.risc,
      timeline: 'Luna 8-12',
      prerequisite: u.actiuni[0] ?? 'Remediere criterii sub prag + pilot validat',
    }))

    const scqaps = `Situaţie: Compania are ${useCases.length} use case-uri AI identificate. ` +
      `Complicaţie: ${notReady.length} nu sunt pregătite pentru implementare (criterii sub pragul minim). ` +
      `Întrebare: În ce ordine le implementăm pentru a capta valoare fără a escalada riscul? ` +
      `Răspuns: Începem cu ${quickWins.length || 'primul'} quick-win${quickWins.length === 1 ? '' : 's'} în Luna 1-3 — use case-uri low-risk cu readiness ≥3.5 — care finanţează şi legitimează fazele următoare. ` +
      `Propunere: rulăm secvenţa pe 12 luni cu poarta de decizie după Pasul 1. ` +
      `Salvgardare: niciun use case Pas 2 sau 3 nu porneşte fără ROI confirmat pe Pas 1 şi governance trustworthy-AI activă.`

    return { adoptionPath: steps, scqaps }
  }, [useCases])

  const setOverride = (titlu: string, key: CriteriaKey, value: number) => {
    setOverrides((prev) => ({
      ...prev,
      [titlu]: { ...(prev[titlu] ?? {}), [key]: value },
    }))
  }

  const resetOverrides = (titlu: string) => {
    setOverrides((prev) => {
      const { [titlu]: _omit, ...rest } = prev
      void _omit
      return rest
    })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const payload: AIReadinessUseCase[] = useCases.map((u) => ({
        titlu: u.titlu,
        global: u.global,
        status: u.status.key,
        statusLabel: u.status.label,
        criterii: { date: u.scores.date, infra: u.scores.infra, skills: u.scores.skills, reg: u.scores.reg },
        actiuni: u.actiuni,
      }))
      const riskPoints: RiskPoint[] = useCases.map((u) => ({
        label: u.titlu,
        probability: u.risc,
        impact: u.impactNorm,
        riskLevel: u.risc <= 2 ? 'low' : u.risc === 3 ? 'med' : 'high',
      }))
      const riskMapPng = renderRiskMap(riskPoints)
      await exportAIReadinessPDF({
        clientName: client?.company_name ?? mockCTDOutput.denumire,
        useCases: payload,
        riskMapPng,
        adoptionPath,
        scqaps,
      })
    } finally {
      setExporting(false)
    }
  }

  if (!activeProjectId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border border-[color:var(--color-border-subtle)] rounded-lg p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)] mb-2">Niciun proiect selectat</h2>
          <p className="text-sm text-[color:var(--color-text-body)]/60">
            Alege un proiect din <Link to="/dashboard" className="text-[color:var(--color-text-primary)] font-semibold hover:underline">Dashboard</Link>.
          </p>
        </div>
      </div>
    )
  }

  const clientName = client?.company_name ?? mockCTDOutput.denumire

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[color:var(--color-border-subtle)]">
        <div>
          <p className="text-xs text-[color:var(--color-text-primary)]/70 uppercase tracking-widest font-semibold">AI Readiness</p>
          <h1 className="text-2xl font-semibold text-[color:var(--color-text-primary)] mt-1">{clientName}</h1>
          <p className="text-sm text-[color:var(--color-text-body)]/60 mt-0.5">
            {useCases.length} use case-uri evaluate pe 4 criterii · scorurile pot fi suprascrise manual
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors inline-flex items-center gap-2 ${
            exporting ? 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)] text-[color:var(--color-text-body)]/40 cursor-not-allowed' : 'border-[color:var(--color-text-primary)] bg-[color:var(--color-text-primary)] text-white hover:bg-[color:var(--color-text-body)]'
          }`}
        >
          {exporting ? 'Se generează…' : '📄 Exportă PDF'}
        </button>
      </div>

      {/* Use Case Scoring */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Use Case Scoring</h2>
        {useCases.map((u) => {
          const hasOverride = overrides[u.titlu] && Object.keys(overrides[u.titlu]).length > 0
          return (
            <article key={u.titlu} className={`rounded-lg border border-[color:var(--color-border-subtle)] ${u.status.bg} overflow-hidden`}>
              <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-[color:var(--color-border-subtle)]/70">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-[color:var(--color-border-subtle)] text-[color:var(--color-text-body)]/70 px-2 py-0.5 rounded">
                      {u.tip}
                    </span>
                    <span className="text-[10px] text-[color:var(--color-text-body)]/50">Efort {u.efort}</span>
                    {hasOverride && (
                      <button onClick={() => resetOverrides(u.titlu)} className="text-[10px] text-[color:var(--color-text-primary)] hover:underline">
                        reset manual
                      </button>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[color:var(--color-text-primary)]">{u.titlu}</h3>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className={`text-3xl font-semibold tabular-nums ${u.status.text}`}>{u.global.toFixed(1)}</div>
                    <div className="text-[10px] text-[color:var(--color-text-body)]/50">/ 5.0</div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded text-white ${u.status.chip}`}>
                    {u.status.label}
                  </span>
                </div>
              </div>

              {/* Criterii */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 px-5 py-4">
                {CRITERIA_META.map((meta) => {
                  const val = u.scores[meta.key]
                  const low = val < 3.0
                  return (
                    <div key={meta.key} className="bg-white border border-[color:var(--color-border-subtle)] rounded-lg p-3">
                      <p className="text-[10px] text-[color:var(--color-text-body)]/50 uppercase tracking-widest font-semibold">{meta.label}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl font-semibold tabular-nums ${low ? 'text-accent-warning' : 'text-[color:var(--color-text-primary)]'}`}>
                          {val.toFixed(1)}
                        </span>
                        <span className="text-xs text-[color:var(--color-text-body)]/40">/ 5</span>
                      </div>
                      <input
                        type="range"
                        min={0} max={5} step={0.1}
                        value={val}
                        onChange={(e) => setOverride(u.titlu, meta.key, Number(e.target.value))}
                        className="w-full mt-2 accent-[color:var(--color-text-primary)]"
                        aria-label={`${meta.label} — ${meta.hint}`}
                      />
                      <p className="text-[10px] text-[color:var(--color-text-body)]/50 mt-1">{meta.hint}</p>
                    </div>
                  )
                })}
              </div>

              {/* Acţiuni */}
              {u.actiuni.length > 0 && (
                <div className="px-5 pb-4">
                  <p className="text-xs font-bold text-[color:var(--color-text-primary)] uppercase tracking-widest mb-2">Acţiuni recomandate</p>
                  <ul className="flex flex-col gap-1.5">
                    {u.actiuni.map((a, i) => (
                      <li key={i} className="text-sm text-[color:var(--color-text-body)] leading-relaxed flex gap-2">
                        <span className="text-[color:var(--color-text-primary)] font-bold">→</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </section>

      {/* Risk Map */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Risk Map — probabilitate × impact</h2>
        <div className="bg-white border border-[color:var(--color-border-subtle)] rounded-lg p-4">
          <RiskMapSVG useCases={useCases} hovered={hovered} setHovered={setHovered} />
          <p className="text-xs text-[color:var(--color-text-body)]/60 mt-2 leading-relaxed">
            Culori: <span className="text-accent-success font-semibold">verde</span> = risc ≤2 · {' '}
            <span className="text-accent-warning font-semibold">galben</span> = risc 3 · {' '}
            <span className="text-accent-warning font-semibold">roşu</span> = risc ≥4.
            Hover pe un punct pentru detalii.
          </p>
        </div>
      </section>

      {/* Adoption Path */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)]">Safe Adoption Path</h2>
        <div className="bg-[color:var(--color-page)] border border-[color:var(--color-border-subtle)] rounded-lg p-4 text-sm text-[color:var(--color-text-body)] leading-relaxed">
          <p className="italic">{scqaps}</p>
        </div>
        <ol className="flex flex-col gap-3">
          {[1, 2, 3].map((p) => {
            const steps = adoptionPath.filter((s) => s.pas === p)
            if (steps.length === 0) return null
            const stepMeta = {
              1: { label: 'Pas 1 · Quick wins', chip: 'bg-accent-success',  timeline: 'Luna 1-3' },
              2: { label: 'Pas 2 · Consolidare', chip: 'bg-accent-warning', timeline: 'Luna 4-7' },
              3: { label: 'Pas 3 · Extindere',   chip: 'bg-[color:var(--color-text-primary)]', timeline: 'Luna 8-12' },
            }[p as 1 | 2 | 3]
            return (
              <li key={p} className="bg-white border border-[color:var(--color-border-subtle)] rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)]">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded text-white ${stepMeta.chip}`}>
                    {stepMeta.label}
                  </span>
                  <span className="text-xs text-[color:var(--color-text-body)]/60">{stepMeta.timeline}</span>
                  <span className="text-xs text-[color:var(--color-text-body)]/40">· {steps.length} use case(s)</span>
                </div>
                <ul className="divide-y divide-[color:var(--color-border-subtle)]">
                  {steps.map((s) => (
                    <li key={s.useCaseTitlu} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h3 className="text-sm font-bold text-[color:var(--color-text-primary)]">{s.useCaseTitlu}</h3>
                        <div className="flex items-center gap-3 text-xs text-[color:var(--color-text-body)]/70 tabular-nums">
                          <span>readiness <strong>{s.readiness.toFixed(1)}</strong></span>
                          <span>risc <strong>{s.risc.toFixed(1)}</strong></span>
                        </div>
                      </div>
                      <p className="text-xs text-[color:var(--color-text-body)]/70"><strong>Prerequisite:</strong> {s.prerequisite}</p>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="text-center text-xs text-[color:var(--color-text-body)]/50 border-t border-[color:var(--color-border-subtle)] pt-4">
        ACDA Consulting · Confidenţial
      </div>
    </div>
  )
}

// ─── Risk Map SVG ────────────────────────────────────────────────────────────

interface RiskMapProps {
  useCases: {
    titlu: string
    risc: number
    impactNorm: number
    impactEbit: number
    global: number
  }[]
  hovered: string | null
  setHovered: (v: string | null) => void
}

function RiskMapSVG({ useCases, hovered, setHovered }: RiskMapProps) {
  const W = 720, H = 440
  const padL = 60, padR = 20, padT = 24, padB = 50
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const xScale = (v: number) => padL + (plotW * (Math.max(1, Math.min(5, v)) - 1)) / 4
  const yScale = (v: number) => padT + plotH - (plotH * (Math.max(1, Math.min(5, v)) - 1)) / 4
  const midX = padL + plotW / 2
  const midY = padT + plotH / 2
  const colorFor = (risc: number) =>
    risc <= 2 ? '#0E7A3C' : risc === 3 ? '#DAA520' : '#C0392B'
  const hover = useCases.find((u) => u.titlu === hovered)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Risk Map">
        <rect x={padL}  y={padT} width={plotW / 2} height={plotH / 2} fill="#E8F5E9" />
        <rect x={midX}  y={padT} width={plotW / 2} height={plotH / 2} fill="#FDECEA" />
        <rect x={padL}  y={midY} width={plotW / 2} height={plotH / 2} fill="#F6F9FC" />
        <rect x={midX}  y={midY} width={plotW / 2} height={plotH / 2} fill="#FFF4E5" />
        {[1, 2, 3, 4, 5].map((i) => (
          <g key={`gx${i}`}>
            <line x1={xScale(i)} y1={padT} x2={xScale(i)} y2={padT + plotH} stroke="#D0D7DE" strokeDasharray="2 3" />
            <text x={xScale(i)} y={padT + plotH + 14} fontSize="11" textAnchor="middle" fill="#0A2540">{i}</text>
          </g>
        ))}
        {[1, 2, 3, 4, 5].map((i) => (
          <g key={`gy${i}`}>
            <line x1={padL} y1={yScale(i)} x2={padL + plotW} y2={yScale(i)} stroke="#D0D7DE" strokeDasharray="2 3" />
            <text x={padL - 6} y={yScale(i) + 4} fontSize="11" textAnchor="end" fill="#0A2540">{i}</text>
          </g>
        ))}
        <text x={padL + plotW / 4} y={padT + 14} fontSize="11" fontWeight="700" textAnchor="middle" fill="#0A2540">SWEET SPOT</text>
        <text x={midX + plotW / 4} y={padT + 14} fontSize="11" fontWeight="700" textAnchor="middle" fill="#0A2540">ATENŢIE</text>
        <text x={padL + plotW / 4} y={padT + plotH - 6} fontSize="10" textAnchor="middle" fill="#0A2540" opacity="0.6">Low impact — deprioritizat</text>
        <text x={midX + plotW / 4} y={padT + plotH - 6} fontSize="10" fontWeight="700" textAnchor="middle" fill="#C0392B">EVITĂ</text>
        <text x={padL + plotW / 2} y={H - 8} fontSize="12" fontWeight="700" textAnchor="middle" fill="#071F80">Probabilitate risc →</text>
        <text x={16} y={padT + plotH / 2} fontSize="12" fontWeight="700" textAnchor="middle" fill="#071F80"
          transform={`rotate(-90 16 ${padT + plotH / 2})`}>Impact EBIT →</text>
        {useCases.map((u) => {
          const cx = xScale(u.risc)
          const cy = yScale(u.impactNorm)
          const isHovered = hovered === u.titlu
          return (
            <g key={u.titlu} onMouseEnter={() => setHovered(u.titlu)} onMouseLeave={() => setHovered(null)}
               style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={isHovered ? 10 : 7} fill={colorFor(u.risc)} stroke="#FFFFFF" strokeWidth="2" />
              <text x={cx + 12} y={cy + 4} fontSize="10" fill="#0A2540">
                {u.titlu.length > 28 ? u.titlu.slice(0, 27) + '…' : u.titlu}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <div className="absolute top-2 right-2 bg-white border border-[color:var(--color-border-subtle)] rounded-lg shadow-card px-3 py-2 text-xs max-w-[280px] pointer-events-none">
          <p className="font-bold text-[color:var(--color-text-primary)] leading-snug mb-1">{hover.titlu}</p>
          <p className="text-[color:var(--color-text-body)]/70">Risc: <strong>{hover.risc.toFixed(1)}/5</strong></p>
          <p className="text-[color:var(--color-text-body)]/70">Impact EBIT: <strong>{hover.impactEbit.toLocaleString('ro-RO')} RON</strong></p>
          <p className="text-[color:var(--color-text-body)]/70">AI Readiness: <strong>{hover.global.toFixed(1)}/5</strong></p>
        </div>
      )}
    </div>
  )
}

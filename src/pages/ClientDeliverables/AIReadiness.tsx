// C3-T1: AI Readiness Score per use case.
// 4 criterii derivate din indicatori ACDA, editabile manual, status semafor.
// C3-T2 (Risk Map + Adoption Path) — placeholder în josul paginii.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectContext } from '../../context/ProjectContext'
import { mockCTDOutput } from '../../mocks/mock-cloudserve'
import { exportAIReadinessPDF } from '../../services/export/AIReadinessPDF'
import type { AIReadinessUseCase } from '../../services/export/AIReadinessPDF'

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
  if (score >= 3.5) return { key: 'ready', label: 'Ready',      bg: 'bg-green-50',  chip: 'bg-green-600',  text: 'text-green-700' }
  if (score >= 2.0) return { key: 'needs', label: 'Needs Work', bg: 'bg-amber-50',  chip: 'bg-amber-500',  text: 'text-amber-700' }
  return                  { key: 'not',   label: 'Not Ready',  bg: 'bg-red-50',    chip: 'bg-red-600',    text: 'text-red-700' }
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
      return {
        titlu: o.titlu,
        tip: o.tip,
        efort: o.efort,
        scores,
        global,
        status,
        actiuni: buildActions(scores),
      }
    })
    rows.sort((a, b) => b.global - a.global)
    return rows
  }, [baseScores, overrides])

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
      await exportAIReadinessPDF({
        clientName: client?.company_name ?? mockCTDOutput.denumire,
        useCases: payload,
      })
    } finally {
      setExporting(false)
    }
  }

  if (!activeProjectId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border border-[#E6E6E6] rounded-xl p-8 text-center shadow-sm">
          <h2 className="text-xl font-black text-[#071F80] mb-2">Niciun proiect selectat</h2>
          <p className="text-sm text-[#0A2540]/60">
            Alege un proiect din <Link to="/dashboard" className="text-[#071F80] font-semibold hover:underline">Dashboard</Link>.
          </p>
        </div>
      </div>
    )
  }

  const clientName = client?.company_name ?? mockCTDOutput.denumire

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E6E6E6]">
        <div>
          <p className="text-xs text-[#071F80]/70 uppercase tracking-widest font-semibold">AI Readiness</p>
          <h1 className="text-2xl font-black text-[#071F80] mt-1">{clientName}</h1>
          <p className="text-sm text-[#0A2540]/60 mt-0.5">
            {useCases.length} use case-uri evaluate pe 4 criterii · scorurile pot fi suprascrise manual
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors inline-flex items-center gap-2 ${
            exporting ? 'border-[#E6E6E6] bg-[#F6F9FC] text-[#0A2540]/40 cursor-not-allowed' : 'border-[#071F80] bg-[#071F80] text-white hover:bg-[#0A2540]'
          }`}
        >
          {exporting ? 'Se generează…' : '📄 Exportă PDF'}
        </button>
      </div>

      {/* Use Case Scoring */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-black text-[#071F80]">Use Case Scoring</h2>
        {useCases.map((u) => {
          const hasOverride = overrides[u.titlu] && Object.keys(overrides[u.titlu]).length > 0
          return (
            <article key={u.titlu} className={`rounded-xl border-2 border-[#E6E6E6] ${u.status.bg} overflow-hidden`}>
              <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-[#E6E6E6]/70">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-[#E6E6E6] text-[#0A2540]/70 px-2 py-0.5 rounded">
                      {u.tip}
                    </span>
                    <span className="text-[10px] text-[#0A2540]/50">Efort {u.efort}</span>
                    {hasOverride && (
                      <button onClick={() => resetOverrides(u.titlu)} className="text-[10px] text-[#071F80] hover:underline">
                        reset manual
                      </button>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#071F80]">{u.titlu}</h3>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className={`text-3xl font-black tabular-nums ${u.status.text}`}>{u.global.toFixed(1)}</div>
                    <div className="text-[10px] text-[#0A2540]/50">/ 5.0</div>
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
                    <div key={meta.key} className="bg-white border border-[#E6E6E6] rounded-lg p-3">
                      <p className="text-[10px] text-[#0A2540]/50 uppercase tracking-widest font-semibold">{meta.label}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl font-black tabular-nums ${low ? 'text-red-600' : 'text-[#071F80]'}`}>
                          {val.toFixed(1)}
                        </span>
                        <span className="text-xs text-[#0A2540]/40">/ 5</span>
                      </div>
                      <input
                        type="range"
                        min={0} max={5} step={0.1}
                        value={val}
                        onChange={(e) => setOverride(u.titlu, meta.key, Number(e.target.value))}
                        className="w-full mt-2 accent-[#071F80]"
                        aria-label={`${meta.label} — ${meta.hint}`}
                      />
                      <p className="text-[10px] text-[#0A2540]/50 mt-1">{meta.hint}</p>
                    </div>
                  )
                })}
              </div>

              {/* Acţiuni */}
              {u.actiuni.length > 0 && (
                <div className="px-5 pb-4">
                  <p className="text-xs font-bold text-[#071F80] uppercase tracking-widest mb-2">Acţiuni recomandate</p>
                  <ul className="flex flex-col gap-1.5">
                    {u.actiuni.map((a, i) => (
                      <li key={i} className="text-sm text-[#0A2540] leading-relaxed flex gap-2">
                        <span className="text-[#071F80] font-bold">→</span>
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

      {/* C3-T2 placeholder */}
      <section className="border-2 border-dashed border-[#E6E6E6] rounded-xl p-6 text-center bg-[#F6F9FC]">
        <p className="text-xs font-bold uppercase tracking-widest text-[#0A2540]/50 mb-1">Următor: C3-T2</p>
        <h2 className="text-base font-bold text-[#071F80]">Risk Map + Adoption Path</h2>
        <p className="text-sm text-[#0A2540]/60 mt-1">
          Harta riscurilor AI (probabilitate × impact) + parcursul de adopţie pilot → scalare.
        </p>
      </section>

      <div className="text-center text-xs text-[#0A2540]/50 border-t border-[#E6E6E6] pt-4">
        ACDA Consulting · Confidenţial
      </div>
    </div>
  )
}

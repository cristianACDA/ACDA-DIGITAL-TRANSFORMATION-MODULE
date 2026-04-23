// C2-T1: Strategie 10 minute — 4 capitole narative, prezentabilă board-ului.
// Max 1500 cuvinte total. Sursă: ProjectContext + mockCTDOutput fallback.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectContext } from '../../context/ProjectContext'
import {
  calculateAreaScore,
  calculateGlobalScore,
  getMaturityLevel,
} from '../../utils/maturityCalculator'
import { mockCTDOutput } from '../../mocks/mock-cloudserve'
import {
  exportStrategy10minPDF,
  type Milestone,
  type StrategyPillarOut,
} from '../../services/export/Strategy10minPDF'

const MS_FORMAT = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 })

function pickTopProbleme(): { titlu: string; impact: number | null }[] {
  return mockCTDOutput.probleme
    .slice()
    .sort((a, b) => (b.impact_financiar ?? 0) - (a.impact_financiar ?? 0))
    .slice(0, 3)
    .map((p) => ({ titlu: p.titlu, impact: p.impact_financiar }))
}

function pickTopOportunitati(): { titlu: string; impact: number; efort: string }[] {
  return mockCTDOutput.oportunitati
    .slice()
    .sort((a, b) => (b.impact_ebit_estimat ?? 0) - (a.impact_ebit_estimat ?? 0))
    .slice(0, 3)
    .map((o) => ({ titlu: o.titlu, impact: o.impact_ebit_estimat ?? 0, efort: o.efort }))
}

export default function Strategy10min() {
  const { maturityIndicators, ebitBaseline, client, activeProjectId } = useProjectContext()
  const [exporting, setExporting] = useState(false)

  const data = useMemo(() => {
    const scoreByCode = new Map<string, number>()
    for (const ind of maturityIndicators) {
      if (typeof ind.score === 'number') scoreByCode.set(ind.indicator_code, ind.score)
    }
    const areaScores = {
      oameni:     calculateAreaScore(['O1', 'O2', 'O3'].map((c) => scoreByCode.get(c)).filter((v): v is number => typeof v === 'number')),
      tehnologie: calculateAreaScore(['T1', 'T2', 'T3'].map((c) => scoreByCode.get(c)).filter((v): v is number => typeof v === 'number')),
      strategie:  calculateAreaScore(['S1', 'S2', 'S3'].map((c) => scoreByCode.get(c)).filter((v): v is number => typeof v === 'number')),
    }
    const globalScore = calculateGlobalScore(areaScores)
    const level = getMaturityLevel(globalScore)

    const ebitCurrent: number = ebitBaseline?.ebit_current ?? mockCTDOutput.date_financiare.ebit_curent ?? 0
    const ebitTarget: number = ebitBaseline?.ebit_target ?? mockCTDOutput.date_financiare.ebit_target ?? 0
    const deltaEbit = ebitTarget - ebitCurrent

    const probleme = pickTopProbleme()
    const pierderiAnuale = probleme.reduce((s, p) => s + (p.impact ?? 0), 0)

    const oportunitati = pickTopOportunitati()
    const clientName = client?.company_name ?? mockCTDOutput.denumire

    return {
      clientName,
      globalScore,
      level,
      areaScores,
      ebitCurrent,
      ebitTarget,
      deltaEbit,
      probleme,
      oportunitati,
      pierderiAnuale,
    }
  }, [maturityIndicators, ebitBaseline, client])

  const capitol1 = `Compania se află astăzi la un scor de maturitate ACDA de ${data.globalScore.toFixed(2)} din 5.00, încadrată la nivelul ${data.level}. Diagnosticul pe cele trei arii arată o imagine clară: Oameni & Adopţie ${data.areaScores.oameni.toFixed(1)}, Tehnologie & Date ${data.areaScores.tehnologie.toFixed(1)}, Strategie & ROI ${data.areaScores.strategie.toFixed(1)}.

Diferenţa dintre aceste scoruri nu este cosmetică — ea reflectă dezechilibre operaţionale care blochează creşterea EBIT. Metodologia ACDA demonstrează că organizaţiile care ating scoruri peste 3.5 pe toate cele trei arii captează sistematic între 15% şi 25% creştere EBIT anuală faţă de media industriei.

Plecând de la această poziţie, obiectivul strategiei este să ridice compania peste pragul CONFORM în următoarele 12 luni, cu paşi calibraţi pe ceea ce este deja funcţional şi pe ceea ce trebuie deblocat cu prioritate.`

  const capitol2 = `Inacţiunea are un cost cuantificabil. EBIT-ul curent este ${MS_FORMAT(data.ebitCurrent)} RON, iar ţinta realistă este ${MS_FORMAT(data.ebitTarget)} RON — un delta de ${MS_FORMAT(data.deltaEbit)} RON pe care organizaţia îl lasă pe masă în fiecare an în care nu acţionează.

Trei riscuri majore erodează deja performanţa. Primul: ${data.probleme[0]?.titlu ?? '—'}${data.probleme[0]?.impact != null ? ` (impact anual estimat ${MS_FORMAT(data.probleme[0].impact as number)} RON)` : ''}. Al doilea: ${data.probleme[1]?.titlu ?? '—'}${data.probleme[1]?.impact != null ? ` (${MS_FORMAT(data.probleme[1].impact as number)} RON)` : ''}. Al treilea: ${data.probleme[2]?.titlu ?? '—'}${data.probleme[2]?.impact != null ? ` (${MS_FORMAT(data.probleme[2].impact as number)} RON)` : ''}.

Cumulat, aceste pierderi reprezintă aproximativ ${MS_FORMAT(data.pierderiAnuale)} RON erodare EBIT anual. Proiectate pe 12 luni de status-quo, rezultatul este dublu: marjă comprimată şi poziţie competitivă slăbită faţă de jucătorii care au început deja transformarea.`

  const pillars: StrategyPillarOut[] = data.oportunitati.map((o, idx) => ({
    titlu: `Pilon ${idx + 1}: ${o.titlu}`,
    impact: `+${MS_FORMAT(o.impact)} RON EBIT/an`,
    efort: `Efort ${o.efort}`,
    narativ: `Această direcţie decuplează valoare din zonele cu cel mai mare grad de blocare şi produce impact măsurabil în primele 2 trimestre. Investiţia ACDA 1:1 (tehnologie + adopţie) asigură că rezultatul nu rămâne blocat în PowerPoint.`,
  }))

  const capitol3Intro = `Răspunsul strategic constă în trei piloni aliniaţi fiecare cu un indicator ACDA sub prag. Împreună, aceşti piloni acoperă delta EBIT de ${MS_FORMAT(data.deltaEbit)} RON şi ridică scorul global peste pragul CONFORM. Sunt alese pentru că produc impact măsurabil în primele 90 de zile şi au dependinţe rezolvabile cu resursele existente.`

  const milestones: Milestone[] = [
    { label: 'Capstone pilot', when: 'Luna 1' },
    { label: 'Primul pilon live', when: 'Luna 3' },
    { label: 'Pilon 2 & 3 în execuţie', when: 'Luna 6' },
    { label: 'Evaluare ROI', when: 'Luna 9' },
    { label: 'Scalare & consolidare', when: 'Luna 12' },
  ]

  const capitol4Intro = `Parcursul este organizat pe cinci milestone-uri, fiecare validat prin criterii clare înainte de trecerea la următorul. Niciun milestone nu se mişcă fără evidenţă EBIT şi fără paritate 1:1 între investiţia în tehnologie şi investiţia în oameni. Această disciplină este ceea ce face diferenţa între un proiect care produce rezultate şi unul care consumă buget.`

  const firstStep = {
    actiune: `Lansare Capstone pilot pe ${data.oportunitati[0]?.titlu ?? 'prima oportunitate prioritizată'}`,
    deadline: new Date(Date.now() + 30 * 86400000).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }),
    responsabil: 'Sponsor executiv (CEO/COO) + ACDA lead consultant',
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportStrategy10minPDF({
        clientName: data.clientName,
        globalScore: data.globalScore,
        level: data.level,
        capitol1,
        capitol2,
        capitol3Intro,
        pillars,
        capitol4Intro,
        milestones,
        firstStep,
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

  const today = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[color:var(--color-border-subtle)]">
        <div>
          <p className="text-xs text-[color:var(--color-text-primary)]/70 uppercase tracking-widest font-semibold">Strategie de Transformare</p>
          <h1 className="text-2xl font-semibold text-[color:var(--color-text-primary)] mt-1">{data.clientName}</h1>
          <p className="text-sm text-[color:var(--color-text-body)]/60 mt-0.5">
            {today} · Scor global <strong>{data.globalScore.toFixed(2)}</strong> / 5.00 · <span className="font-mono text-xs">{data.level}</span>
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
          {exporting ? (
            <>
              <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
              Se generează…
            </>
          ) : (
            <>📄 Exportă ca PDF</>
          )}
        </button>
      </div>

      {/* Capitolul 1 */}
      <Chapter num={1} title="Unde suntem" text={capitol1} />

      {/* Capitolul 2 */}
      <Chapter num={2} title="Costul inacţiunii" text={capitol2} highlight={
        <div className="bg-[color:rgba(245,158,11,0.08)] border border-border-subtle rounded-lg p-3 text-sm">
          <strong className="text-accent-warning">Pierderi estimate pe 12 luni: {MS_FORMAT(data.pierderiAnuale)} RON</strong>
          <span className="text-[color:var(--color-text-body)]/70"> · Delta EBIT lăsat pe masă: {MS_FORMAT(data.deltaEbit)} RON</span>
        </div>
      } />

      {/* Capitolul 3 */}
      <section className="flex flex-col gap-3">
        <ChapterHeader num={3} title="Ce propunem" />
        <p className="text-[15px] leading-relaxed text-[color:var(--color-text-body)]">{capitol3Intro}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.titlu} className="bg-[color:var(--color-page)] border border-[color:var(--color-border-subtle)] rounded-lg p-4">
              <p className="text-xs text-[color:var(--color-text-primary)]/70 uppercase tracking-widest font-semibold">{p.titlu.split(':')[0]}</p>
              <h3 className="text-base font-bold text-[color:var(--color-text-primary)] mt-1 mb-2 leading-snug">{p.titlu.split(':').slice(1).join(':').trim()}</h3>
              <p className="text-xs text-[color:var(--color-text-body)]/80"><strong>{p.impact}</strong></p>
              <p className="text-xs text-[color:var(--color-text-body)]/60 mb-2">{p.efort}</p>
              <p className="text-xs text-[color:var(--color-text-body)]/80 leading-relaxed">{p.narativ}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capitolul 4 */}
      <section className="flex flex-col gap-4">
        <ChapterHeader num={4} title="Cum ajungem" />
        <p className="text-[15px] leading-relaxed text-[color:var(--color-text-body)]">{capitol4Intro}</p>

        {/* Timeline vizual */}
        <div className="bg-white border border-[color:var(--color-border-subtle)] rounded-lg p-5">
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-0.5 bg-[#2E75B6]" />
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${milestones.length}, 1fr)` }}>
              {milestones.map((m, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text-primary)] mb-1">{m.when}</div>
                  <div className="w-4 h-4 rounded-full bg-[color:var(--color-text-primary)] border border-white shadow-card z-10" />
                  <div className="text-xs text-center mt-2 text-[color:var(--color-text-body)] px-1 max-w-[140px]">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Primul pas */}
        <div className="bg-[#2E75B6] text-white rounded-lg p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">Primul pas concret</p>
          <p className="text-base font-semibold mb-1">{firstStep.actiune}</p>
          <p className="text-sm text-white/90">Deadline: <strong>{firstStep.deadline}</strong></p>
          <p className="text-sm text-white/90">Responsabil: <strong>{firstStep.responsabil}</strong></p>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-[color:var(--color-text-body)]/50 border-t border-[color:var(--color-border-subtle)] pt-4 mt-4">
        ACDA Consulting · Confidenţial · Prezentabil în 10 minute
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChapterHeader({ num, title }: { num: number; title: string }) {
  return (
    <div>
      <p className="text-xs text-[#2E75B6] font-bold uppercase tracking-widest">Capitolul {num}</p>
      <h2 className="text-2xl font-semibold text-[color:var(--color-text-primary)] mt-1">{title}</h2>
      <div className="w-10 h-0.5 bg-[#2E75B6] mt-1" />
    </div>
  )
}

function Chapter({
  num, title, text, highlight,
}: { num: number; title: string; text: string; highlight?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <ChapterHeader num={num} title={title} />
      {text.split('\n\n').map((p, i) => (
        <p key={i} className="text-[15px] leading-relaxed text-[color:var(--color-text-body)]">{p.trim()}</p>
      ))}
      {highlight}
    </section>
  )
}

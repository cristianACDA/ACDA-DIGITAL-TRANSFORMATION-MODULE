// C1-T1: Diagnostic 90 secunde. Pagină client-facing cu 3 întrebări vizuale.
// Citibilă în ≤90s, max 150 cuvinte total pe pagină.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectContext } from '../../context/ProjectContext'
import {
  calculateAreaScore,
  calculateGlobalScore,
  getMaturityLevel,
} from '../../utils/maturityCalculator'
import type { IndicatorCode } from '../../types/acda.types'
import { exportDiagnostic90sPDF } from '../../services/export/Diagnostic90sPDF'
import type { DiagnosticCardData } from '../../services/export/Diagnostic90sPDF'

type Semafor = 'rosu' | 'galben' | 'verde'

interface AreaDef {
  key: 'oameni' | 'tehnologie' | 'strategie'
  question: string
  codes: IndicatorCode[]
  explain: (score: number) => string
}

const AREAS: AreaDef[] = [
  {
    key: 'oameni',
    question: 'Investim corect în oameni?',
    codes: ['O1', 'O2', 'O3'],
    explain: (s) =>
      s >= 3.5
        ? 'Echipa e pregătită: raportul adopţie/tehnologie respectă pragul ACDA. Menţineţi ritmul de formare.'
        : s >= 2.5
          ? 'Investiţia în oameni e sub pragul 1:1. Creşteţi bugetul de adopţie pentru a debloca valoarea tehnologiei.'
          : 'Risc major de neadopţie: oamenii rămân în urma tehnologiei. Prioritizaţi un plan de change management.',
  },
  {
    key: 'tehnologie',
    question: 'Tehnologia noastră e pregătită?',
    codes: ['T1', 'T2', 'T3'],
    explain: (s) =>
      s >= 3.5
        ? 'Stack-ul suportă scalarea: date, API-uri şi assetizare peste prag. Focalizaţi pe optimizare.'
        : s >= 2.5
          ? 'Fundamentele există, dar lipsesc integrările şi product-ificarea datelor. Accelerarea cere o arhitectură mai matură.'
          : 'Tehnologia blochează transformarea: date fragmentate, puţine API-uri, assetizare redusă.',
  },
  {
    key: 'strategie',
    question: 'Ştim unde mergem?',
    codes: ['S1', 'S2', 'S3'],
    explain: (s) =>
      s >= 3.5
        ? 'Direcţia e clară: ţintă EBIT definită, capstone validat, guvernanţă AI activă.'
        : s >= 2.5
          ? 'Strategia există dar rămâne parţial demonstrată. Validaţi capstone-ul şi consolidaţi ţinta EBIT.'
          : 'Lipseşte un vector strategic măsurabil. Definiţi ţinta EBIT şi un capstone pilot.',
  },
]

function semaforFor(score: number): Semafor {
  if (score < 2.5) return 'rosu'
  if (score < 3.5) return 'galben'
  return 'verde'
}

const SEMAFOR_COLOR: Record<Semafor, { stroke: string; bg: string; text: string; chip: string }> = {
  rosu:   { stroke: '#C0392B', bg: 'bg-[color:rgba(245,158,11,0.08)]',    text: 'text-accent-warning',    chip: 'bg-accent-danger' },
  galben: { stroke: '#DAA520', bg: 'bg-[color:rgba(245,158,11,0.08)]',  text: 'text-accent-warning',  chip: 'bg-accent-warning' },
  verde:  { stroke: '#0E7A3C', bg: 'bg-[color:rgba(34,197,94,0.08)]',  text: 'text-accent-success',  chip: 'bg-accent-success' },
}

function GaugeArc({ score, color }: { score: number; color: string }) {
  // semicerc 0..5 → unghi 0..180
  const pct = Math.min(1, Math.max(0, score / 5))
  const angle = Math.PI * pct
  const r = 70
  const cx = 90
  const cy = 90
  // start stânga (180°), sweep clockwise cu `pct*180`
  const endX = cx - r * Math.cos(angle)
  const endY = cy - r * Math.sin(angle)
  const largeArc = pct > 0.5 ? 1 : 0
  return (
    <svg viewBox="0 0 180 110" className="w-full h-auto" aria-hidden="true">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#E6E6E6" strokeWidth="14" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
        fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="32" fontWeight="800" fill={color}>
        {score.toFixed(1)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill="#0A2540" opacity="0.5">/ 5.0</text>
    </svg>
  )
}

export default function Diagnostic90s() {
  const { maturityIndicators, client, activeProjectId } = useProjectContext()
  const [exporting, setExporting] = useState(false)

  const { cards, globalScore } = useMemo(() => {
    const scoreByCode = new Map<string, number>()
    for (const ind of maturityIndicators) {
      if (typeof ind.score === 'number') scoreByCode.set(ind.indicator_code, ind.score)
    }
    const areaScores: Record<'oameni' | 'tehnologie' | 'strategie', number> = {
      oameni: 0, tehnologie: 0, strategie: 0,
    }
    const cards: DiagnosticCardData[] = AREAS.map((area) => {
      const scores = area.codes
        .map((c) => scoreByCode.get(c))
        .filter((v): v is number => typeof v === 'number')
      const score = calculateAreaScore(scores)
      areaScores[area.key] = score
      const semafor = semaforFor(score)
      return {
        question: area.question,
        score,
        level: getMaturityLevel(score),
        semafor,
        explanation: area.explain(score),
      }
    })
    const globalScore = calculateGlobalScore(areaScores)
    return { cards, globalScore }
  }, [maturityIndicators])

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportDiagnostic90sPDF({
        clientName: client?.company_name ?? 'Client',
        globalScore,
        cards,
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
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[color:var(--color-text-primary)]/70 uppercase tracking-widest font-semibold">Diagnostic 90 secunde</p>
          <h1 className="text-2xl font-semibold text-[color:var(--color-text-primary)] mt-1">{client?.company_name ?? '—'}</h1>
          <p className="text-sm text-[color:var(--color-text-body)]/60 mt-0.5">
            {today} · Scor global ACDA <strong className="tabular-nums">{globalScore.toFixed(2)}</strong> / 5.00
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors inline-flex items-center gap-2 ${
            exporting
              ? 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)] text-[color:var(--color-text-body)]/40 cursor-not-allowed'
              : 'border-[color:var(--color-text-primary)] bg-[color:var(--color-text-primary)] text-white hover:bg-[color:var(--color-text-body)]'
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

      {/* 3 carduri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((c) => {
          const cfg = SEMAFOR_COLOR[c.semafor]
          return (
            <section
              key={c.question}
              className={`rounded-lg border border-[color:var(--color-border-subtle)] ${cfg.bg} shadow-sm overflow-hidden flex flex-col`}
            >
              <div className={`h-1.5 ${cfg.chip}`} />
              <div className="p-5 flex flex-col gap-3 flex-1">
                <h2 className="text-base font-bold text-[color:var(--color-text-primary)] leading-snug">{c.question}</h2>
                <div className="flex-shrink-0">
                  <GaugeArc score={c.score} color={cfg.stroke} />
                </div>
                <div className="flex items-center justify-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded text-white ${cfg.chip}`}>
                    {c.level}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${cfg.text}`}>{c.explanation}</p>
              </div>
            </section>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[color:var(--color-text-body)]/50 border-t border-[color:var(--color-border-subtle)] pt-4">
        Raport generat de <strong>ACDA Consulting</strong> · Confidenţial
      </div>
    </div>
  )
}

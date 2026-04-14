// P6-T1: Export PDF raport 15 secțiuni.
// Generare client-side cu jsPDF + jspdf-autotable. Grafice randate pe
// <canvas> → dataURL PNG → embed în PDF. Zero cereri externe.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerRoboto } from './fonts/registerRoboto'
import type {
  Client,
  Project,
  EBITBaseline,
  MaturityIndicator,
} from '../../types/acda.types'
import type { NarrativeEntry } from '../../layouts/CockpitLayout'
import type { CockpitFieldEntry } from '../../layouts/CockpitLayout'
import { renderRadarChart, renderWaterfallChart } from '../../components/charts/pdfCharts'

const ACDA_BLUE: [number, number, number] = [27, 58, 92]   // #1B3A5C
const ACDA_ACCENT: [number, number, number] = [46, 117, 182] // #2E75B6
const TEXT_DARK: [number, number, number] = [10, 37, 64]

export interface PDFExportInput {
  client: Client | null
  project: Project | null
  ebitBaseline: EBITBaseline | null
  maturityIndicators: MaturityIndicator[]
  narratives: Record<number, NarrativeEntry>
  fieldsByPage: Record<number, Record<string, CockpitFieldEntry>>
  statuses: Record<number, string>
}

interface SectionDef {
  cod: string
  titlu: string
  sourcePage: number
  build: (doc: jsPDF, ctx: BuildCtx) => void
}

interface BuildCtx {
  input: PDFExportInput
  marginX: number
  contentW: number
  clientName: string
  globalScore: number
  // mutabil: y curent pe pagina activă
  y: number
  pageH: number
  newPageIfNeeded: (needed: number) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number | undefined | null, suffix = '') =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) + suffix

function addHeader(doc: jsPDF, clientName: string) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...ACDA_BLUE)
  doc.rect(0, 0, pageW, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.text('ACDA', 12, 9)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  const title = `Raport Transformare Digitală · ${clientName}`
  doc.text(title, pageW - 12, 9, { align: 'right' })
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(220)
  doc.line(12, pageH - 14, pageW - 12, pageH - 14)
  doc.setTextColor(120)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.text('ACDA Consulting · Confidenţial', 12, pageH - 7)
  doc.text(`Pagina ${pageNum} din ${totalPages}`, pageW - 12, pageH - 7, { align: 'right' })
}

function addSectionHeading(doc: jsPDF, ctx: BuildCtx, cod: string, titlu: string) {
  ctx.newPageIfNeeded(18)
  doc.setTextColor(...ACDA_BLUE)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.text(`${cod} · ${titlu}`, ctx.marginX, ctx.y)
  doc.setDrawColor(...ACDA_ACCENT)
  doc.setLineWidth(0.6)
  doc.line(ctx.marginX, ctx.y + 1.5, ctx.marginX + 40, ctx.y + 1.5)
  ctx.y += 8
  doc.setTextColor(...TEXT_DARK)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
}

function addParagraph(doc: jsPDF, ctx: BuildCtx, text: string) {
  const lines = doc.splitTextToSize(text, ctx.contentW) as string[]
  const lh = 4.8
  for (const line of lines) {
    ctx.newPageIfNeeded(lh + 2)
    doc.text(line, ctx.marginX, ctx.y)
    ctx.y += lh
  }
  ctx.y += 2
}

function addNarrative(doc: jsPDF, ctx: BuildCtx, pageNum: number) {
  const n = ctx.input.narratives[pageNum]
  if (!n?.text) return
  doc.setFont('Roboto', 'italic')
  doc.setTextColor(60)
  addParagraph(doc, ctx, n.text)
  doc.setFont('Roboto', 'normal')
  doc.setTextColor(...TEXT_DARK)
}

function addKV(doc: jsPDF, ctx: BuildCtx, rows: [string, string][]) {
  autoTable(doc, {
    startY: ctx.y,
    margin: { left: ctx.marginX, right: ctx.marginX },
    styles: { font: 'Roboto', fontSize: 9, cellPadding: 2, textColor: TEXT_DARK },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: ACDA_BLUE }, 1: { cellWidth: 'auto' } },
    theme: 'plain',
    body: rows,
  })
  // @ts-expect-error - lastAutoTable injectat de plugin
  ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
}

function embedImage(doc: jsPDF, ctx: BuildCtx, dataUrl: string, wMm: number, hMm: number) {
  ctx.newPageIfNeeded(hMm + 4)
  const x = ctx.marginX + (ctx.contentW - wMm) / 2
  doc.addImage(dataUrl, 'PNG', x, ctx.y, wMm, hMm)
  ctx.y += hMm + 4
}

// ─── Scoruri derivate ────────────────────────────────────────────────────────

function computeGlobalScore(inds: MaturityIndicator[]): number {
  if (!inds.length) return 0
  const valid = inds.filter((i) => typeof i.score === 'number')
  if (!valid.length) return 0
  const sum = valid.reduce((s, i) => s + (i.score ?? 0), 0)
  return Math.round((sum / valid.length) * 20) / 10  // score medie 0..5 → 0..10
}

// ─── Secţiuni ────────────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  {
    cod: 'S01',
    titlu: 'Executive Summary',
    sourcePage: 11,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S01', 'Executive Summary')
      const { client, ebitBaseline } = ctx.input
      addParagraph(doc, ctx,
        `Prezentul raport consolidează rezultatele evaluării de transformare digitală pentru ${ctx.clientName}. ` +
        `Scorul global de maturitate ACDA este ${ctx.globalScore.toFixed(1)}/10, ` +
        `iar ţinta EBIT stabilită ${fmt(ebitBaseline?.ebit_target, ' RON')} faţă de ${fmt(ebitBaseline?.ebit_current, ' RON')} baseline.`,
      )
      addKV(doc, ctx, [
        ['Client',       client?.company_name ?? '—'],
        ['Industrie',    client?.industry ?? '—'],
        ['CUI',          client?.cui ?? '—'],
        ['Scor global',  `${ctx.globalScore.toFixed(1)} / 10`],
        ['Data raport',  new Date().toLocaleDateString('ro-RO')],
      ])
    },
  },
  {
    cod: 'S02',
    titlu: 'Business Context',
    sourcePage: 1,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S02', 'Business Context')
      const { client } = ctx.input
      addNarrative(doc, ctx, 1)
      addKV(doc, ctx, [
        ['Companie',        client?.company_name ?? '—'],
        ['Industrie',       client?.industry ?? '—'],
        ['Ţară',            client?.country ?? '—'],
        ['Mărime',          client?.company_size ?? '—'],
        ['Nr. angajaţi',    client?.employee_count != null ? String(client.employee_count) : '—'],
        ['Cifra afaceri',   fmt(client?.annual_revenue, ' RON')],
        ['Contact',         [client?.main_contact_name, client?.main_contact_role].filter(Boolean).join(' · ') || '—'],
      ])
    },
  },
  {
    cod: 'S03',
    titlu: 'EBIT Baseline & Target',
    sourcePage: 2,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S03', 'EBIT Baseline & Target')
      const e = ctx.input.ebitBaseline
      addNarrative(doc, ctx, 2)
      const delta = (e?.ebit_target ?? 0) - (e?.ebit_current ?? 0)
      addKV(doc, ctx, [
        ['Cifra afaceri anuală', fmt(e?.annual_revenue, ' RON')],
        ['Costuri operaţionale', fmt(e?.operational_costs, ' RON')],
        ['EBIT curent',           fmt(e?.ebit_current, ' RON')],
        ['Marjă EBIT curent',     fmt(e?.ebit_margin_current, '%')],
        ['EBIT ţintă',            fmt(e?.ebit_target, ' RON')],
        ['Delta absolut',         fmt(delta, ' RON')],
        ['IT spend',              fmt(e?.it_spend_current, ' RON')],
        ['Change mgmt spend',     fmt(e?.change_management_spend_current, ' RON')],
        ['Raport 1:1',            fmt(e?.rule_1_to_1_ratio)],
      ])
    },
  },
  {
    cod: 'S04',
    titlu: 'Value Stream Analysis',
    sourcePage: 4,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S04', 'Value Stream Analysis')
      addNarrative(doc, ctx, 4)
      const fields = ctx.input.fieldsByPage[4] ?? {}
      const rows = Object.values(fields).map((f) => [f.label, f.original_value || '—'])
      if (rows.length) {
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: ctx.marginX, right: ctx.marginX },
          head: [['Câmp', 'Valoare']],
          body: rows,
          styles: { font: 'Roboto', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: ACDA_BLUE, textColor: 255 },
        })
        // @ts-expect-error autoTable plugin
        ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
      } else {
        addParagraph(doc, ctx, 'Fără date înregistrate pentru value streams.')
      }
    },
  },
  {
    cod: 'S05',
    titlu: 'Process Evaluation',
    sourcePage: 4,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S05', 'Process Evaluation')
      addParagraph(doc, ctx, 'Analiza gradului de blocare pe procesele evaluate — derivat din pagina Value Stream.')
      const fields = ctx.input.fieldsByPage[4] ?? {}
      const count = Object.keys(fields).length
      addKV(doc, ctx, [
        ['Câmpuri capturate', String(count)],
        ['Status pagină 4',    String(ctx.input.statuses[4] ?? '—')],
      ])
    },
  },
  {
    cod: 'S06',
    titlu: 'Technology Landscape',
    sourcePage: 6,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S06', 'Technology Landscape')
      addNarrative(doc, ctx, 6)
      const fields = ctx.input.fieldsByPage[6] ?? {}
      const rows = Object.values(fields).map((f) => [f.label, f.original_value || '—'])
      if (rows.length) {
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: ctx.marginX, right: ctx.marginX },
          head: [['Componentă', 'Valoare']],
          body: rows,
          styles: { font: 'Roboto', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: ACDA_BLUE, textColor: 255 },
        })
        // @ts-expect-error autoTable plugin
        ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
      } else {
        addParagraph(doc, ctx, 'Landscape tehnologic în curs de evaluare.')
      }
    },
  },
  {
    cod: 'S07',
    titlu: 'ACDA Maturity Score',
    sourcePage: 3,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S07', 'ACDA Maturity Score')
      addNarrative(doc, ctx, 3)
      const inds = ctx.input.maturityIndicators
      addParagraph(doc, ctx,
        `Scor global: ${ctx.globalScore.toFixed(1)}/10 · ${inds.length}/9 indicatori înregistraţi.`,
      )

      // Radar chart
      const radarData = inds.map((i) => ({
        label: i.indicator_name || i.indicator_code,
        score: i.score ?? 0,
      }))
      if (radarData.length >= 3) {
        const dataUrl = renderRadarChart(radarData)
        embedImage(doc, ctx, dataUrl, 120, 120)
      }

      // Tabel indicatori
      if (inds.length) {
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: ctx.marginX, right: ctx.marginX },
          head: [['Cod', 'Indicator', 'Arie', 'Scor', 'Conf.']],
          body: inds.map((i) => [
            i.indicator_code,
            i.indicator_name ?? '—',
            i.area ?? '—',
            i.score != null ? i.score.toFixed(1) : '—',
            i.confidence_level ?? '—',
          ]),
          styles: { font: 'Roboto', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: ACDA_BLUE, textColor: 255 },
        })
        // @ts-expect-error autoTable plugin
        ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
      }
    },
  },
  {
    cod: 'S08',
    titlu: 'Problem Analysis',
    sourcePage: 5,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S08', 'Problem Analysis')
      addNarrative(doc, ctx, 5)
      const fields = ctx.input.fieldsByPage[5] ?? {}
      const rows = Object.values(fields).map((f) => [f.label, f.original_value || '—'])
      if (rows.length) {
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: ctx.marginX, right: ctx.marginX },
          head: [['Problemă', 'Descriere']],
          body: rows,
          styles: { font: 'Roboto', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: ACDA_BLUE, textColor: 255 },
        })
        // @ts-expect-error autoTable plugin
        ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
      }
    },
  },
  {
    cod: 'S09',
    titlu: 'Opportunity Map',
    sourcePage: 7,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S09', 'Opportunity Map')
      addNarrative(doc, ctx, 7)
      const fields = ctx.input.fieldsByPage[7] ?? {}
      const rows = Object.values(fields).map((f) => [f.label, f.original_value || '—'])
      if (rows.length) {
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: ctx.marginX, right: ctx.marginX },
          head: [['Oportunitate', 'Detaliu']],
          body: rows,
          styles: { font: 'Roboto', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: ACDA_BLUE, textColor: 255 },
        })
        // @ts-expect-error autoTable plugin
        ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
      }
    },
  },
  {
    cod: 'S10',
    titlu: 'Prioritized Initiatives',
    sourcePage: 8,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S10', 'Prioritized Initiatives')
      addNarrative(doc, ctx, 8)
      const fields = ctx.input.fieldsByPage[8] ?? {}
      const rows = Object.values(fields).map((f) => [f.label, f.original_value || '—'])
      if (rows.length) {
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: ctx.marginX, right: ctx.marginX },
          head: [['Iniţiativă', 'Valoare']],
          body: rows,
          styles: { font: 'Roboto', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: ACDA_BLUE, textColor: 255 },
        })
        // @ts-expect-error autoTable plugin
        ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
      }
    },
  },
  {
    cod: 'S11',
    titlu: 'Transformation Strategy',
    sourcePage: 9,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S11', 'Transformation Strategy')
      addNarrative(doc, ctx, 9)
      const fields = ctx.input.fieldsByPage[9] ?? {}
      for (const f of Object.values(fields)) {
        doc.setFont('Roboto', 'bold'); doc.setTextColor(...ACDA_BLUE)
        ctx.newPageIfNeeded(6)
        doc.text(f.label, ctx.marginX, ctx.y); ctx.y += 4.5
        doc.setFont('Roboto', 'normal'); doc.setTextColor(...TEXT_DARK)
        addParagraph(doc, ctx, f.original_value || '—')
      }
    },
  },
  {
    cod: 'S12',
    titlu: 'Implementation Roadmap',
    sourcePage: 10,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S12', 'Implementation Roadmap')
      addNarrative(doc, ctx, 10)
      const fields = ctx.input.fieldsByPage[10] ?? {}
      const rows = Object.values(fields).map((f) => [f.label, f.original_value || '—'])
      if (rows.length) {
        autoTable(doc, {
          startY: ctx.y,
          margin: { left: ctx.marginX, right: ctx.marginX },
          head: [['Fază / Element', 'Valoare']],
          body: rows,
          styles: { font: 'Roboto', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: ACDA_BLUE, textColor: 255 },
        })
        // @ts-expect-error autoTable plugin
        ctx.y = (doc.lastAutoTable?.finalY ?? ctx.y) + 4
      } else {
        addParagraph(doc, ctx, 'Roadmap cu 4 faze — a se completa pagina 10 din cockpit.')
      }
    },
  },
  {
    cod: 'S13',
    titlu: 'Financial Impact Model',
    sourcePage: 2,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S13', 'Financial Impact Model')
      const e = ctx.input.ebitBaseline
      const base = e?.ebit_current ?? 0
      const target = e?.ebit_target ?? 0
      const delta = target - base
      // Distribuim delta pe 3 pseudo-buckets (procese/tehnologie/oameni) —
      // aproximare până când iniţiativele sunt modelate granular.
      const b1 = Math.round(delta * 0.45)
      const b2 = Math.round(delta * 0.35)
      const b3 = delta - b1 - b2
      const bars: { label: string; value: number; kind: 'base' | 'delta' | 'total' }[] = [
        { label: 'EBIT curent', value: base, kind: 'base' },
        { label: 'Procese',      value: b1,   kind: 'delta' },
        { label: 'Tehnologie',   value: b2,   kind: 'delta' },
        { label: 'Oameni & gov.', value: b3,   kind: 'delta' },
        { label: 'EBIT ţintă',   value: target, kind: 'total' },
      ]
      const dataUrl = renderWaterfallChart(bars)
      embedImage(doc, ctx, dataUrl, 160, 88)
      addParagraph(doc, ctx,
        `Model de impact: pornind de la ${fmt(base, ' RON')} EBIT curent, contribuţiile distribuite pe procese, ` +
        `tehnologie şi capital uman conduc spre ţinta ${fmt(target, ' RON')} (delta ${fmt(delta, ' RON')}).`,
      )
    },
  },
  {
    cod: 'S14',
    titlu: 'Governance Model',
    sourcePage: 10,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S14', 'Governance Model')
      const r = ctx.input.ebitBaseline?.rule_1_to_1_ratio
      addParagraph(doc, ctx,
        `Regula 1:1 ACDA impune paritate între investiţia IT şi investiţia în change management ` +
        `pe fiecare fază a transformării. Raport curent: ${fmt(r)}.`,
      )
      addKV(doc, ctx, [
        ['IT spend',            fmt(ctx.input.ebitBaseline?.it_spend_current, ' RON')],
        ['Change mgmt spend',   fmt(ctx.input.ebitBaseline?.change_management_spend_current, ' RON')],
        ['Raport 1:1 curent',   fmt(r)],
        ['Ţintă',                '1.00 (paritate)'],
      ])
    },
  },
  {
    cod: 'S15',
    titlu: 'Capstone Framework',
    sourcePage: 11,
    build: (doc, ctx) => {
      addSectionHeading(doc, ctx, 'S15', 'Capstone Framework')
      const e = ctx.input.ebitBaseline
      const delta = (e?.ebit_target ?? 0) - (e?.ebit_current ?? 0)
      const pilotCost = Math.round(Math.max(1, delta) * 0.1)
      addParagraph(doc, ctx,
        `Capstone-ul propus este un pilot de 12 săptămâni focalizat pe top 1 oportunitate prioritizată, ` +
        `cu cost estimat ${fmt(pilotCost, ' RON')} şi ROI-ţintă prin captarea a ~10% din delta EBIT pe orizont de 12 luni.`,
      )
      addKV(doc, ctx, [
        ['Delta EBIT ţintit',     fmt(delta, ' RON')],
        ['Cost pilot (est.)',     fmt(pilotCost, ' RON')],
        ['Durată pilot',          '12 săptămâni'],
        ['Scor global pre-pilot', `${ctx.globalScore.toFixed(1)} / 10`],
      ])
      addNarrative(doc, ctx, 11)
    },
  },
]

// ─── Cover page ──────────────────────────────────────────────────────────────

function drawCover(doc: jsPDF, clientName: string, globalScore: number) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  doc.setFillColor(...ACDA_BLUE)
  doc.rect(0, 0, pageW, pageH, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(48)
  doc.text('ACDA', pageW / 2, 60, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('Roboto', 'normal')
  doc.text('Consulting Group', pageW / 2, 70, { align: 'center' })

  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.4)
  doc.line(pageW / 2 - 30, 80, pageW / 2 + 30, 80)

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(24)
  doc.text('Raport Transformare Digitală', pageW / 2, 110, { align: 'center' })

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(14)
  doc.text(clientName, pageW / 2, 125, { align: 'center' })

  // Scor global — placard
  doc.setFillColor(...ACDA_ACCENT)
  doc.roundedRect(pageW / 2 - 40, 155, 80, 50, 4, 4, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.text('SCOR GLOBAL', pageW / 2, 166, { align: 'center' })
  doc.setFontSize(40)
  doc.text(`${globalScore.toFixed(1)}`, pageW / 2, 188, { align: 'center' })
  doc.setFontSize(10)
  doc.text('/ 10', pageW / 2, 200, { align: 'center' })

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(11)
  doc.text(new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }),
    pageW / 2, pageH - 30, { align: 'center' })
  doc.setFontSize(9)
  doc.text('Confidenţial · Document destinat exclusiv clientului', pageW / 2, pageH - 22, { align: 'center' })
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class PDFExportService {
  static async generate(input: PDFExportInput): Promise<Blob> {
    const clientName = input.client?.company_name ?? 'Client'
    const globalScore = computeGlobalScore(input.maturityIndicators)

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    registerRoboto(doc)
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const marginX = 14

    // Cover
    drawCover(doc, clientName, globalScore)

    // Build context pentru secţiuni
    const ctx: BuildCtx = {
      input,
      marginX,
      contentW: pageW - marginX * 2,
      clientName,
      globalScore,
      y: 22,
      pageH,
      newPageIfNeeded: (needed: number) => {
        if (ctx.y + needed > pageH - 18) {
          doc.addPage()
          ctx.y = 22
        }
      },
    }

    // Prima pagină conţinut după cover
    doc.addPage()
    ctx.y = 22

    for (const section of SECTIONS) {
      ctx.newPageIfNeeded(30)
      section.build(doc, ctx)
      ctx.y += 4
    }

    // Header + footer pe toate paginile (exceptând cover-ul de pe pagina 1)
    const total = doc.getNumberOfPages()
    for (let p = 2; p <= total; p++) {
      doc.setPage(p)
      addHeader(doc, clientName)
      addFooter(doc, p - 1, total - 1)
    }

    return doc.output('blob')
  }

  static async download(input: PDFExportInput): Promise<void> {
    const blob = await PDFExportService.generate(input)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const clientSlug = (input.client?.company_name ?? 'client')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const dateStr = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `acda-raport-${clientSlug}-${dateStr}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

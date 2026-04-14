// C2-T1: Export PDF multi-page pentru Strategia 10 minute.
// A4 portrait, un capitol per pagină + cover (5 pagini total). Reutilizează jsPDF.

import jsPDF from 'jspdf'
import { registerRoboto } from './fonts/registerRoboto'

const ACDA_BLUE: [number, number, number] = [27, 58, 92]
const ACDA_ACCENT: [number, number, number] = [46, 117, 182]
const TEXT: [number, number, number] = [10, 37, 64]

export interface Milestone {
  label: string
  when: string
}

export interface FirstStep {
  actiune: string
  deadline: string
  responsabil: string
}

export interface StrategyPillarOut {
  titlu: string
  impact: string
  efort: string
  narativ: string
}

export interface Strategy10minPDFInput {
  clientName: string
  globalScore: number
  level: string
  capitol1: string
  capitol2: string
  capitol3Intro: string
  pillars: StrategyPillarOut[]
  capitol4Intro: string
  milestones: Milestone[]
  firstStep: FirstStep
}

function addHeader(doc: jsPDF, clientName: string) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...ACDA_BLUE)
  doc.rect(0, 0, pageW, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('Roboto', 'bold'); doc.setFontSize(10)
  doc.text('ACDA', 14, 9)
  doc.setFont('Roboto', 'normal'); doc.setFontSize(9)
  doc.text(`Strategie de Transformare · ${clientName}`, pageW - 14, 9, { align: 'right' })
}

function addFooter(doc: jsPDF, page: number, total: number) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(220); doc.line(14, pageH - 14, pageW - 14, pageH - 14)
  doc.setTextColor(120); doc.setFont('Roboto', 'normal'); doc.setFontSize(8)
  doc.text('ACDA Consulting · Confidenţial · Prezentabil în 10 minute', 14, pageH - 7)
  doc.text(`${page} / ${total}`, pageW - 14, pageH - 7, { align: 'right' })
}

function writeChapterTitle(doc: jsPDF, num: number, title: string, y: number): number {
  doc.setTextColor(...ACDA_ACCENT)
  doc.setFont('Roboto', 'bold'); doc.setFontSize(10)
  doc.text(`CAPITOLUL ${num}`, 14, y)
  doc.setTextColor(...ACDA_BLUE); doc.setFontSize(22)
  doc.text(title, 14, y + 9)
  doc.setDrawColor(...ACDA_ACCENT); doc.setLineWidth(0.8)
  doc.line(14, y + 12, 44, y + 12)
  return y + 22
}

function writeParagraphs(doc: jsPDF, text: string, y: number, maxY: number): number {
  doc.setTextColor(...TEXT); doc.setFont('Roboto', 'normal'); doc.setFontSize(11)
  const pageW = doc.internal.pageSize.getWidth()
  const contentW = pageW - 28
  const paragraphs = text.split('\n\n')
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p.trim(), contentW) as string[]
    for (const line of lines) {
      if (y > maxY) return y
      doc.text(line, 14, y); y += 6
    }
    y += 3
  }
  return y
}

function drawTimeline(doc: jsPDF, milestones: Milestone[], y: number) {
  const pageW = doc.internal.pageSize.getWidth()
  const left = 20; const right = pageW - 20
  const axisY = y + 10
  doc.setDrawColor(...ACDA_ACCENT); doc.setLineWidth(1.2)
  doc.line(left, axisY, right, axisY)
  const n = milestones.length
  for (let i = 0; i < n; i++) {
    const x = left + ((right - left) * i) / Math.max(1, n - 1)
    doc.setFillColor(...ACDA_BLUE)
    doc.circle(x, axisY, 2.5, 'F')
    doc.setTextColor(...ACDA_BLUE); doc.setFont('Roboto', 'bold'); doc.setFontSize(9)
    doc.text(milestones[i].when, x, axisY - 5, { align: 'center' })
    doc.setTextColor(...TEXT); doc.setFont('Roboto', 'normal'); doc.setFontSize(9)
    const label = doc.splitTextToSize(milestones[i].label, 40) as string[]
    let ly = axisY + 8
    for (const line of label) { doc.text(line, x, ly, { align: 'center' }); ly += 4 }
  }
}

export async function exportStrategy10minPDF(input: Strategy10minPDFInput): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  registerRoboto(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const bottomY = pageH - 20

  // Cover
  doc.setFillColor(...ACDA_BLUE); doc.rect(0, 0, pageW, pageH, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('Roboto', 'bold'); doc.setFontSize(44)
  doc.text('ACDA', pageW / 2, 70, { align: 'center' })
  doc.setFont('Roboto', 'normal'); doc.setFontSize(11)
  doc.text('Consulting Group', pageW / 2, 78, { align: 'center' })
  doc.setFont('Roboto', 'bold'); doc.setFontSize(22)
  doc.text('Strategie de', pageW / 2, 120, { align: 'center' })
  doc.text('Transformare Digitală', pageW / 2, 130, { align: 'center' })
  doc.setFont('Roboto', 'normal'); doc.setFontSize(14)
  doc.text(input.clientName, pageW / 2, 150, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Scor curent ${input.globalScore.toFixed(2)} / 5.00 · ${input.level}`, pageW / 2, 162, { align: 'center' })
  doc.setFontSize(11)
  doc.text(new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }),
    pageW / 2, pageH - 25, { align: 'center' })
  doc.setFontSize(9)
  doc.text('Prezentabil în 10 minute · Confidenţial', pageW / 2, pageH - 18, { align: 'center' })

  // Capitolul 1
  doc.addPage(); addHeader(doc, input.clientName)
  let y = writeChapterTitle(doc, 1, 'Unde suntem', 28)
  writeParagraphs(doc, input.capitol1, y, bottomY)

  // Capitolul 2
  doc.addPage(); addHeader(doc, input.clientName)
  y = writeChapterTitle(doc, 2, 'Costul inacţiunii', 28)
  writeParagraphs(doc, input.capitol2, y, bottomY)

  // Capitolul 3
  doc.addPage(); addHeader(doc, input.clientName)
  y = writeChapterTitle(doc, 3, 'Ce propunem', 28)
  y = writeParagraphs(doc, input.capitol3Intro, y, bottomY)
  for (const pilar of input.pillars) {
    if (y > bottomY - 30) break
    doc.setDrawColor(220); doc.setFillColor(246, 249, 252)
    doc.roundedRect(14, y, pageW - 28, 26, 2, 2, 'FD')
    doc.setTextColor(...ACDA_BLUE); doc.setFont('Roboto', 'bold'); doc.setFontSize(12)
    doc.text(pilar.titlu, 18, y + 7)
    doc.setTextColor(...TEXT); doc.setFont('Roboto', 'normal'); doc.setFontSize(9)
    doc.text(`Impact: ${pilar.impact}   ·   Efort: ${pilar.efort}`, 18, y + 13)
    const narr = doc.splitTextToSize(pilar.narativ, pageW - 36) as string[]
    let ny = y + 19
    for (const line of narr.slice(0, 2)) { doc.text(line, 18, ny); ny += 4.5 }
    y += 30
  }

  // Capitolul 4
  doc.addPage(); addHeader(doc, input.clientName)
  y = writeChapterTitle(doc, 4, 'Cum ajungem', 28)
  y = writeParagraphs(doc, input.capitol4Intro, y, bottomY)
  drawTimeline(doc, input.milestones, y + 4)
  y += 38
  // First step block
  doc.setFillColor(...ACDA_ACCENT)
  doc.roundedRect(14, y, pageW - 28, 32, 3, 3, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('Roboto', 'bold'); doc.setFontSize(11)
  doc.text('PRIMUL PAS CONCRET', 18, y + 7)
  doc.setFont('Roboto', 'normal'); doc.setFontSize(10)
  doc.text(`Acţiune: ${input.firstStep.actiune}`, 18, y + 15)
  doc.text(`Deadline: ${input.firstStep.deadline}`, 18, y + 21)
  doc.text(`Responsabil: ${input.firstStep.responsabil}`, 18, y + 27)

  // Footer + numerotare
  const total = doc.getNumberOfPages()
  for (let p = 2; p <= total; p++) {
    doc.setPage(p)
    addFooter(doc, p - 1, total - 1)
  }

  const slug = input.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `acda-strategie-10min-${slug || 'client'}-${date}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

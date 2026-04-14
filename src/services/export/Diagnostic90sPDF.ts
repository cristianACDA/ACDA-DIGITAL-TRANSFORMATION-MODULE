// C1-T1: Export PDF single-page landscape pentru Diagnostic 90 secunde.
// Reutilizează jsPDF (deja instalat în P6-T1). Un singur A4 landscape cu
// 3 carduri, header + footer ACDA.

import jsPDF from 'jspdf'
import { registerRoboto } from './fonts/registerRoboto'

const ACDA_BLUE: [number, number, number] = [27, 58, 92]
const TEXT: [number, number, number] = [10, 37, 64]

const SEMAFOR_FILL: Record<'rosu' | 'galben' | 'verde', [number, number, number]> = {
  rosu:   [192, 57, 43],
  galben: [218, 165, 32],
  verde:  [14, 122, 60],
}

export interface DiagnosticCardData {
  question: string
  score: number             // 0..5
  level: string             // NECONFORM / IN_PROGRES / CONFORM / LIDER
  semafor: 'rosu' | 'galben' | 'verde'
  explanation: string       // 2 fraze
}

export interface Diagnostic90sPDFInput {
  clientName: string
  globalScore: number
  cards: DiagnosticCardData[]
}

function drawHeader(doc: jsPDF, clientName: string) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...ACDA_BLUE)
  doc.rect(0, 0, pageW, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('Roboto', 'bold'); doc.setFontSize(11)
  doc.text('ACDA', 12, 10)
  doc.setFont('Roboto', 'normal'); doc.setFontSize(10)
  doc.text(`Diagnostic 90 secunde · ${clientName}`, pageW - 12, 10, { align: 'right' })
}

function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(220); doc.line(12, pageH - 12, pageW - 12, pageH - 12)
  doc.setTextColor(120); doc.setFont('Roboto', 'normal'); doc.setFontSize(8)
  doc.text('Raport generat de ACDA Consulting · Confidenţial', 12, pageH - 6)
  doc.text(new Date().toLocaleDateString('ro-RO'), pageW - 12, pageH - 6, { align: 'right' })
}

function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, card: DiagnosticCardData) {
  // border + background
  doc.setDrawColor(220); doc.setLineWidth(0.3)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, h, 3, 3, 'FD')

  // bandă colorată sus
  const [r, g, b] = SEMAFOR_FILL[card.semafor]
  doc.setFillColor(r, g, b)
  doc.roundedRect(x, y, w, 5, 3, 3, 'F')
  doc.rect(x, y + 2.5, w, 2.5, 'F')

  // întrebare
  doc.setTextColor(...ACDA_BLUE)
  doc.setFont('Roboto', 'bold'); doc.setFontSize(13)
  const qLines = doc.splitTextToSize(card.question, w - 10) as string[]
  let cy = y + 13
  for (const line of qLines) { doc.text(line, x + 5, cy); cy += 5.5 }

  // scor mare
  doc.setTextColor(r, g, b)
  doc.setFont('Roboto', 'bold'); doc.setFontSize(42)
  doc.text(card.score.toFixed(1), x + w / 2, cy + 22, { align: 'center' })
  doc.setTextColor(...TEXT); doc.setFontSize(10); doc.setFont('Roboto', 'normal')
  doc.text('/ 5.0', x + w / 2, cy + 30, { align: 'center' })

  // nivel
  doc.setFillColor(r, g, b)
  const lvlW = 40
  doc.roundedRect(x + (w - lvlW) / 2, cy + 36, lvlW, 7, 2, 2, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('Roboto', 'bold'); doc.setFontSize(9)
  doc.text(card.level, x + w / 2, cy + 41, { align: 'center' })

  // explicaţie
  doc.setTextColor(...TEXT); doc.setFont('Roboto', 'normal'); doc.setFontSize(9)
  const expLines = doc.splitTextToSize(card.explanation, w - 10) as string[]
  let ey = cy + 52
  for (const line of expLines) { doc.text(line, x + 5, ey); ey += 4.2 }
}

export async function exportDiagnostic90sPDF(input: Diagnostic90sPDFInput): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  registerRoboto(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  drawHeader(doc, input.clientName)

  // Titlu secundar + scor global
  doc.setTextColor(...TEXT)
  doc.setFont('Roboto', 'bold'); doc.setFontSize(16)
  doc.text('Unde se află compania astăzi?', 12, 30)
  doc.setFont('Roboto', 'normal'); doc.setFontSize(10)
  doc.text(`Scor global ACDA: ${input.globalScore.toFixed(2)} / 5.00`, 12, 37)

  // 3 carduri aliniate
  const margin = 12
  const gap = 6
  const cardW = (pageW - margin * 2 - gap * 2) / 3
  const cardH = pageH - 55 - 20
  const cardY = 45
  for (let i = 0; i < input.cards.length; i++) {
    drawCard(doc, margin + i * (cardW + gap), cardY, cardW, cardH, input.cards[i])
  }

  drawFooter(doc)

  const slug = input.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `acda-diagnostic-90s-${slug || 'client'}-${date}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

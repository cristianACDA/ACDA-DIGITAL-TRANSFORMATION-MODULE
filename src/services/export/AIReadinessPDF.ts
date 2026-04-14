// C3-T1: Export PDF pentru AI Readiness — tabel use case-uri cu 4 criterii.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ACDA_BLUE: [number, number, number] = [27, 58, 92]
const TEXT: [number, number, number] = [10, 37, 64]

const STATUS_COLOR: Record<'ready' | 'needs' | 'not', [number, number, number]> = {
  ready: [14, 122, 60],
  needs: [218, 165, 32],
  not:   [192, 57, 43],
}

export interface AIReadinessUseCase {
  titlu: string
  global: number
  status: 'ready' | 'needs' | 'not'
  statusLabel: string
  criterii: {
    date: number
    infra: number
    skills: number
    reg: number
  }
  actiuni: string[]
}

export interface AdoptionStep {
  pas: number
  titlu: string
  useCaseTitlu: string
  readiness: number
  risc: number
  timeline: string
  prerequisite: string
}

export interface AIReadinessPDFInput {
  clientName: string
  useCases: AIReadinessUseCase[]
  /** dataURL PNG pentru Risk Map (opţional — dacă lipseşte, secţiunea se omite). */
  riskMapPng?: string
  adoptionPath?: AdoptionStep[]
  scqaps?: string
}

export async function exportAIReadinessPDF(input: AIReadinessPDFInput): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = doc.internal.pageSize.getWidth()

  // Header band
  doc.setFillColor(...ACDA_BLUE); doc.rect(0, 0, pageW, 14, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text('ACDA', 14, 9)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(`AI Readiness · ${input.clientName}`, pageW - 14, 9, { align: 'right' })

  // Title
  doc.setTextColor(...ACDA_BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text('AI Readiness Score per Use Case', 14, 28)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...TEXT)
  doc.text(new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }), 14, 34)

  // Tabel scurt
  autoTable(doc, {
    startY: 42,
    margin: { left: 14, right: 14 },
    head: [['Use case', 'Date', 'Infra', 'Skills', 'Reg.', 'Global', 'Status']],
    body: input.useCases.map((u) => [
      u.titlu,
      u.criterii.date.toFixed(1),
      u.criterii.infra.toFixed(1),
      u.criterii.skills.toFixed(1),
      u.criterii.reg.toFixed(1),
      u.global.toFixed(1),
      u.statusLabel,
    ]),
    styles: { fontSize: 9, textColor: TEXT },
    headStyles: { fillColor: ACDA_BLUE, textColor: 255 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const uc = input.useCases[data.row.index]
        const col = STATUS_COLOR[uc.status]
        data.cell.styles.fillColor = col
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // @ts-expect-error lastAutoTable
  let y = (doc.lastAutoTable?.finalY ?? 50) + 8

  // Detalii per use case cu acţiuni
  for (const uc of input.useCases) {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setTextColor(...ACDA_BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(`${uc.titlu}  ·  ${uc.global.toFixed(1)}/5  ·  ${uc.statusLabel}`, 14, y); y += 6
    doc.setTextColor(...TEXT); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    if (uc.actiuni.length === 0) {
      doc.text('Nu sunt acţiuni blocante — criteriile sunt peste pragul minim.', 14, y); y += 6
    } else {
      for (const a of uc.actiuni) {
        const lines = doc.splitTextToSize(`• ${a}`, pageW - 28) as string[]
        for (const line of lines) {
          if (y > 275) { doc.addPage(); y = 20 }
          doc.text(line, 14, y); y += 4.5
        }
      }
      y += 2
    }
    y += 3
  }

  // Risk Map
  if (input.riskMapPng) {
    doc.addPage()
    doc.setFillColor(...ACDA_BLUE); doc.rect(0, 0, pageW, 14, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('ACDA', 14, 9)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`AI Readiness · ${input.clientName}`, pageW - 14, 9, { align: 'right' })
    doc.setTextColor(...ACDA_BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text('Risk Map — probabilitate × impact', 14, 28)
    const imgW = pageW - 28
    const imgH = imgW * (540 / 720)
    doc.addImage(input.riskMapPng, 'PNG', 14, 34, imgW, imgH)
    if (input.scqaps) {
      doc.setTextColor(...TEXT); doc.setFont('helvetica', 'italic'); doc.setFontSize(10)
      const lines = doc.splitTextToSize(input.scqaps, pageW - 28) as string[]
      let ny = 34 + imgH + 6
      for (const line of lines) { doc.text(line, 14, ny); ny += 4.8 }
    }
  }

  // Adoption Path
  if (input.adoptionPath && input.adoptionPath.length > 0) {
    doc.addPage()
    doc.setFillColor(...ACDA_BLUE); doc.rect(0, 0, pageW, 14, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('ACDA', 14, 9)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`AI Readiness · ${input.clientName}`, pageW - 14, 9, { align: 'right' })
    doc.setTextColor(...ACDA_BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text('Safe Adoption Path', 14, 28)
    autoTable(doc, {
      startY: 34,
      margin: { left: 14, right: 14 },
      head: [['Pas', 'Use case', 'Readiness', 'Risc', 'Timeline', 'Prerequisite']],
      body: input.adoptionPath.map((s) => [
        `Pas ${s.pas}`, s.useCaseTitlu, s.readiness.toFixed(1),
        s.risc.toFixed(1), s.timeline, s.prerequisite,
      ]),
      styles: { fontSize: 9, textColor: TEXT, cellPadding: 2.5 },
      headStyles: { fillColor: ACDA_BLUE, textColor: 255 },
      columnStyles: { 0: { cellWidth: 16 }, 5: { cellWidth: 55 } },
    })
  }

  const slug = input.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `acda-ai-readiness-${slug || 'client'}-${date}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

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

export interface AIReadinessPDFInput {
  clientName: string
  useCases: AIReadinessUseCase[]
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

  const slug = input.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `acda-ai-readiness-${slug || 'client'}-${date}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

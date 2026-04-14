// C3-T2: Render scatter plot „Risk Map" pe canvas → dataURL PNG pentru PDF.

export interface RiskPoint {
  label: string
  probability: number  // 1..5 (X)
  impact: number       // 1..5 (Y)
  riskLevel: 'low' | 'med' | 'high'
}

const COLORS: Record<RiskPoint['riskLevel'], string> = {
  low:  '#0E7A3C',
  med:  '#DAA520',
  high: '#C0392B',
}

export function renderRiskMap(points: RiskPoint[], opts: { width?: number; height?: number } = {}): string {
  const W = opts.width ?? 720
  const H = opts.height ?? 540
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H)

  const padL = 70, padR = 30, padT = 50, padB = 60
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  // Quadrante background
  const midX = padL + plotW / 2
  const midY = padT + plotH / 2
  ctx.fillStyle = '#F0F9F0'; ctx.fillRect(padL, midY, plotW / 2, plotH / 2)     // stânga-jos: not interesting (low prob, low impact) — neutru
  ctx.fillStyle = '#E8F5E9'; ctx.fillRect(padL, padT, plotW / 2, plotH / 2)      // stânga-sus: sweet spot (low risk, high impact)
  ctx.fillStyle = '#FFF4E5'; ctx.fillRect(midX, midY, plotW / 2, plotH / 2)      // dreapta-jos: low impact high risk → evită
  ctx.fillStyle = '#FDECEA'; ctx.fillRect(midX, padT, plotW / 2, plotH / 2)      // dreapta-sus: high risk high impact → atenţie

  // Axe
  ctx.strokeStyle = '#0A2540'; ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH)
  ctx.stroke()

  // Grid + ticks
  ctx.strokeStyle = '#E6E6E6'; ctx.setLineDash([2, 3])
  ctx.fillStyle = '#0A2540'; ctx.font = '500 11px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  for (let i = 1; i <= 5; i++) {
    const x = padL + (plotW * (i - 1)) / 4
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke()
    ctx.fillText(String(i), x, padT + plotH + 4)
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  for (let i = 1; i <= 5; i++) {
    const y = padT + plotH - (plotH * (i - 1)) / 4
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke()
    ctx.fillText(String(i), padL - 6, y)
  }
  ctx.setLineDash([])

  // Labeluri quadrante
  ctx.fillStyle = '#0A2540'; ctx.font = '700 11px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('SWEET SPOT (low risk · high impact)', padL + plotW / 4, padT + 6)
  ctx.fillText('ATENŢIE (high risk · high impact)', midX + plotW / 4, padT + 6)
  ctx.textBaseline = 'bottom'
  ctx.fillText('Low impact — deprioritizat', padL + plotW / 4, padT + plotH - 6)
  ctx.fillText('EVITĂ (high risk · low impact)', midX + plotW / 4, padT + plotH - 6)

  // Titlu axe
  ctx.fillStyle = '#071F80'; ctx.font = '700 12px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('Probabilitate risc →', padL + plotW / 2, padT + plotH + 28)
  ctx.save()
  ctx.translate(20, padT + plotH / 2); ctx.rotate(-Math.PI / 2)
  ctx.fillText('Impact EBIT →', 0, 0)
  ctx.restore()

  // Titlu
  ctx.fillStyle = '#071F80'; ctx.font = '700 16px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('Risk Map — use case-uri AI', padL, 14)

  // Puncte
  const xScale = (v: number) => padL + (plotW * (Math.max(1, Math.min(5, v)) - 1)) / 4
  const yScale = (v: number) => padT + plotH - (plotH * (Math.max(1, Math.min(5, v)) - 1)) / 4

  for (const p of points) {
    const x = xScale(p.probability)
    const y = yScale(p.impact)
    ctx.fillStyle = COLORS[p.riskLevel]
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke()

    // Label abbreviated
    ctx.fillStyle = '#0A2540'; ctx.font = '500 10px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    const label = p.label.length > 28 ? p.label.slice(0, 27) + '…' : p.label
    ctx.fillText(label, x + 10, y)
  }

  return c.toDataURL('image/png')
}

// Canvas-based chart renderers pentru export PDF. Nu depind de DOM —
// creează un OffscreenCanvas/HTMLCanvas şi returnează dataURL PNG.

const ACDA_BLUE = '#1B3A5C'
const ACDA_ACCENT = '#2E75B6'
const GRID = '#D0D7DE'
const TEXT = '#0A2540'

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Radar chart cu N indicatori (score 0..5). */
export function renderRadarChart(
  indicators: { label: string; score: number }[],
  opts: { width?: number; height?: number; max?: number } = {},
): string {
  const W = opts.width ?? 720
  const H = opts.height ?? 720
  const MAX = opts.max ?? 5
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const cx = W / 2
  const cy = H / 2 + 10
  const radius = Math.min(W, H) * 0.36
  const n = Math.max(indicators.length, 3)

  // rings
  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  for (let r = 1; r <= MAX; r++) {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + Math.cos(ang) * radius * (r / MAX)
      const y = cy + Math.sin(ang) * radius * (r / MAX)
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // spokes + labels
  ctx.fillStyle = TEXT
  ctx.font = '600 14px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const x = cx + Math.cos(ang) * radius
    const y = cy + Math.sin(ang) * radius
    ctx.strokeStyle = GRID
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke()
    const lx = cx + Math.cos(ang) * (radius + 26)
    const ly = cy + Math.sin(ang) * (radius + 26)
    const label = indicators[i]?.label ?? ''
    ctx.fillText(label.length > 18 ? label.slice(0, 17) + '…' : label, lx, ly)
  }

  // polygon
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const score = Math.max(0, Math.min(MAX, indicators[i]?.score ?? 0))
    const x = cx + Math.cos(ang) * radius * (score / MAX)
    const y = cy + Math.sin(ang) * radius * (score / MAX)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = ACDA_ACCENT + '55'
  ctx.fill()
  ctx.strokeStyle = ACDA_BLUE
  ctx.lineWidth = 2
  ctx.stroke()

  // vertices
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const score = Math.max(0, Math.min(MAX, indicators[i]?.score ?? 0))
    const x = cx + Math.cos(ang) * radius * (score / MAX)
    const y = cy + Math.sin(ang) * radius * (score / MAX)
    ctx.fillStyle = ACDA_BLUE
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
  }

  // title
  ctx.fillStyle = ACDA_BLUE
  ctx.font = '700 18px Helvetica, Arial, sans-serif'
  ctx.fillText('Scor maturitate ACDA', cx, 28)

  return canvas.toDataURL('image/png')
}

/** Waterfall EBIT: curent → contribuţii → target. */
export function renderWaterfallChart(
  bars: { label: string; value: number; kind: 'base' | 'delta' | 'total' }[],
  opts: { width?: number; height?: number } = {},
): string {
  const W = opts.width ?? 900
  const H = opts.height ?? 500
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const padL = 80, padR = 30, padT = 60, padB = 80
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  // Running totals
  let running = 0
  const plotted: { x: number; y: number; w: number; h: number; val: number; kind: string; label: string; top: number; bottom: number }[] = []
  let runMin = 0, runMax = 0
  let tmpRun = 0
  for (const b of bars) {
    if (b.kind === 'base' || b.kind === 'total') {
      tmpRun = b.value
    } else {
      tmpRun += b.value
    }
    runMin = Math.min(runMin, tmpRun, b.value)
    runMax = Math.max(runMax, tmpRun, b.value)
  }
  const range = Math.max(runMax - Math.min(runMin, 0), 1)
  const yMax = runMax + range * 0.1
  const yMin = Math.min(runMin, 0) - range * 0.05

  const yScale = (v: number) => padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH
  const barW = Math.max(20, (chartW / bars.length) * 0.65)
  const step = chartW / bars.length

  // axis
  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padL, yScale(0)); ctx.lineTo(padL + chartW, yScale(0)); ctx.stroke()

  ctx.fillStyle = TEXT
  ctx.font = '500 11px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= 4; i++) {
    const v = yMin + ((yMax - yMin) * i) / 4
    const y = yScale(v)
    ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke()
    ctx.fillText(Math.round(v).toLocaleString('ro-RO'), padL - 6, y)
  }

  running = 0
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    let top: number, bottom: number
    if (b.kind === 'base' || b.kind === 'total') {
      top = Math.max(b.value, 0)
      bottom = Math.min(b.value, 0)
      running = b.value
    } else {
      const prev = running
      running += b.value
      top = Math.max(prev, running)
      bottom = Math.min(prev, running)
    }
    const x = padL + step * i + (step - barW) / 2
    const y = yScale(top)
    const h = Math.max(1, yScale(bottom) - yScale(top))
    plotted.push({ x, y, w: barW, h, val: b.value, kind: b.kind, label: b.label, top, bottom })
  }

  // draw bars
  for (let i = 0; i < plotted.length; i++) {
    const p = plotted[i]
    ctx.fillStyle = p.kind === 'base' ? ACDA_BLUE
      : p.kind === 'total' ? '#0E7A3C'
      : p.val >= 0 ? ACDA_ACCENT : '#C0392B'
    ctx.fillRect(p.x, p.y, p.w, p.h)

    // connector la următoarea bară
    if (i < plotted.length - 1 && p.kind !== 'total') {
      const next = plotted[i + 1]
      if (next.kind !== 'base') {
        const cy = p.val >= 0 || p.kind === 'base' ? p.y : p.y + p.h
        ctx.strokeStyle = '#999'
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(p.x + p.w, cy)
        ctx.lineTo(next.x, cy)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // valoare deasupra
    ctx.fillStyle = TEXT
    ctx.font = '600 11px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(
      (p.val >= 0 ? '+' : '') + Math.round(p.val).toLocaleString('ro-RO'),
      p.x + p.w / 2,
      p.y - 4,
    )

    // label rotit
    ctx.save()
    ctx.translate(p.x + p.w / 2, padT + chartH + 8)
    ctx.rotate(-Math.PI / 6)
    ctx.fillStyle = TEXT
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.font = '500 11px Helvetica, Arial, sans-serif'
    ctx.fillText(p.label.length > 22 ? p.label.slice(0, 21) + '…' : p.label, 0, 0)
    ctx.restore()
  }

  // title
  ctx.fillStyle = ACDA_BLUE
  ctx.font = '700 18px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('Impact EBIT — waterfall iniţiative', padL, 18)

  return canvas.toDataURL('image/png')
}

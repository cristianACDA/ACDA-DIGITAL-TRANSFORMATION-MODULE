import type { ArchScore } from '../lib/methodology'
import { ARCH_DEFINITIONS, ARCH_KEYS } from '../lib/methodology'
import type { NivelMaturitate } from '../contracts/agent-contracts'

/**
 * Culori semafor pe praguri (specific radarului — vizualizare).
 * Distinct de LEVEL_STYLE (care folosește amber atât pentru NECONFORM cât și IN_PROGRES);
 * aici fiecare nivel are o culoare proprie, ca arhitecturile peste prag să fie distincte.
 */
const SEMAFOR: Record<NivelMaturitate, string> = {
  NECONFORM: '#ef4444', // roșu
  IN_PROGRES: '#f59e0b', // chihlimbar
  CONFORM: '#22c55e', // verde
  LIDER: '#3b82f6', // albastru
}

/** Eticheta scurtă a unei arhitecturi (fără prefixul „Arhitectura"). */
function shortLabel(nume: string): string {
  return nume.replace(/^Arhitectura(?: de)? /, '')
}

interface RadarGeometry {
  cx: number
  cy: number
  r: number
}

/** Punctul (x,y) pentru axa `i` (din 6) la scorul `scor` (0–5). */
function pointFor(i: number, scor: number, g: RadarGeometry): [number, number] {
  const angle = (-90 + i * 60) * (Math.PI / 180)
  const dist = (Math.max(0, Math.min(5, scor)) / 5) * g.r
  return [g.cx + dist * Math.cos(angle), g.cy + dist * Math.sin(angle)]
}

/** Construiește atributul `points` pentru un poligon hexagonal la o anumită rază-scor. */
function ringPoints(scor: number, g: RadarGeometry): string {
  return ARCH_KEYS.map((_, i) => pointFor(i, scor, g).join(',')).join(' ')
}

export interface ArchitectureRadarProps {
  /** Cele 6 scoruri de arhitectură (ordinea ARCH_KEYS). */
  values: ArchScore[]
}

/**
 * Radar hexagonal pentru Cele 6 Arhitecturi.
 * Afișează 6 axe (scor 0–5), inele de grilă, poligonul de date și vârfuri colorate
 * semafor pe praguri. Etichetele sunt denumirile scurte ale arhitecturilor.
 */
export default function ArchitectureRadar({ values }: ArchitectureRadarProps) {
  const g: RadarGeometry = { cx: 175, cy: 160, r: 115 }
  const byKey = new Map(values.map((v) => [v.key, v]))

  return (
    <svg
      viewBox="0 0 350 330"
      role="img"
      aria-label="Radar Cele 6 Arhitecturi"
      className="w-full max-w-[420px] mx-auto"
    >
      {/* Inele grilă la scorurile 1–5 */}
      {[1, 2, 3, 4, 5].map((s) => (
        <polygon
          key={`ring-${s}`}
          points={ringPoints(s, g)}
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeWidth={s === 5 ? 1.25 : 0.75}
          opacity={s === 5 ? 0.9 : 0.5}
        />
      ))}

      {/* Axe + etichete */}
      {ARCH_KEYS.map((key, i) => {
        const [ax, ay] = pointFor(i, 5, g)
        const [lx, ly] = pointFor(i, 5.9, g)
        const def = ARCH_DEFINITIONS[key]
        const sc = byKey.get(key)
        const anchor = Math.abs(lx - g.cx) < 8 ? 'middle' : lx > g.cx ? 'start' : 'end'
        return (
          <g key={`axis-${key}`}>
            <line
              x1={g.cx}
              y1={g.cy}
              x2={ax}
              y2={ay}
              stroke="var(--color-border-subtle)"
              strokeWidth={0.75}
              opacity={0.6}
            />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-[color:var(--color-text-body)] text-[10px] font-medium"
            >
              {shortLabel(def.nume)}
              {sc ? <tspan className="opacity-50"> {sc.scor.toFixed(1)}</tspan> : null}
            </text>
          </g>
        )
      })}

      {/* Poligonul de date */}
      <polygon
        points={ARCH_KEYS.map((key, i) => pointFor(i, byKey.get(key)?.scor ?? 0, g).join(',')).join(' ')}
        fill="var(--color-text-primary)"
        fillOpacity={0.08}
        stroke="var(--color-text-primary)"
        strokeOpacity={0.55}
        strokeWidth={1.5}
      />

      {/* Vârfuri colorate semafor */}
      {ARCH_KEYS.map((key, i) => {
        const sc = byKey.get(key)
        const [px, py] = pointFor(i, sc?.scor ?? 0, g)
        return (
          <circle
            key={`dot-${key}`}
            cx={px}
            cy={py}
            r={4.5}
            fill={sc ? SEMAFOR[sc.nivel] : '#94a3b8'}
            stroke="white"
            strokeWidth={1.5}
          >
            <title>
              {ARCH_DEFINITIONS[key].nume}: {(sc?.scor ?? 0).toFixed(2)} — {sc?.nivel ?? '—'}
            </title>
          </circle>
        )
      })}
    </svg>
  )
}

export { SEMAFOR }

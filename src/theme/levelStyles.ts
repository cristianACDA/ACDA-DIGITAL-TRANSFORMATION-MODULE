import type { ScoreThresholdKey } from '../types/acda.types'

export interface LevelStyle {
  bar:    string
  text:   string
  bg:     string
  border: string
  chip:   string
  label:  string
}

export const LEVEL_STYLE: Record<ScoreThresholdKey, LevelStyle> = {
  NECONFORM: {
    bar: 'bg-accent-warning', text: 'text-accent-warning', bg: 'bg-[color:rgba(245,158,11,0.08)]', border: 'border-border-subtle',
    chip: 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle text-accent-warning', label: 'Neconform',
  },
  IN_PROGRES: {
    bar: 'bg-accent-warning', text: 'text-accent-warning', bg: 'bg-[color:rgba(245,158,11,0.08)]', border: 'border-border-subtle',
    chip: 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle text-accent-warning', label: 'În Progres',
  },
  CONFORM: {
    bar: 'bg-[color:var(--color-accent-success)]', text: 'text-accent-success', bg: 'bg-[color:rgba(34,197,94,0.08)]', border: 'border-border-subtle',
    chip: 'bg-[color:rgba(34,197,94,0.08)] border-border-subtle text-accent-success', label: 'Conform',
  },
  LIDER: {
    bar: 'bg-[color:var(--color-text-primary)]', text: 'text-[color:var(--color-text-primary)]', bg: 'bg-subtle', border: 'border-border-subtle',
    chip: 'bg-subtle border-border-subtle text-[color:var(--color-text-primary)]', label: 'Lider',
  },
}

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
    bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
    chip: 'bg-red-50 border-red-200 text-red-700', label: 'Neconform',
  },
  IN_PROGRES: {
    bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    chip: 'bg-amber-50 border-amber-200 text-amber-700', label: 'În Progres',
  },
  CONFORM: {
    bar: 'bg-[#48D56F]', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
    chip: 'bg-green-50 border-green-200 text-green-700', label: 'Conform',
  },
  LIDER: {
    bar: 'bg-[#071F80]', text: 'text-[#071F80]', bg: 'bg-blue-50', border: 'border-blue-200',
    chip: 'bg-blue-50 border-blue-200 text-[#071F80]', label: 'Lider',
  },
}

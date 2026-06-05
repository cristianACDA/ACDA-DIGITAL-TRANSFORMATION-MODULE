import { describe, it, expect } from 'vitest'
import { SEMAFOR } from './ArchitectureRadar'

describe('ArchitectureRadar — paletă semafor', () => {
  it('are o culoare pentru fiecare nivel', () => {
    expect(Object.keys(SEMAFOR).sort()).toEqual(['CONFORM', 'IN_PROGRES', 'LIDER', 'NECONFORM'])
  })

  it('IN_PROGRES e distinct cromatic de NECONFORM (DoD V1.2: arch_1 vizibil distinct)', () => {
    expect(SEMAFOR.IN_PROGRES).not.toBe(SEMAFOR.NECONFORM)
  })

  it('toate cele 4 niveluri au culori unice', () => {
    const culori = Object.values(SEMAFOR)
    expect(new Set(culori).size).toBe(culori.length)
  })
})

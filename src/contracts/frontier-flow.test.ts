import { describe, it, expect } from 'vitest'
import {
  STATUS_PROIECT_META,
  effectiveVerdict,
  isValidTransition,
  type StatusProiect,
} from './agent-contracts'

describe('effectiveVerdict', () => {
  it('null când nu există niciun verdict', () => {
    expect(effectiveVerdict({})).toBeNull()
    expect(effectiveVerdict({ verdict: null, verdict_override: null })).toBeNull()
  })

  it('întoarce verdictul rutinei când nu există override', () => {
    expect(effectiveVerdict({ verdict: 'WARN' })).toBe('WARN')
    expect(effectiveVerdict({ verdict: 'PASS', verdict_override: null })).toBe('PASS')
  })

  it('override-ul admin are prioritate absolută cât e setat', () => {
    expect(effectiveVerdict({ verdict: 'FAIL', verdict_override: 'PASS' })).toBe('PASS')
    expect(effectiveVerdict({ verdict: 'PASS', verdict_override: 'FAIL' })).toBe('FAIL')
  })
})

describe('isValidTransition — happy path', () => {
  it.each<[StatusProiect, StatusProiect]>([
    ['CIORNA', 'RUTINA_FRONTIER'],
    ['VALIDARE_CONSULTANT', 'ASTEAPTA_APROBARE'],
    ['ASTEAPTA_APROBARE', 'APROBAT'],
    ['APROBAT', 'REVIEW_OPUS'],
    ['REVIEW_OPUS', 'OFERTA_GENERATA'],
    ['OFERTA_GENERATA', 'FINALIZAT'],
    ['FINALIZAT', 'ARHIVAT'],
    ['RESPINS', 'CIORNA'],
  ])('%s → %s permisă', (from, to) => {
    expect(isValidTransition(from, to)).toBe(true)
  })

  it('respinge sărirea peste RUTINA_FRONTIER și tranzițiile inexistente', () => {
    expect(isValidTransition('CIORNA', 'VALIDARE_CONSULTANT')).toBe(false)
    expect(isValidTransition('APROBAT', 'OFERTA_GENERATA')).toBe(false) // trece prin REVIEW_OPUS
    expect(isValidTransition('FINALIZAT', 'CIORNA')).toBe(false)
    expect(isValidTransition('ARHIVAT', 'FINALIZAT')).toBe(false)
  })

  it('respingerea laterală e permisă din etapa de aprobare', () => {
    expect(isValidTransition('ASTEAPTA_APROBARE', 'RESPINS')).toBe(true)
  })
})

describe('isValidTransition — poarta de verdict pe RUTINA_FRONTIER', () => {
  it('→ VALIDARE_CONSULTANT doar dacă effectiveVerdict ∈ {PASS, WARN}', () => {
    expect(isValidTransition('RUTINA_FRONTIER', 'VALIDARE_CONSULTANT', { verdict: 'PASS' })).toBe(true)
    expect(isValidTransition('RUTINA_FRONTIER', 'VALIDARE_CONSULTANT', { verdict: 'WARN' })).toBe(true)
    expect(isValidTransition('RUTINA_FRONTIER', 'VALIDARE_CONSULTANT', { verdict: 'FAIL' })).toBe(false)
  })

  it('fără verdict (null) nu se poate părăsi RUTINA_FRONTIER', () => {
    expect(isValidTransition('RUTINA_FRONTIER', 'VALIDARE_CONSULTANT')).toBe(false)
    expect(isValidTransition('RUTINA_FRONTIER', 'RESPINS')).toBe(false)
  })

  it('→ RESPINS doar când effectiveVerdict = FAIL', () => {
    expect(isValidTransition('RUTINA_FRONTIER', 'RESPINS', { verdict: 'FAIL' })).toBe(true)
    expect(isValidTransition('RUTINA_FRONTIER', 'RESPINS', { verdict: 'PASS' })).toBe(false)
  })

  it('override-ul guvernează poarta (prioritate peste verdictul rutinei)', () => {
    // verdict FAIL, dar override PASS → forward permis, RESPINS blocat
    expect(isValidTransition('RUTINA_FRONTIER', 'VALIDARE_CONSULTANT', { verdict: 'FAIL', verdict_override: 'PASS' })).toBe(true)
    expect(isValidTransition('RUTINA_FRONTIER', 'RESPINS', { verdict: 'FAIL', verdict_override: 'PASS' })).toBe(false)
    // verdict PASS, dar override FAIL → forward blocat, RESPINS permis
    expect(isValidTransition('RUTINA_FRONTIER', 'VALIDARE_CONSULTANT', { verdict: 'PASS', verdict_override: 'FAIL' })).toBe(false)
    expect(isValidTransition('RUTINA_FRONTIER', 'RESPINS', { verdict: 'PASS', verdict_override: 'FAIL' })).toBe(true)
  })
})

describe('STATUS_PROIECT_META — integritate flux', () => {
  it('conține cele 2 statusuri noi', () => {
    expect(STATUS_PROIECT_META.RUTINA_FRONTIER).toBeDefined()
    expect(STATUS_PROIECT_META.OFERTA_GENERATA).toBeDefined()
  })

  it('happy-path-ul .urmator urmează fluxul țintă confirmat', () => {
    const chain: StatusProiect[] = []
    let cur: StatusProiect | null = 'CIORNA'
    const seen = new Set<StatusProiect>()
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      chain.push(cur)
      cur = STATUS_PROIECT_META[cur].urmator
    }
    expect(chain).toEqual([
      'CIORNA',
      'RUTINA_FRONTIER',
      'VALIDARE_CONSULTANT',
      'ASTEAPTA_APROBARE',
      'APROBAT',
      'REVIEW_OPUS',
      'OFERTA_GENERATA',
      'FINALIZAT',
      'ARHIVAT',
    ])
  })

  it('REVIEW_OPUS rămâne pe flux, înainte de ofertă', () => {
    expect(STATUS_PROIECT_META.REVIEW_OPUS.urmator).toBe('OFERTA_GENERATA')
  })
})

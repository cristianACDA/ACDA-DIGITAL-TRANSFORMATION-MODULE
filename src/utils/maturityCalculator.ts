import { PONDERI_ARII, SCORE_THRESHOLDS } from '../constants/acda.constants'
import type { ScoreThresholdKey } from '../types/acda.types'

// ─── Input types per indicator ────────────────────────────────────────────────

export interface InputO1 { adoptie: number; tech: number }
export interface InputO2 { executanti: number; manageri: number }
export interface InputO3 { areRisc: boolean; nivel: 1 | 2 | 3 | 4 | 5 }
export interface InputT1 { procent: number }
export interface InputT2 { procent: number }
export interface InputT3 { procent: number }
export interface InputS1 { areTarget: boolean; procentInitiative: number }
export type    StadiuS2 = 'NU' | 'PLANIFICAT' | 'IN_CURS' | 'FINALIZAT' | 'ROI_CONFIRMAT'
export interface InputS2 { stadiu: StadiuS2 }
export interface InputS3 { procent: number }

// ─── Score helpers ────────────────────────────────────────────────────────────

/** Clamp a raw score to the valid 1–5 range. */
function clamp(score: number): number {
  return Math.min(5, Math.max(1, Math.round(score)))
}

// ─── Individual indicator calculators ────────────────────────────────────────

/** O1 — Regula 1:1 — ratio = adoptie / tech */
export function scoreO1({ adoptie, tech }: InputO1): number {
  if (tech <= 0) return 1
  const ratio = adoptie / tech
  if (ratio > 1.5)  return 5
  if (ratio >= 1.0) return 4
  if (ratio >= 0.8) return 3
  if (ratio >= 0.5) return 2
  return 1
}

/** O2 — Densitatea Talentului — ratio = executanti / manageri */
export function scoreO2({ executanti, manageri }: InputO2): number {
  if (manageri <= 0) return 1
  const ratio = executanti / manageri
  if (ratio > 5)  return 5
  if (ratio >= 4) return 4
  if (ratio >= 3) return 3
  if (ratio >= 2) return 2
  return 1
}

/** O3 — Riscul de Instruire */
export function scoreO3({ areRisc, nivel }: InputO3): number {
  if (areRisc) {
    if (nivel >= 4) return 1
    if (nivel >= 3) return 2
    return 3
  }
  if (nivel >= 2) return 3
  return 5
}

/** T1 — Data Products */
export function scoreT1({ procent }: InputT1): number {
  return clamp(
    procent > 80  ? 5 :
    procent >= 60 ? 4 :
    procent >= 30 ? 3 :
    procent >= 10 ? 2 : 1
  )
}

/** T2 — API-First */
export function scoreT2({ procent }: InputT2): number {
  return clamp(
    procent > 80  ? 5 :
    procent >= 50 ? 4 :
    procent >= 30 ? 3 :
    procent >= 10 ? 2 : 1
  )
}

/** T3 — Assetizare */
export function scoreT3({ procent }: InputT3): number {
  return clamp(
    procent > 80  ? 5 :
    procent >= 60 ? 4 :
    procent >= 30 ? 3 :
    procent >= 10 ? 2 : 1
  )
}

/** S1 — Focusul EBIT */
export function scoreS1({ areTarget, procentInitiative }: InputS1): number {
  if (!areTarget) return 1
  if (procentInitiative > 75)  return 5
  if (procentInitiative >= 50) return 4
  if (procentInitiative >= 25) return 3
  return 2
}

/** S2 — Validarea Capstone */
export function scoreS2({ stadiu }: InputS2): number {
  const map: Record<StadiuS2, number> = {
    NU:            1,
    PLANIFICAT:    2,
    IN_CURS:       3,
    FINALIZAT:     4,
    ROI_CONFIRMAT: 5,
  }
  return map[stadiu]
}

/** S3 — Trustworthy AI */
export function scoreS3({ procent }: InputS3): number {
  return clamp(
    procent > 80  ? 5 :
    procent >= 60 ? 4 :
    procent >= 40 ? 3 :
    procent >= 20 ? 2 : 1
  )
}

// ─── Aggregate functions ──────────────────────────────────────────────────────

/**
 * Scor mediu al unei arii (Oameni / Tehnologie / Strategie).
 * Primește scorurile individuale (1–5) ale indicatorilor din arie.
 */
export function calculateAreaScore(scores: number[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((acc, s) => acc + s, 0)
  return sum / scores.length
}

/**
 * Scor global ACDA — medie ponderată pe arii cu PONDERI_ARII.
 * oameni 0.25 · tehnologie 0.35 · strategie 0.40
 */
export function calculateGlobalScore(areaScores: {
  oameni:     number
  tehnologie: number
  strategie:  number
}): number {
  return (
    areaScores.oameni     * PONDERI_ARII.oameni     +
    areaScores.tehnologie * PONDERI_ARII.tehnologie +
    areaScores.strategie  * PONDERI_ARII.strategie
  )
}

/** Nivel maturitate conform SCORE_THRESHOLDS. */
export function getMaturityLevel(score: number): ScoreThresholdKey {
  for (const key of Object.keys(SCORE_THRESHOLDS) as ScoreThresholdKey[]) {
    const { min, max } = SCORE_THRESHOLDS[key]
    if (score >= min && score <= max) return key
  }
  return 'NECONFORM'
}

import type { ConfidenceInfo } from '../contracts/agent-contracts'

/**
 * Extensie locală peste ConfidenceInfo: nivelul "MANUAL" apare doar UI-side
 * (când consultantul editează un câmp pre-populat de AI). Contractul cu agenţii
 * rămâne neschimbat — agenţii nu emit niciodată "MANUAL".
 */
export type ConfidenceLevelExtended = ConfidenceInfo['confidence_level'] | 'MANUAL'

export interface FieldConfidence {
  confidence: number
  confidence_level: ConfidenceLevelExtended
  data_source: string | null
}

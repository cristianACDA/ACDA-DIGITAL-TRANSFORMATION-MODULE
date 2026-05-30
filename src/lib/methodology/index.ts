/**
 * Modul methodology — Cele 6 Arhitecturi / Modelul ACDA.
 * Punct unic de import pentru restul aplicației (V1.1, fundament redesign v2.0).
 */

export type { ArchKey, ArchDefinition } from "./arch-definitions";
export { ARCH_KEYS, ARCH_DEFINITIONS } from "./arch-definitions";

export type { ArchScore, IndicatorScores, SetulAKey } from "./arch-mapping";
export {
  SETUL_A_TO_ARCH,
  SETUL_A_KEYS,
  mapSetulAToArchitectures,
  clasificaNivel,
  normalizeIndicator,
} from "./arch-mapping";

export type { ArchNarrative, ArchNarratives } from "./arch-narratives";
export { ARCH_NARRATIVES, getArchNarrative } from "./arch-narratives";

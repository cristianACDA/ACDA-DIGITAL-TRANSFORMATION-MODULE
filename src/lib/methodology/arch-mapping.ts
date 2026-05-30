/**
 * Mapping determinist Setul A v1.1 (9 indicatori) → Cele 6 Arhitecturi.
 *
 * Sursă: BRIEF Redesign v2.0 §2 (tabel canonic SETUL_A_TO_ARCH).
 *
 * NOTĂ de aliniere la cod (verificat în `agent-contracts.ts`, commit fcc1c9a):
 * brief-ul folosește chei scurte (S1, T1, O1…); tipul real al indicatorilor este
 * `IndicatorID` cu coduri lungi (`S1_focusul_ebit`…). Mapping-ul de mai jos este
 * cheiat direct pe `IndicatorID` real, ca să nu existe traducere fragilă la runtime.
 */

import type { IndicatorID } from "../../contracts/agent-contracts";
import { PRAGURI_MATURITATE, type NivelMaturitate } from "../../contracts/agent-contracts";
import { ARCH_KEYS, type ArchKey } from "./arch-definitions";

/**
 * Pentru fiecare indicator din Setul A, arhitecturile pe care le alimentează.
 * (Echivalentul brief §2, tradus pe `IndicatorID` real.)
 */
export const SETUL_A_TO_ARCH: Record<IndicatorID, ArchKey[]> = {
  // Strategie & ROI
  S1_focusul_ebit: ["arch_5", "arch_2"],
  S2_validarea_capstone: ["arch_5"],
  S3_trustworthy_ai: ["arch_3"],
  // Tehnologie & Date
  T1_data_products: ["arch_1", "arch_6"],
  T2_api_first: ["arch_3", "arch_1"],
  T3_assetizare: ["arch_2", "arch_6"],
  // Oameni & Adopție
  O1_regula_1_1: ["arch_4"],
  O2_densitatea_talentului: ["arch_4"],
  O3_riscul_instruire: ["arch_4", "arch_6"],
};

/** Scor calculat pentru o arhitectură, cu trasabilitate la indicatorii-sursă. */
export interface ArchScore {
  key: ArchKey;
  /** Media scorurilor indicatorilor contribuitori (0–5), rotunjită la 2 zecimale. */
  scor: number;
  /** Clasificarea pe pragurile canonice (D3 / D-CTD-01). */
  nivel: NivelMaturitate;
  /** Indicatorii care au contribuit la acest scor (trasabilitate / explainability). */
  contribuitori: IndicatorID[];
}

/** Input minimal pentru mapping: scorul fiecărui indicator din Setul A. */
export type IndicatorScores = Partial<Record<IndicatorID, number>>;

/**
 * Clasifică un scor 0–5 pe pragurile canonice de maturitate.
 * @param scor Scorul mediu al arhitecturii.
 * @returns Nivelul de maturitate corespunzător.
 */
export function clasificaNivel(scor: number): NivelMaturitate {
  // Praguri din agent-contracts.ts; banda finală (LIDER) prinde marginea superioară.
  const prag = PRAGURI_MATURITATE.find((p) => scor >= p.min && scor <= p.max);
  return prag ? prag.nivel : "NECONFORM";
}

/**
 * Construiește maparea inversă arhitectură → indicatori contribuitori.
 * Calculată din {@link SETUL_A_TO_ARCH}; nu se ține o a doua sursă de adevăr.
 */
function buildInverseMap(): Record<ArchKey, IndicatorID[]> {
  const inverse = {} as Record<ArchKey, IndicatorID[]>;
  for (const key of ARCH_KEYS) inverse[key] = [];
  for (const id of Object.keys(SETUL_A_TO_ARCH) as IndicatorID[]) {
    for (const arch of SETUL_A_TO_ARCH[id]) inverse[arch].push(id);
  }
  return inverse;
}

const ARCH_TO_INDICATORS: Record<ArchKey, IndicatorID[]> = buildInverseMap();

/**
 * Transformă cei 9 indicatori ai Setului A în 6 scoruri de arhitectură.
 *
 * Agregare: media aritmetică a scorurilor indicatorilor mapați pe fiecare arhitectură
 * (un indicator poate contribui la mai multe arhitecturi). Indicatorii absenți din
 * input sunt ignorați; o arhitectură fără niciun indicator disponibil primește scor 0.
 *
 * @param scores Scorurile indicatorilor (0–5). Lipsurile sunt tolerate.
 * @returns Cele 6 scoruri de arhitectură, în ordinea {@link ARCH_KEYS}.
 */
export function mapSetulAToArchitectures(scores: IndicatorScores): ArchScore[] {
  return ARCH_KEYS.map((key) => {
    const contribuitori = ARCH_TO_INDICATORS[key].filter(
      (id) => typeof scores[id] === "number",
    );
    const suma = contribuitori.reduce((acc, id) => acc + (scores[id] as number), 0);
    const medie = contribuitori.length > 0 ? suma / contribuitori.length : 0;
    const scor = Math.round(medie * 100) / 100;
    return { key, scor, nivel: clasificaNivel(scor), contribuitori };
  });
}

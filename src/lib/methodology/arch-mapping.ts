/**
 * Mapping determinist Setul A v1.1 (9 indicatori) → Cele 6 Arhitecturi.
 *
 * Sursă: BRIEF Redesign v2.0 §2 (tabel canonic SETUL_A_TO_ARCH).
 *
 * NOTĂ de aliniere la cod (verificat în commit fcc1c9a): în repo coexistă DOUĂ forme
 * de cod pentru indicatori — forma scurtă `S1`/`T1`/`O1` (`IndicatorCode` din
 * `acda.types.ts`, folosită de cockpit/context) și forma lungă `S1_focusul_ebit`
 * (`IndicatorID` din `agent-contracts.ts`, folosită în seed/contract agenți).
 * Mapping-ul e cheiat pe forma SCURTĂ (ca în brief), iar {@link normalizeIndicator}
 * acceptă ambele forme la input, ca să nu existe traducere fragilă la apelant.
 */

import { PRAGURI_MATURITATE, type NivelMaturitate } from "../../contracts/agent-contracts";
import { ARCH_KEYS, type ArchKey } from "./arch-definitions";

/** Cheile scurte ale celor 9 indicatori ai Setului A v1.1. */
export type SetulAKey =
  | "S1" | "S2" | "S3"
  | "T1" | "T2" | "T3"
  | "O1" | "O2" | "O3";

/** Cele 9 chei, în ordine canonică (S → T → O). */
export const SETUL_A_KEYS: readonly SetulAKey[] = [
  "S1", "S2", "S3", "T1", "T2", "T3", "O1", "O2", "O3",
] as const;

/**
 * Pentru fiecare indicator din Setul A, arhitecturile pe care le alimentează.
 * (Identic cu tabelul din BRIEF §2.)
 */
export const SETUL_A_TO_ARCH: Record<SetulAKey, ArchKey[]> = {
  S1: ["arch_5", "arch_2"], T1: ["arch_1", "arch_6"], O1: ["arch_4"],
  S2: ["arch_5"],           T2: ["arch_3", "arch_1"], O2: ["arch_4"],
  S3: ["arch_3"],           T3: ["arch_2", "arch_6"], O3: ["arch_4", "arch_6"],
};

/** Scor calculat pentru o arhitectură, cu trasabilitate la indicatorii-sursă. */
export interface ArchScore {
  key: ArchKey;
  /** Media scorurilor indicatorilor contribuitori (0–5), rotunjită la 2 zecimale. */
  scor: number;
  /** Clasificarea pe pragurile canonice (D3 / D-CTD-01). */
  nivel: NivelMaturitate;
  /** Indicatorii (chei scurte) care au contribuit la acest scor. */
  contribuitori: SetulAKey[];
}

/** Input mapping: scorul fiecărui indicator. Cheile pot fi în forma scurtă sau lungă. */
export type IndicatorScores = Record<string, number>;

/**
 * Normalizează un cod de indicator la forma scurtă canonică.
 * Acceptă `S1` sau `S1_focusul_ebit` (case-insensitive) → `"S1"`.
 * @returns cheia scurtă validă, sau `null` dacă nu e un indicator cunoscut.
 */
export function normalizeIndicator(code: string): SetulAKey | null {
  const prefix = code.trim().toUpperCase().split("_")[0];
  return (SETUL_A_KEYS as readonly string[]).includes(prefix)
    ? (prefix as SetulAKey)
    : null;
}

/**
 * Clasifică un scor 0–5 pe pragurile canonice de maturitate.
 * @param scor Scorul mediu al arhitecturii.
 */
export function clasificaNivel(scor: number): NivelMaturitate {
  const prag = PRAGURI_MATURITATE.find((p) => scor >= p.min && scor <= p.max);
  return prag ? prag.nivel : "NECONFORM";
}

/** Mapare inversă arhitectură → indicatori contribuitori, derivată din SETUL_A_TO_ARCH. */
function buildInverseMap(): Record<ArchKey, SetulAKey[]> {
  const inverse = {} as Record<ArchKey, SetulAKey[]>;
  for (const key of ARCH_KEYS) inverse[key] = [];
  for (const id of SETUL_A_KEYS) {
    for (const arch of SETUL_A_TO_ARCH[id]) inverse[arch].push(id);
  }
  return inverse;
}

const ARCH_TO_INDICATORS: Record<ArchKey, SetulAKey[]> = buildInverseMap();

/**
 * Transformă cei 9 indicatori ai Setului A în 6 scoruri de arhitectură.
 *
 * Agregare: media aritmetică a scorurilor indicatorilor mapați pe fiecare arhitectură
 * (un indicator poate contribui la mai multe arhitecturi). Cheile de input se
 * normalizează cu {@link normalizeIndicator}; indicatorii absenți sunt ignorați; o
 * arhitectură fără niciun indicator disponibil primește scor 0.
 *
 * @param scores Scorurile indicatorilor (0–5), cheiate scurt sau lung.
 * @returns Cele 6 scoruri de arhitectură, în ordinea {@link ARCH_KEYS}.
 */
export function mapSetulAToArchitectures(scores: IndicatorScores): ArchScore[] {
  // Normalizează input-ul o singură dată (ultima valoare câștigă la duplicate).
  const byKey: Partial<Record<SetulAKey, number>> = {};
  for (const [rawCode, value] of Object.entries(scores)) {
    const key = normalizeIndicator(rawCode);
    if (key !== null && typeof value === "number") byKey[key] = value;
  }

  return ARCH_KEYS.map((key) => {
    const contribuitori = ARCH_TO_INDICATORS[key].filter(
      (id) => typeof byKey[id] === "number",
    );
    const suma = contribuitori.reduce((acc, id) => acc + (byKey[id] as number), 0);
    const medie = contribuitori.length > 0 ? suma / contribuitori.length : 0;
    const scor = Math.round(medie * 100) / 100;
    return { key, scor, nivel: clasificaNivel(scor), contribuitori };
  });
}

/**
 * Cele 6 Arhitecturi / Modelul ACDA — definiții canonice.
 *
 * Cadrul strategic client-facing (vezi BRIEF Redesign v2.0 §2 + naming §1).
 * Fiecare arhitectură este o lentilă de citire a maturității digitale, derivată
 * determinist din Setul A v1.1 (cei 9 indicatori) prin {@link SETUL_A_TO_ARCH}.
 *
 * Sursă de adevăr pentru praguri/ponderi: `src/contracts/agent-contracts.ts`
 * (PRAGURI_MATURITATE, PONDERI_ARII) — NU se redefinesc aici.
 */

/** Cheile celor 6 arhitecturi. Stabile — folosite ca identificatori în DB/URL/teste. */
export type ArchKey =
  | "arch_1"
  | "arch_2"
  | "arch_3"
  | "arch_4"
  | "arch_5"
  | "arch_6";

/** Lista ordonată a cheilor, pentru iterări deterministe (hexagon, tabele). */
export const ARCH_KEYS: readonly ArchKey[] = [
  "arch_1",
  "arch_2",
  "arch_3",
  "arch_4",
  "arch_5",
  "arch_6",
] as const;

/** Metadate de afișare pentru o arhitectură. Limba RO (naming canonic §1). */
export interface ArchDefinition {
  /** Cheia stabilă. */
  key: ArchKey;
  /** Denumire client-facing. */
  nume: string;
  /** Descriere scurtă (o frază) pentru carduri/tooltip. */
  descriere: string;
}

/**
 * Definițiile celor 6 arhitecturi (denumiri din BRIEF §2).
 * Conținutul narativ extins (per arhitectură × bandă de scor) trăiește separat
 * în `arch-narratives.ts` și necesită copy ACDA validat înainte de expunere în UI.
 */
export const ARCH_DEFINITIONS: Record<ArchKey, ArchDefinition> = {
  arch_1: {
    key: "arch_1",
    nume: "Arhitectura Informațională",
    descriere:
      "Cum sunt structurate, guvernate și transformate datele în produse reutilizabile.",
  },
  arch_2: {
    key: "arch_2",
    nume: "Arhitectura Proceselor",
    descriere:
      "Cât de standardizate, măsurate și pregătite pentru automatizare sunt fluxurile de lucru.",
  },
  arch_3: {
    key: "arch_3",
    nume: "Arhitectura Tehnologică",
    descriere:
      "Maturitatea platformei: API-uri, modularitate și fundație de încredere pentru AI.",
  },
  arch_4: {
    key: "arch_4",
    nume: "Arhitectura Organizațională",
    descriere:
      "Oameni, competențe, densitatea talentului și capacitatea de adopție a schimbării.",
  },
  arch_5: {
    key: "arch_5",
    nume: "Arhitectura de Creștere & Inovație",
    descriere:
      "Disciplina de a lega inițiativele de rezultat (EBIT) și de a valida prin piloturi.",
  },
  arch_6: {
    key: "arch_6",
    nume: "Arhitectura Relației cu Clientul",
    descriere:
      "Cum sunt expuse capabilitățile către client prin date, interfețe și active reutilizabile.",
  },
};

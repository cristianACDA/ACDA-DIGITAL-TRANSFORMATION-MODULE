/**
 * Cost of Inaction (Costul Inacțiunii) — funcție canonică UNICĂ.
 *
 * SINGURUL loc unde se calculează costul inacțiunii în tot modulul CTD.
 * Toți consumatorii (pagina 2 EBIT Baseline, Strategy10min, export PDF) cheamă
 * această funcție, ca să existe o singură cifră peste tot (elimină divergența
 * istorică: `pierderiAnuale` calculat local în Strategy10min).
 *
 * ── Surse (decizie confirmată) ───────────────────────────────────────────────
 *   - Pagina 4 (procese):  `cost_estimated`  → cost direct, recurent anual.
 *   - Pagina 5 (probleme): `financial_impact` → impact financiar anual.
 *
 * ── Anti dublă-numărare (decizie documentată) ────────────────────────────────
 *   `ebit_impact` al proceselor (pag. 4) descrie EROZIUNEA de EBIT atribuibilă
 *   procesului — frecvent ACELAȘI ban deja capturat de `financial_impact` al unei
 *   probleme legate (ex. procesul „Support tier-1" ↔ problema „churn"). Nu există
 *   în date o legătură proces↔problemă pe care să ne putem baza pentru a deduplica
 *   sigur. Prin urmare BAZA = `cost_estimated` (procese) + `financial_impact`
 *   (probleme), iar `ebit_impact` se raportează SEPARAT (`impactEbitProcese`),
 *   NU se adună în bază. Sume separate, etichetate pe sursă.
 *
 * ── Formulă (ipoteze declarate, nu garanție) ─────────────────────────────────
 *   Orizont 2 ani.
 *   Scenariu „fără acțiune":  An1 = bază; An2 = bază × {@link COST_INACTION_DEFAULTS.erodareAn2}.
 *   Scenariu „cu transformare ACDA": recuperează `recuperareAn1` din An1 și
 *   `recuperareAn2` din An2; restul rămâne pierdere.
 */

import type { Process, ProblemStatement } from "../../types/acda.types";

/** Ipoteze canonice ale simulării (D-CTD — Cost of Inaction). */
export const COST_INACTION_DEFAULTS = {
  /** Orizont de proiecție, ani. */
  orizontAni: 2,
  /** Factor erodare An 2 față de An 1 (status-quo se înrăutățește). */
  erodareAn2: 1.15,
  /** Rata de recuperare cu ACDA în An 1. */
  recuperareAn1: 0.4,
  /** Rata de recuperare cu ACDA în An 2. */
  recuperareAn2: 0.75,
} as const;

/** Disclaimer obligatoriu, afișat vizibil la fiecare consumator. */
export const COST_INACTION_DISCLAIMER =
  "Simulare cu ipoteze declarate, nu garanție.";

/** Mesaj de ghidare când nu există costuri completate (status 'empty'). */
export const COST_INACTION_MESAJ_GOL =
  "Completați procesele (pag. 4) și problemele (pag. 5) pentru a estima costul inacțiunii.";

/** Ipoteze suprascriabile per apel (rămân declarate în rezultat). */
export interface CostOfInactionOptions {
  erodareAn2?: number;
  recuperareAn1?: number;
  recuperareAn2?: number;
}

/** Scenariul „fără acțiune": cât pierde organizația dacă nu acționează. */
export interface ScenariuFaraActiune {
  an1: number;
  an2: number;
  total: number;
}

/** Scenariul „cu transformare ACDA": recuperat vs. rămas pierdere, pe 2 ani. */
export interface ScenariuCuACDA {
  an1Recuperat: number;
  an2Recuperat: number;
  totalRecuperat: number;
  an1Ramas: number;
  an2Ramas: number;
  totalRamas: number;
}

/** Rezultatul complet al simulării costului inacțiunii. */
export interface CostOfInactionResult {
  /** 'ok' dacă bază > 0; 'empty' dacă nu există costuri completate. */
  status: "ok" | "empty";
  /** Σ `cost_estimated` al proceselor (pag. 4). */
  costProcese: number;
  /** Σ `financial_impact` al problemelor (pag. 5). */
  costProbleme: number;
  /** Σ `ebit_impact` al proceselor (pag. 4) — raportat separat, NU în bază. */
  impactEbitProcese: number;
  /** Baza simulării = costProcese + costProbleme. */
  baza: number;
  faraActiune: ScenariuFaraActiune;
  cuTransformareACDA: ScenariuCuACDA;
  /** Ipotezele efectiv folosite (canonice sau suprascrise). */
  ipoteze: {
    orizontAni: number;
    erodareAn2: number;
    recuperareAn1: number;
    recuperareAn2: number;
  };
  disclaimer: string;
  /** Mesaj UI când status='empty', altfel null. */
  mesajGol: string | null;
}

/** Rotunjire monetară la 2 zecimale (RON). */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Sumă a unui câmp numeric opțional; valorile absente/NaN se ignoră. */
function sumField<T>(rows: readonly T[], pick: (row: T) => number | undefined | null): number {
  return rows.reduce((acc, row) => {
    const v = pick(row);
    return typeof v === "number" && !Number.isNaN(v) ? acc + v : acc;
  }, 0);
}

/**
 * Calculează costul inacțiunii pe 2 ani din procese (pag. 4) și probleme (pag. 5).
 *
 * @param processes Procesele identificate (pagina 4 ValueStream).
 * @param problems  Problemele identificate (pagina 5 ProblemFraming).
 * @param options   Ipoteze suprascriabile (default = {@link COST_INACTION_DEFAULTS}).
 * @returns Simularea completă, cu cele 2 scenarii și disclaimer.
 */
export function computeCostOfInaction(
  processes: readonly Process[],
  problems: readonly ProblemStatement[],
  options: CostOfInactionOptions = {},
): CostOfInactionResult {
  const erodareAn2 = options.erodareAn2 ?? COST_INACTION_DEFAULTS.erodareAn2;
  const recuperareAn1 = options.recuperareAn1 ?? COST_INACTION_DEFAULTS.recuperareAn1;
  const recuperareAn2 = options.recuperareAn2 ?? COST_INACTION_DEFAULTS.recuperareAn2;

  const costProcese = sumField(processes, (p) => p.cost_estimated);
  const costProbleme = sumField(problems, (p) => p.financial_impact);
  const impactEbitProcese = sumField(processes, (p) => p.ebit_impact);
  const baza = costProcese + costProbleme;

  // Scenariu „fără acțiune": erodare cumulativă pe 2 ani.
  const an1 = baza;
  const an2 = baza * erodareAn2;
  const faraActiune: ScenariuFaraActiune = {
    an1: round2(an1),
    an2: round2(an2),
    total: round2(an1 + an2),
  };

  // Scenariu „cu transformare ACDA": recuperare per an, restul rămâne pierdere.
  const an1Recuperat = an1 * recuperareAn1;
  const an2Recuperat = an2 * recuperareAn2;
  const cuTransformareACDA: ScenariuCuACDA = {
    an1Recuperat: round2(an1Recuperat),
    an2Recuperat: round2(an2Recuperat),
    totalRecuperat: round2(an1Recuperat + an2Recuperat),
    an1Ramas: round2(an1 - an1Recuperat),
    an2Ramas: round2(an2 - an2Recuperat),
    totalRamas: round2(an1 - an1Recuperat + (an2 - an2Recuperat)),
  };

  const status: "ok" | "empty" = baza > 0 ? "ok" : "empty";

  return {
    status,
    costProcese: round2(costProcese),
    costProbleme: round2(costProbleme),
    impactEbitProcese: round2(impactEbitProcese),
    baza: round2(baza),
    faraActiune,
    cuTransformareACDA,
    ipoteze: {
      orizontAni: COST_INACTION_DEFAULTS.orizontAni,
      erodareAn2,
      recuperareAn1,
      recuperareAn2,
    },
    disclaimer: COST_INACTION_DISCLAIMER,
    mesajGol: status === "empty" ? COST_INACTION_MESAJ_GOL : null,
  };
}

import { describe, it, expect } from "vitest";
import { mockCTDOutput } from "../../mocks/mock-cloudserve";
import type { Process, ProblemStatement } from "../../types/acda.types";
import {
  computeCostOfInaction,
  COST_INACTION_DEFAULTS,
  COST_INACTION_DISCLAIMER,
  COST_INACTION_MESAJ_GOL,
} from "./cost-of-inaction";

// ── Mapare seed CloudServe (contract Romanian-keyed) → tipuri domeniu ──────────
function processesFromSeed(): Process[] {
  return mockCTDOutput.procese.map((p, i) => ({
    id: `seed-proc-${i}`,
    project_id: "seed",
    name: p.nume,
    cost_estimated: p.cost_estimat ?? undefined,
    blocking_score: p.grad_blocare ?? undefined,
    ebit_impact: p.impact_ebit ?? undefined,
    created_at: "",
    updated_at: "",
  }));
}
function problemsFromSeed(): ProblemStatement[] {
  return mockCTDOutput.probleme.map((p, i) => ({
    id: `seed-prob-${i}`,
    project_id: "seed",
    title: p.titlu,
    financial_impact: p.impact_financiar ?? undefined,
    created_at: "",
    updated_at: "",
  }));
}

// Helpere construcție minimală pentru teste unitare.
function proc(patch: Partial<Process>): Process {
  return { id: "p", project_id: "x", name: "", created_at: "", updated_at: "", ...patch };
}
function prob(patch: Partial<ProblemStatement>): ProblemStatement {
  return { id: "q", project_id: "x", title: "", created_at: "", updated_at: "", ...patch };
}

describe("computeCostOfInaction — seed CloudServe (regresie)", () => {
  const r = computeCostOfInaction(processesFromSeed(), problemsFromSeed());

  it("status 'ok' pe seed (există costuri)", () => {
    expect(r.status).toBe("ok");
    expect(r.mesajGol).toBeNull();
  });

  it("sume separate pe sursă (anti dublă-numărare)", () => {
    // procese cost_estimat: 2500 + 8000 + 3000
    expect(r.costProcese).toBe(13500);
    // probleme impact_financiar: 210000 + 120000 + null
    expect(r.costProbleme).toBe(330000);
    // ebit_impact procese: 45000 + 35000 + 15000 — RAPORTAT SEPARAT, NU în bază
    expect(r.impactEbitProcese).toBe(95000);
  });

  it("baza = costProcese + costProbleme (NU include ebit_impact)", () => {
    expect(r.baza).toBe(343500);
  });

  it("scenariul «fără acțiune»: An1 = bază, An2 = bază × 1.15", () => {
    expect(r.faraActiune.an1).toBe(343500);
    expect(r.faraActiune.an2).toBe(395025); // 343500 × 1.15
    expect(r.faraActiune.total).toBe(738525);
  });

  it("scenariul «cu transformare ACDA»: recuperare 40% An1, 75% An2", () => {
    expect(r.cuTransformareACDA.an1Recuperat).toBe(137400); // 0.40 × 343500
    expect(r.cuTransformareACDA.an2Recuperat).toBe(296268.75); // 0.75 × 395025
    expect(r.cuTransformareACDA.totalRecuperat).toBe(433668.75);
    expect(r.cuTransformareACDA.an1Ramas).toBe(206100); // 0.60 × 343500
    expect(r.cuTransformareACDA.an2Ramas).toBe(98756.25); // 0.25 × 395025
    expect(r.cuTransformareACDA.totalRamas).toBe(304856.25);
  });
});

describe("computeCostOfInaction — formulă (input controlat)", () => {
  it("baza = Σ cost_estimated + Σ financial_impact", () => {
    const r = computeCostOfInaction(
      [proc({ cost_estimated: 100 }), proc({ cost_estimated: 50 })],
      [prob({ financial_impact: 1000 })],
    );
    expect(r.baza).toBe(150 + 1000);
  });

  it("erodare An2 = 15% peste An1", () => {
    const r = computeCostOfInaction([proc({ cost_estimated: 1000 })], []);
    expect(r.faraActiune.an1).toBe(1000);
    expect(r.faraActiune.an2).toBe(1150);
  });

  it("recuperare ACDA 40% An1 / 75% An2 din scenariul fără acțiune", () => {
    const r = computeCostOfInaction([], [prob({ financial_impact: 1000 })]);
    // An1 = 1000 → recuperat 400, rămas 600
    expect(r.cuTransformareACDA.an1Recuperat).toBe(400);
    expect(r.cuTransformareACDA.an1Ramas).toBe(600);
    // An2 = 1150 → recuperat 862.5, rămas 287.5
    expect(r.cuTransformareACDA.an2Recuperat).toBe(862.5);
    expect(r.cuTransformareACDA.an2Ramas).toBe(287.5);
  });
});

describe("computeCostOfInaction — dublă numărare evitată", () => {
  it("ebit_impact al proceselor NU intră în bază", () => {
    const r = computeCostOfInaction(
      [proc({ cost_estimated: 100, ebit_impact: 9999 })],
      [prob({ financial_impact: 200 })],
    );
    expect(r.baza).toBe(300); // 100 + 200, fără 9999
    expect(r.impactEbitProcese).toBe(9999); // raportat separat
  });
});

describe("computeCostOfInaction — caz gol / undefined", () => {
  it("fără procese și probleme => status 'empty', scenarii 0, mesaj ghidare", () => {
    const r = computeCostOfInaction([], []);
    expect(r.status).toBe("empty");
    expect(r.baza).toBe(0);
    expect(r.faraActiune.total).toBe(0);
    expect(r.cuTransformareACDA.totalRecuperat).toBe(0);
    expect(r.mesajGol).toBe(COST_INACTION_MESAJ_GOL);
  });

  it("costuri undefined/null sunt ignorate, nu tratate ca 0 eronat", () => {
    const r = computeCostOfInaction(
      [proc({ cost_estimated: undefined }), proc({ cost_estimated: 250 })],
      [prob({ financial_impact: undefined })],
    );
    expect(r.costProcese).toBe(250);
    expect(r.costProbleme).toBe(0);
    expect(r.status).toBe("ok");
  });

  it("toate costurile 0 => status 'empty'", () => {
    const r = computeCostOfInaction([proc({ cost_estimated: 0 })], [prob({ financial_impact: 0 })]);
    expect(r.status).toBe("empty");
  });
});

describe("computeCostOfInaction — ipoteze declarate", () => {
  it("expune ipotezele canonice și disclaimer-ul obligatoriu", () => {
    const r = computeCostOfInaction([proc({ cost_estimated: 100 })], []);
    expect(r.ipoteze).toEqual({
      orizontAni: 2,
      erodareAn2: 1.15,
      recuperareAn1: 0.4,
      recuperareAn2: 0.75,
    });
    expect(r.disclaimer).toBe(COST_INACTION_DISCLAIMER);
    expect(r.disclaimer).toMatch(/simulare/i);
  });

  it("defaults canonici exportați coincid cu ipotezele", () => {
    expect(COST_INACTION_DEFAULTS).toEqual({
      orizontAni: 2,
      erodareAn2: 1.15,
      recuperareAn1: 0.4,
      recuperareAn2: 0.75,
    });
  });

  it("options pot suprascrie ipotezele (declarate, nu hardcodate)", () => {
    const r = computeCostOfInaction([proc({ cost_estimated: 1000 })], [], {
      erodareAn2: 1.2,
      recuperareAn1: 0.5,
    });
    expect(r.faraActiune.an2).toBe(1200);
    expect(r.cuTransformareACDA.an1Recuperat).toBe(500);
    expect(r.ipoteze.erodareAn2).toBe(1.2);
  });
});

import { describe, it, expect } from "vitest";
import type { IndicatorID } from "../../contracts/agent-contracts";
import { mockCTDOutput } from "../../mocks/mock-cloudserve";
import { ARCH_KEYS } from "./arch-definitions";
import {
  mapSetulAToArchitectures,
  clasificaNivel,
  SETUL_A_TO_ARCH,
  type IndicatorScores,
} from "./arch-mapping";

/** Extrage scorurile indicatorilor dintr-un AgentCTDOutput (folosit ca input mapping). */
function scoresFromSeed(): IndicatorScores {
  const out: IndicatorScores = {};
  for (const ind of mockCTDOutput.indicatori) out[ind.id] = ind.scor;
  return out;
}

describe("mapSetulAToArchitectures — seed CloudServe (regresie)", () => {
  const result = mapSetulAToArchitectures(scoresFromSeed());

  it("produce exact 6 scoruri de arhitectură din cei 9 indicatori", () => {
    expect(result).toHaveLength(6);
    expect(result.map((r) => r.key)).toEqual([...ARCH_KEYS]);
  });

  it("calculează scorurile corecte pe seed (media indicatorilor contribuitori)", () => {
    const byKey = Object.fromEntries(result.map((r) => [r.key, r.scor]));
    expect(byKey.arch_1).toBe(2.5); // T1 2.0, T2 3.0
    expect(byKey.arch_2).toBe(1.25); // S1 1.0, T3 1.5
    expect(byKey.arch_3).toBe(1.75); // S3 0.5, T2 3.0
    expect(byKey.arch_4).toBe(2.33); // O1 1.5, O2 3.5, O3 2.0 -> 2.333
    expect(byKey.arch_5).toBe(1.0); // S1 1.0, S2 1.0
    expect(byKey.arch_6).toBe(1.83); // T1 2.0, T3 1.5, O3 2.0 -> 1.833
  });

  it("lentila pe arhitecturi: 5 NECONFORM + arch_1 IN_PROGRES (nuanță ascunsă de scorul global 1.67)", () => {
    const byKey = Object.fromEntries(result.map((r) => [r.key, r.nivel]));
    expect(byKey.arch_1).toBe("IN_PROGRES"); // 2.5 — singura peste prag
    expect(byKey.arch_2).toBe("NECONFORM");
    expect(byKey.arch_3).toBe("NECONFORM");
    expect(byKey.arch_4).toBe("NECONFORM");
    expect(byKey.arch_5).toBe("NECONFORM");
    expect(byKey.arch_6).toBe("NECONFORM");
    expect(result.filter((r) => r.nivel === "NECONFORM")).toHaveLength(5);
  });

  it("trasează corect indicatorii contribuitori (explainability)", () => {
    const arch4 = result.find((r) => r.key === "arch_4");
    expect(arch4?.contribuitori.sort()).toEqual(
      ["O1_regula_1_1", "O2_densitatea_talentului", "O3_riscul_instruire"].sort(),
    );
  });
});

describe("mapSetulAToArchitectures — robustețe", () => {
  it("input gol => 6 scoruri 0, NECONFORM, fără contribuitori", () => {
    const r = mapSetulAToArchitectures({});
    expect(r).toHaveLength(6);
    expect(r.every((x) => x.scor === 0 && x.nivel === "NECONFORM")).toBe(true);
    expect(r.every((x) => x.contribuitori.length === 0)).toBe(true);
  });

  it("input parțial => folosește doar indicatorii prezenți", () => {
    const r = mapSetulAToArchitectures({ O2_densitatea_talentului: 4.0 });
    const arch4 = r.find((x) => x.key === "arch_4");
    expect(arch4?.scor).toBe(4.0);
    expect(arch4?.contribuitori).toEqual(["O2_densitatea_talentului"]);
  });
});

describe("clasificaNivel — praguri canonice D3", () => {
  it.each([
    [0, "NECONFORM"],
    [2.4, "NECONFORM"],
    [2.5, "IN_PROGRES"],
    [3.4, "IN_PROGRES"],
    [3.5, "CONFORM"],
    [4.4, "CONFORM"],
    [4.5, "LIDER"],
    [5.0, "LIDER"],
  ])("scor %s => %s", (scor, nivel) => {
    expect(clasificaNivel(scor as number)).toBe(nivel);
  });
});

describe("SETUL_A_TO_ARCH — integritate mapping", () => {
  it("acoperă toți cei 9 indicatori ai Setului A", () => {
    expect(Object.keys(SETUL_A_TO_ARCH).sort()).toEqual(
      (
        [
          "O1_regula_1_1",
          "O2_densitatea_talentului",
          "O3_riscul_instruire",
          "S1_focusul_ebit",
          "S2_validarea_capstone",
          "S3_trustworthy_ai",
          "T1_data_products",
          "T2_api_first",
          "T3_assetizare",
        ] as IndicatorID[]
      ).sort(),
    );
  });

  it("toate țintele sunt arhitecturi valide", () => {
    const valid = new Set<string>(ARCH_KEYS);
    for (const targets of Object.values(SETUL_A_TO_ARCH)) {
      for (const t of targets) expect(valid.has(t)).toBe(true);
    }
  });
});

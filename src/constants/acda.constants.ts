export const METHODOLOGY_VERSION = "ACDA v1.1" as const;

export const MATURITY_INDICATORS = [
  { id: "O1", name: "Regula 1:1",          aria: "Oameni & Adopție"   },
  { id: "O2", name: "Densitatea Talentului", aria: "Oameni & Adopție"   },
  { id: "O3", name: "Riscul de Instruire",  aria: "Oameni & Adopție"   },
  { id: "T1", name: "Data Products",        aria: "Tehnologie & Date"  },
  { id: "T2", name: "API-First",            aria: "Tehnologie & Date"  },
  { id: "T3", name: "Assetizare",           aria: "Tehnologie & Date"  },
  { id: "S1", name: "Focusul EBIT",         aria: "Strategie & ROI"    },
  { id: "S2", name: "Validarea Capstone",   aria: "Strategie & ROI"    },
  { id: "S3", name: "Trustworthy AI",       aria: "Strategie & ROI"    },
] as const;

export const SCORE_THRESHOLDS = {
  NECONFORM:  { min: 0.0, max: 2.4 },
  IN_PROGRES: { min: 2.5, max: 3.4 },
  CONFORM:    { min: 3.5, max: 4.4 },
  LIDER:      { min: 4.5, max: 5.0 },
} as const;

export const EBIT_TARGET_DEFAULT_PERCENT = 20 as const;

export const RULE_1_TO_1_MINIMUM = 1.0 as const;

export const PONDERI_ARII = {
  oameni:     0.25,
  tehnologie: 0.35,
  strategie:  0.40,
} as const;

export const PRAGURI_MATURITATE = {
  NECONFORM:  [0,   2.4],
  IN_PROGRES: [2.5, 3.4],
  CONFORM:    [3.5, 4.4],
  LIDER:      [4.5, 5.0],
} as const;

export const REPORT_SECTIONS = [
  "Executive Summary",
  "Business Context",
  "EBIT Baseline & Target",
  "Value Stream Analysis",
  "Process Evaluation",
  "Technology Landscape",
  "ACDA Maturity Score",
  "Problem Analysis",
  "Opportunity Map",
  "Prioritized Initiatives",
  "Transformation Strategy",
  "Implementation Roadmap",
  "Financial Impact Model",
  "Governance Model",
  "Capstone Framework",
] as const;

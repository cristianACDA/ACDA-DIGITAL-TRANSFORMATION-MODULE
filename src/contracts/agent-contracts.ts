// ============================================================
// ACDA Agent Contracts v1.1
// Interfețele JSON dintre ACDA OS (agenți) și Cockpit CTD (React)
//
// Aliniat la:
//   - Setul A (D1), Ponderi D2, Praguri D3
//   - Confidence D-CTD-02, Praguri Qual D-CTD-04, Schema Qual D-CTD-05
//   - GDrive D-CTD-03
//   - Structura comercială acda.ro/transformare-digitala-2
//   - Cele 12 pagini din ACDA_Platforma_CTD_Viziune_v1.docx
//
// Changelog v1.0 → v1.1:
//   - Ofertă: 4 niveluri reale ACDA (Mini-Diagnostic / Sprint / Pachet / Guvernanță)
//   - Pagini cockpit: aliniate la Viziune CTD oficial
//   - Statusuri proiect: în română
//   - Livrabile Pachet Transformare: cele 7 de pe site
// ============================================================

// ── COMMON TYPES ──────────────────────────────────────────

export interface ConfidenceInfo {
  confidence: number;
  confidence_level: "HIGH" | "MEDIUM" | "LOW";
  data_source: string | null;
  data_completeness: "complet" | "partial" | "lipsa";
}

export interface ACDAReferences {
  palace_ref: string | null;
  gdrive_ref: string | null;
  notion_ref: string | null;
}

export interface AgentMetadata {
  model: string;
  durata_procesare_sec: number;
  timestamp: string;
  agent_version: string;
}

// ── SETUL A: INDICATORI MATURITATE (D1) ──────────────────

export type IndicatorID =
  | "O1_regula_1_1" | "O2_densitatea_talentului" | "O3_riscul_instruire"
  | "T1_data_products" | "T2_api_first" | "T3_assetizare"
  | "S1_focusul_ebit" | "S2_validarea_capstone" | "S3_trustworthy_ai";

export type ArieID = "oameni_adoptie" | "tehnologie_date" | "strategie_roi";

export const INDICATOR_ARIE_MAP: Record<IndicatorID, ArieID> = {
  O1_regula_1_1: "oameni_adoptie", O2_densitatea_talentului: "oameni_adoptie", O3_riscul_instruire: "oameni_adoptie",
  T1_data_products: "tehnologie_date", T2_api_first: "tehnologie_date", T3_assetizare: "tehnologie_date",
  S1_focusul_ebit: "strategie_roi", S2_validarea_capstone: "strategie_roi", S3_trustworthy_ai: "strategie_roi",
};

export const PONDERI_ARII: Record<ArieID, number> = {
  strategie_roi: 0.4, tehnologie_date: 0.35, oameni_adoptie: 0.25,
};

export type NivelMaturitate = "NECONFORM" | "IN_PROGRES" | "CONFORM" | "LIDER";

export const PRAGURI_MATURITATE: { nivel: NivelMaturitate; min: number; max: number }[] = [
  { nivel: "NECONFORM", min: 0, max: 2.4 },
  { nivel: "IN_PROGRES", min: 2.5, max: 3.4 },
  { nivel: "CONFORM", min: 3.5, max: 4.4 },
  { nivel: "LIDER", min: 4.5, max: 5.0 },
];

export interface IndicatorExtras extends ConfidenceInfo {
  id: IndicatorID;
  nume: string;
  scor: number;
  justificare: string;
  citate_transcriere: string[];
  manual_override: boolean;
}

export interface ScorArie {
  arie: ArieID;
  nume: string;
  pondere: number;
  scor: number;
  nivel: NivelMaturitate;
}

export interface ScorGlobal {
  scor_total: number;
  nivel: NivelMaturitate;
  scoruri_arii: ScorArie[];
  indicatori_sub_prag: IndicatorID[];
}

// ── AGENT 1: Agent_Qual_CTD ──────────────────────────────

export type CriteriuQualID = "angajati" | "cifra_afaceri" | "disponibilitate" | "buget" | "maturitate";
export type StatusCriteriu = "INDEPLINIT" | "NEINDEPLINIT" | "INFORMATIE_LIPSA";
export type VerdictQual = "VERDE" | "GALBEN" | "ROSU";

export interface CriteriuEvaluat extends ConfidenceInfo {
  id: CriteriuQualID;
  status: StatusCriteriu;
  valoare: number | string | null;
  prag: number | string | null;
  eliminatoriu: boolean;
}

export const PRAGURI_CALIFICARE: Record<CriteriuQualID, { prag: number | string; eliminatoriu: boolean }> = {
  angajati: { prag: 5, eliminatoriu: true },
  cifra_afaceri: { prag: 500000, eliminatoriu: true },
  disponibilitate: { prag: "Da", eliminatoriu: false },
  buget: { prag: "range minim confirmat", eliminatoriu: false },
  maturitate: { prag: "potential real", eliminatoriu: false },
};

export interface AgentQualOutput {
  cui: string;
  denumire: string;
  verdict: VerdictQual;
  confidence: number;
  confidence_level: "HIGH" | "MEDIUM" | "LOW";
  criterii: CriteriuEvaluat[];
  tag_tm: string;
  refs: ACDAReferences;
  metadata: AgentMetadata;
}

// ── AGENT 2: Agent_PreAnaliza ────────────────────────────

export interface MiniBriefSection {
  titlu: string;
  continut: string;
  surse: string[];
  confidence: ConfidenceInfo;
}

export interface AgentPreAnalizaOutput {
  cui: string;
  denumire: string;
  sectiuni: {
    context: MiniBriefSection;
    competitori: MiniBriefSection;
    riscuri: MiniBriefSection;
    oportunitati_ai: MiniBriefSection;
  };
  intrebari_sugerate: string[];
  date_financiare: {
    cifra_afaceri: number | null;
    numar_angajati: number | null;
    anul_referinta: number | null;
    sursa: string;
  };
  refs: ACDAReferences;
  metadata: AgentMetadata;
}

// ── AGENT 3: Agent_CTD ───────────────────────────────────

export interface ProcesIdentificat {
  nume: string;
  descriere: string;
  timp_executie: string | null;
  cost_estimat: number | null;
  grad_blocare: number | null;
  impact_ebit: number | null;
  citat: string | null;
  confidence: ConfidenceInfo;
}

export interface ProblemaIdentificata {
  titlu: string;
  descriere: string;
  impact_financiar: number | null;
  cauza_radacina: string | null;
  indicatori_legati: IndicatorID[];
  citat: string | null;
  confidence: ConfidenceInfo;
}

export interface OportunitateIdentificata {
  titlu: string;
  tip: string;
  impact_ebit_estimat: number | null;
  efort: "S" | "M" | "L" | "XL";
  risc: number;
  citat: string | null;
  confidence: ConfidenceInfo;
}

export interface DateFinanciare {
  ebit_curent: number | null;
  venituri: number | null;
  costuri_operationale: number | null;
  marja_ebit: number | null;
  cost_it: number | null;
  ebit_target: number | null;
  delta_ebit: number | null;
  confidence: ConfidenceInfo;
}

export interface AgentCTDOutput {
  cui: string;
  denumire: string;
  data_call: string;
  transcriere_ref: string;
  indicatori: IndicatorExtras[];
  scor_global: ScorGlobal;
  date_financiare: DateFinanciare;
  procese: ProcesIdentificat[];
  probleme: ProblemaIdentificata[];
  oportunitati: OportunitateIdentificata[];
  refs: ACDAReferences;
  metadata: AgentMetadata;
}

// ── AGENT 4: Agent_Oferta ────────────────────────────────
// Structura comercială: acda.ro/transformare-digitala-2
//   START (750€) → ANALIZĂ (personalizat) → STRATEGIE (personalizat) → SUPERVIZARE (retainer)

export type NivelEngagement =
  | "mini_diagnostic"
  | "diagnostic_sprint"
  | "pachet_transformare"
  | "management_guvernanta";

export type LivrabilPachet =
  | "arhitectura_target"
  | "model_investitional"
  | "kpi_tree"
  | "roadmap_implementare"
  | "criterii_selectie_parteneri"
  | "guvernanta_risc"
  | "plan_adoptie_change";

export interface ProdusOferta {
  nivel: NivelEngagement;
  nume: string;
  pret_eur: number | null;
  tip_pret: "fix" | "personalizat" | "retainer";
  durata_zile: number | null;
  include: string[];
  livrabile_pachet?: LivrabilPachet[];
  recomandat: boolean;
}

export interface AgentOfertaOutput {
  cui: string;
  denumire: string;
  nivel_recomandat: NivelEngagement;
  justificare_recomandare: string;
  produse: ProdusOferta[];
  nota_deducere_mini_diagnostic: boolean;
  sectiuni_text: {
    introducere: string;
    context_client: string;
    abordare_acda: string;
    livrabile: string;
    timeline: string;
    de_ce_acda: string;
    termeni: string;
  };
  refs: ACDAReferences;
  metadata: AgentMetadata;
}

// ── COCKPIT: 12 PAGINI OFICIALE ──────────────────────────
// Sursa de adevăr: ACDA_Platforma_CTD_Viziune_v1.docx

export type StatusPagina = "pre_populat" | "in_review" | "validat" | "skip";

export interface PaginaCockpit {
  numar: number;
  titlu: string;
  titlu_ro: string;
  status: StatusPagina;
  narativa_scqaps: string | null;
  optionala: boolean;
  confidence_summary: { high: number; medium: number; low: number; manual_override: number };
}

export const PAGINI_COCKPIT = [
  { numar: 1,  titlu: "Client Overview",                titlu_ro: "Prezentare Client",                sursa: "Company Profile (ANAF) + transcriere",  optionala: false },
  { numar: 2,  titlu: "EBIT Baseline",                  titlu_ro: "Situatia Financiara",               sursa: "Cifre din call + ANAF",                  optionala: false },
  { numar: 3,  titlu: "Maturitate ACDA",                titlu_ro: "Scor Maturitate (9 indicatori)",    sursa: "Agent_CTD: scor + citat + confidence",   optionala: false },
  { numar: 4,  titlu: "Value Stream Analysis",          titlu_ro: "Analiza Fluxurilor de Valoare",     sursa: "Procese extrase din conversatie",         optionala: false },
  { numar: 5,  titlu: "Problem Framing",                titlu_ro: "Definirea Problemelor",             sursa: "Indicatori sub 3.0 + mentiuni call",     optionala: false },
  { numar: 6,  titlu: "Technology Landscape",           titlu_ro: "Peisajul Tehnologic",               sursa: "Sisteme IT din call + Company Profile",   optionala: false },
  { numar: 7,  titlu: "Opportunity Map",                titlu_ro: "Harta Oportunitatilor",             sursa: "Auto: indicatori + probleme + best practices", optionala: false },
  { numar: 8,  titlu: "Prioritization & Business Case", titlu_ro: "Prioritizare si Caz de Business",   sursa: "Matrice impact vs efort",                optionala: false },
  { numar: 9,  titlu: "Transformation Strategy",        titlu_ro: "Strategia de Transformare",         sursa: "Piloni strategici din initiative",        optionala: false },
  { numar: 10, titlu: "Implementation Roadmap",         titlu_ro: "Planul de Implementare",            sursa: "4 faze ACDA + timeline + Regula 1:1",    optionala: false },
  { numar: 11, titlu: "Preview Raport",                 titlu_ro: "Previzualizare Raport",             sursa: "15 sectiuni compose din pag. 1-10",      optionala: false },
  { numar: 12, titlu: "Chestionar Client",              titlu_ro: "Chestionar Client (optional)",      sursa: "Audio → Whisper → interpretare",         optionala: true },
] as const;

// ── STATUS PROIECT (în română) ───────────────────────────

export type StatusProiect =
  | "CIORNA"
  | "VALIDARE_CONSULTANT"
  | "ASTEAPTA_APROBARE"
  | "APROBAT"
  | "RESPINS"
  | "REVIEW_OPUS"
  | "FINALIZAT"
  | "ARHIVAT";

export const STATUS_PROIECT_META: Record<StatusProiect, { label: string; descriere: string; urmator: StatusProiect | null }> = {
  CIORNA:               { label: "Ciorna",                       descriere: "Proiectul e in lucru. Consultantul valideaza cockpitul.",                      urmator: "VALIDARE_CONSULTANT" },
  VALIDARE_CONSULTANT:  { label: "Asteapta validare consultant", descriere: "Cockpit complet. Consultantul verifica totul inainte de a trimite.",           urmator: "ASTEAPTA_APROBARE" },
  ASTEAPTA_APROBARE:    { label: "Asteapta aprobare Cristian",   descriere: "Trimis la Cristian pe Telegram. Aproba, ajusteaza sau respinge.",              urmator: "APROBAT" },
  APROBAT:              { label: "Aprobat",                      descriere: "Cristian a aprobat. Merge la review automat Claude Opus.",                     urmator: "REVIEW_OPUS" },
  RESPINS:              { label: "Respins",                      descriere: "Cristian a respins. Se intoarce la consultant pentru corectii.",               urmator: "CIORNA" },
  REVIEW_OPUS:          { label: "In verificare AI",             descriere: "Claude Opus verifica coerenta narativelor, consistenta datelor, tonul.",       urmator: "FINALIZAT" },
  FINALIZAT:            { label: "Finalizat",                    descriere: "Raport generat, PDF creat, urcat in Drive. Gata de livrat clientului.",        urmator: "ARHIVAT" },
  ARHIVAT:              { label: "Arhivat",                      descriere: "Proiect incheiat. Date pastrate pentru referinta si benchmark.",               urmator: null },
};

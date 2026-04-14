// ============================================================
// ACDA Mock Data v1.1: CloudServe SRL — Client SaaS B2B fictiv
// Aliniat la structura comerciala acda.ro/transformare-digitala-2
// ============================================================

import type {
  AgentQualOutput, AgentPreAnalizaOutput,
  AgentCTDOutput, AgentOfertaOutput,
  IndicatorExtras,
} from "../contracts/agent-contracts";

// ── AGENT_QUAL: Calificare ───────────────────────────────

export const mockQualOutput: AgentQualOutput = {
  cui: "44521837",
  denumire: "CloudServe SRL",
  verdict: "VERDE",
  confidence: 0.92,
  confidence_level: "HIGH",
  criterii: [
    { id: "angajati", status: "INDEPLINIT", valoare: 68, prag: 5, eliminatoriu: true, confidence: 0.95, confidence_level: "HIGH", data_source: "openapi", data_completeness: "complet" },
    { id: "cifra_afaceri", status: "INDEPLINIT", valoare: 4200000, prag: 500000, eliminatoriu: true, confidence: 0.95, confidence_level: "HIGH", data_source: "anaf", data_completeness: "complet" },
    { id: "disponibilitate", status: "INDEPLINIT", valoare: "Da, Q3 2026", prag: "Da", eliminatoriu: false, confidence: 0.8, confidence_level: "HIGH", data_source: "conversatie_telegram", data_completeness: "complet" },
    { id: "buget", status: "INDEPLINIT", valoare: "8000-15000 EUR", prag: "range minim confirmat", eliminatoriu: false, confidence: 0.65, confidence_level: "MEDIUM", data_source: "conversatie_telegram", data_completeness: "partial" },
    { id: "maturitate", status: "INDEPLINIT", valoare: 42, prag: "potential real", eliminatoriu: false, confidence: 0.7, confidence_level: "MEDIUM", data_source: "quick_scan", data_completeness: "partial" },
  ],
  tag_tm: "ctd-qualified-verde",
  refs: { palace_ref: "dept_ctd/2026-04-10/qual_ctd_44521837", gdrive_ref: null, notion_ref: null },
  metadata: { model: "qwen3.5:35b-a3b", durata_procesare_sec: 12, timestamp: "2026-04-10T09:15:00Z", agent_version: "1.0.0" },
};

// ── AGENT_PREANALIZA: Mini-Brief ─────────────────────────

export const mockPreAnalizaOutput: AgentPreAnalizaOutput = {
  cui: "44521837",
  denumire: "CloudServe SRL",
  sectiuni: {
    context: {
      titlu: "Context companie",
      continut: "CloudServe SRL este un furnizor SaaS B2B din Cluj-Napoca, fondat in 2019, specializat pe CRM pentru IMM-uri din Europa de Est. 68 angajati, CA 4.2M RON in 2025. Produs principal: CloudCRM, platforma multi-tenant cu ~320 clienti activi. Echipa tech: 42 persoane (62%).",
      surse: ["openapi.ro", "anaf.ro", "cloudserve.ro", "linkedin.com"],
      confidence: { confidence: 0.9, confidence_level: "HIGH", data_source: "openapi+anaf+web", data_completeness: "complet" },
    },
    competitori: {
      titlu: "Competitori principali",
      continut: "Piata CRM din CEE dominata de Salesforce, HubSpot, Pipedrive. CloudServe se diferentiaza prin localizare (RO/HU/PL), pricing agresiv (50% sub Salesforce), integratii fiscale locale (e-Factura, SPV). Risc: HubSpot a lansat tier gratuit pentru IMM-uri in CEE.",
      surse: ["brave_search", "g2.com", "capterra.com"],
      confidence: { confidence: 0.75, confidence_level: "MEDIUM", data_source: "brave_search", data_completeness: "partial" },
    },
    riscuri: {
      titlu: "Riscuri identificate",
      continut: "1. Dependenta de un singur produs (CloudCRM = 94% venituri). 2. Churn rate crescut Q4 2025 (3.2% la 5.1%). 3. Tech debt: monolit, migrare microservicii neinceputa. 4. Zero AI/ML. 5. Management subtire: CEO acopera si CTO.",
      surse: ["brave_search", "linkedin.com"],
      confidence: { confidence: 0.65, confidence_level: "MEDIUM", data_source: "brave_search+web", data_completeness: "partial" },
    },
    oportunitati_ai: {
      titlu: "Oportunitati AI / digitalizare",
      continut: "1. AI lead scoring pentru clientii CloudCRM. 2. Chatbot AI support tier-1 (reducere 30-40% tickete). 3. Predictive churn analysis. 4. Automatizare onboarding (5 zile la 1 zi). 5. Data pipeline pentru analytics avansate.",
      surse: ["analiza_interna", "brave_search"],
      confidence: { confidence: 0.6, confidence_level: "MEDIUM", data_source: "brave_search+inferenta", data_completeness: "partial" },
    },
  },
  intrebari_sugerate: [
    "Ce procent din venituri provin din CloudCRM versus alte servicii?",
    "Cum masurati succesul initiativelor de digitalizare — aveti KPI-uri legate de EBIT?",
    "Care e stadiul migrarii la microservicii si cat din bugetul tech e alocat pentru adoptie/training?",
  ],
  date_financiare: { cifra_afaceri: 4200000, numar_angajati: 68, anul_referinta: 2025, sursa: "anaf+openapi" },
  refs: { palace_ref: "dept_ctd/2026-04-10/preanaliza_44521837", gdrive_ref: null, notion_ref: null },
  metadata: { model: "qwen3.5:35b-a3b", durata_procesare_sec: 38, timestamp: "2026-04-10T09:20:00Z", agent_version: "1.0.0" },
};

// ── AGENT_CTD: Extractie din transcriere ─────────────────

const mockIndicatori: IndicatorExtras[] = [
  { id: "O1_regula_1_1", nume: "Regula 1:1", scor: 1.5, justificare: "Buget adoptie aproape inexistent. 95% din buget merge pe dezvoltare si infrastructura.", citate_transcriere: ["Pe training nu avem un buget separat.", "Am cheltuit 2-3000 EUR pe cursuri, versus 180.000 pe infrastructura cloud."], manual_override: false, confidence: 0.85, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "O2_densitatea_talentului", nume: "Densitatea Talentului", scor: 3.5, justificare: "Raport bun executanti/manageri (~6:1). Echipa competenta dar fara experienta AI/ML.", citate_transcriere: ["Avem 6 echipe de 6-7 developeri, fiecare cu un team lead.", "Pe AI nu avem pe nimeni specializat."], manual_override: false, confidence: 0.8, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "O3_riscul_instruire", nume: "Riscul de Instruire", scor: 2.0, justificare: "Nu exista program formal de training. Risc ridicat: echipa fara competente AI/ML.", citate_transcriere: ["Stiu ca ar trebui sa investim in upskilling, dar nu am avut timp."], manual_override: false, confidence: 0.75, confidence_level: "MEDIUM", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "T1_data_products", nume: "Data Products", scor: 2.0, justificare: "Date exista (320 clienti) dar nu sunt structurate ca produse. Un singur PostgreSQL monolitic.", citate_transcriere: ["Avem tone de date, dar sunt toate intr-un singur database.", "Analytics-ul e un Metabase pe care il folosesc 3 oameni."], manual_override: false, confidence: 0.85, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "T2_api_first", nume: "API-First", scor: 3.0, justificare: "CloudCRM are API public REST, ~40% functionalitati expuse. Sistemele interne nu au API-uri.", citate_transcriere: ["Avem un API public. Dar intern, totul e manual."], manual_override: false, confidence: 0.8, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "T3_assetizare", nume: "Assetizare", scor: 1.5, justificare: "Cod monolitic, nimic reutilizabil. Nu exista biblioteci interne sau microservicii.", citate_transcriere: ["E un monolit mare.", "Am vorbit de microservicii de 2 ani, dar tot amanam."], manual_override: false, confidence: 0.9, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "S1_focusul_ebit", nume: "Focusul EBIT", scor: 1.0, justificare: "Nicio initiativa cu target EBIT. CEO gandeste in MRR si headcount, nu in profitabilitate.", citate_transcriere: ["Ne uitam la MRR si cati clienti noi aducem. EBIT... nu monitorizam specific.", "CFO-ul vine o data pe luna si ne spune cam pe unde suntem."], manual_override: false, confidence: 0.9, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "S2_validarea_capstone", nume: "Validarea Capstone", scor: 1.0, justificare: "Zero piloturi structurate. Nu exista concept de capstone sau ROI tracking.", citate_transcriere: ["Nu am facut niciun proiect pilot structurat. Nu le masuram formal."], manual_override: false, confidence: 0.85, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
  { id: "S3_trustworthy_ai", nume: "Trustworthy AI", scor: 0.5, justificare: "Zero AI governance. Normal — nu folosesc AI inca.", citate_transcriere: ["AI governance? Nu, nu avem. Nici nu folosim AI."], manual_override: false, confidence: 0.95, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" },
];

export const mockCTDOutput: AgentCTDOutput = {
  cui: "44521837",
  denumire: "CloudServe SRL",
  data_call: "2026-04-15",
  transcriere_ref: "CTD/CloudServe SRL/transcriere_2026-04-15.txt",
  indicatori: mockIndicatori,
  scor_global: {
    scor_total: 1.67,
    nivel: "NECONFORM",
    scoruri_arii: [
      { arie: "oameni_adoptie", nume: "Oameni & Adoptie", pondere: 0.25, scor: 2.33, nivel: "NECONFORM" },
      { arie: "tehnologie_date", nume: "Tehnologie & Date", pondere: 0.35, scor: 2.17, nivel: "NECONFORM" },
      { arie: "strategie_roi", nume: "Strategie & ROI", pondere: 0.4, scor: 0.83, nivel: "NECONFORM" },
    ],
    indicatori_sub_prag: ["O1_regula_1_1", "O3_riscul_instruire", "T1_data_products", "T3_assetizare", "S1_focusul_ebit", "S2_validarea_capstone", "S3_trustworthy_ai"],
  },
  date_financiare: {
    ebit_curent: 380000, venituri: 4200000, costuri_operationale: 3820000, marja_ebit: 9.05,
    cost_it: 1450000, ebit_target: 456000, delta_ebit: 76000,
    confidence: { confidence: 0.7, confidence_level: "MEDIUM", data_source: "transcriere_whisper+anaf", data_completeness: "partial" },
  },
  procese: [
    { nume: "Onboarding client nou", descriere: "Manual, 5 zile, copy-paste.", timp_executie: "5 zile", cost_estimat: 2500, grad_blocare: 4, impact_ebit: 45000, citat: "Onboarding-ul dureaza cam o saptamana. E mult manual.", confidence: { confidence: 0.8, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" } },
    { nume: "Support tier-1", descriere: "4 agenti, 60% intrebari repetitive.", timp_executie: "continuu", cost_estimat: 8000, grad_blocare: 3, impact_ebit: 35000, citat: "60% din tickete sunt aceleasi 20 de intrebari.", confidence: { confidence: 0.85, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" } },
    { nume: "Raportare financiara", descriere: "CFO extern, 3 surse, 3 zile/luna.", timp_executie: "3 zile/luna", cost_estimat: 3000, grad_blocare: 2, impact_ebit: 15000, citat: "CFO-ul ia date din Stripe, contabilitate, Metabase, si face un Excel.", confidence: { confidence: 0.75, confidence_level: "MEDIUM", data_source: "transcriere_whisper", data_completeness: "partial" } },
  ],
  probleme: [
    { titlu: "Churn rate in crestere (3.2% la 5.1%)", descriere: "Rata de abandon crescuta Q4 2025. Cauza: lipsa features AI.", impact_financiar: 210000, cauza_radacina: "Lipsa capabilitatilor AI fata de competitori", indicatori_legati: ["S1_focusul_ebit", "T1_data_products"], citat: "Am pierdut 15 clienti in Q4 care au migrat la HubSpot.", confidence: { confidence: 0.85, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" } },
    { titlu: "Tech debt — monolit blocat", descriere: "Arhitectura monolitica impiedica lansarea de features noi.", impact_financiar: 120000, cauza_radacina: "Decizie arhitecturala din 2019 nerevisitata", indicatori_legati: ["T3_assetizare", "T2_api_first"], citat: "Fiecare feature noua dureaza de 3 ori mai mult din cauza monolitului.", confidence: { confidence: 0.9, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" } },
    { titlu: "Zero competente AI in echipa", descriere: "Niciun membru cu experienta AI/ML. Recrutarea a esuat.", impact_financiar: null, cauza_radacina: "Piata competitiva talent AI, salarizare sub piata", indicatori_legati: ["O2_densitatea_talentului", "O3_riscul_instruire"], citat: "Am postat 3 joburi de ML engineer anul trecut. Zero aplicanti.", confidence: { confidence: 0.8, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" } },
  ],
  oportunitati: [
    { titlu: "AI lead scoring pentru CloudCRM", tip: "AI", impact_ebit_estimat: 85000, efort: "L", risc: 3, citat: "Clientii ne tot intreaba daca avem lead scoring automat.", confidence: { confidence: 0.7, confidence_level: "MEDIUM", data_source: "transcriere_whisper", data_completeness: "partial" } },
    { titlu: "Chatbot AI support tier-1", tip: "automatizare", impact_ebit_estimat: 35000, efort: "M", risc: 2, citat: "60% din tickete sunt aceleasi 20 de intrebari.", confidence: { confidence: 0.85, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" } },
    { titlu: "Automatizare onboarding (5 zile la 1 zi)", tip: "automatizare", impact_ebit_estimat: 45000, efort: "M", risc: 2, citat: "Onboarding-ul dureaza cam o saptamana.", confidence: { confidence: 0.8, confidence_level: "HIGH", data_source: "transcriere_whisper", data_completeness: "complet" } },
    { titlu: "Predictive churn analysis", tip: "AI", impact_ebit_estimat: 65000, efort: "L", risc: 3, citat: "Am pierdut 15 clienti in Q4. Nu am vazut-o venind.", confidence: { confidence: 0.65, confidence_level: "MEDIUM", data_source: "transcriere_whisper", data_completeness: "partial" } },
  ],
  refs: { palace_ref: "dept_ctd/2026-04-15/ctd_analysis_44521837", gdrive_ref: "CTD/CloudServe SRL/raport_maturitate_2026-04-15.md", notion_ref: "task-cowork-ctd-44521837" },
  metadata: { model: "qwen3.5:35b-a3b", durata_procesare_sec: 127, timestamp: "2026-04-15T14:30:00Z", agent_version: "1.0.0" },
};

// ── AGENT_OFERTA: Oferta comerciala ──────────────────────
// Structura reala ACDA: START → ANALIZA → STRATEGIE → SUPERVIZARE

export const mockOfertaOutput: AgentOfertaOutput = {
  cui: "44521837",
  denumire: "CloudServe SRL",
  nivel_recomandat: "pachet_transformare",
  justificare_recomandare: "Companie cu 68 angajati, CA 4.2M RON, probleme structurale multiple (churn crescut, tech debt, zero AI, management subtire). Scor maturitate 1.67/5 — NECONFORM pe toate cele 3 arii. Necesita Pachet de Transformare complet cu Arhitectura target, Roadmap si Guvernanta AI.",
  nota_deducere_mini_diagnostic: true,
  produse: [
    {
      nivel: "mini_diagnostic",
      nume: "Mini-Diagnostic Executiv",
      pret_eur: 750,
      tip_pret: "fix",
      durata_zile: 1,
      include: [
        "Evaluare rapida a situatiei curente",
        "Identificarea riscurilor majore",
        "Decizii rapide pe baza datelor disponibile",
      ],
      recomandat: false,
    },
    {
      nivel: "diagnostic_sprint",
      nume: "Diagnostic Sprint",
      pret_eur: null,
      tip_pret: "personalizat",
      durata_zile: 5,
      include: [
        "5 zile de focus total",
        "Analiza detaliata procese",
        "Calcul ROI si fezabilitate",
        "Scor maturitate ACDA complet (9 indicatori)",
        "Identificare blocaje ascunse",
      ],
      recomandat: false,
    },
    {
      nivel: "pachet_transformare",
      nume: "Pachet de Transformare",
      pret_eur: null,
      tip_pret: "personalizat",
      durata_zile: null,
      include: [
        "Master Plan si Roadmap",
        "Arhitectura Strategica",
        "Design Automatizare si AI",
        "Model investitional CAPEX/OPEX cu ROI",
        "KPI Tree — cum masuram succesul",
        "Criterii selectie parteneri si RFP readiness",
        "Guvernanta si Risc (security, compliance, AI ethics)",
        "Plan de adoptie si Change management",
      ],
      livrabile_pachet: [
        "arhitectura_target",
        "model_investitional",
        "kpi_tree",
        "roadmap_implementare",
        "criterii_selectie_parteneri",
        "guvernanta_risc",
        "plan_adoptie_change",
      ],
      recomandat: true,
    },
    {
      nivel: "management_guvernanta",
      nume: "Management si Guvernanta",
      pret_eur: null,
      tip_pret: "retainer",
      durata_zile: null,
      include: [
        "Monitorizare executie",
        "Management furnizori",
        "Guvernanta proiect",
        "Asigurare ca furnizorii executa corect",
      ],
      recomandat: false,
    },
  ],
  sectiuni_text: {
    introducere: "Stimata echipa CloudServe, va multumim pentru discutia din 15 Aprilie. Transformarea digitala fara arhitectura este doar cheltuiala. ACDA proiecteaza arhitectura completa folosind un sistem proprietar de modelare strategica.",
    context_client: "CloudServe SRL opereaza pe o piata CRM competitiva din CEE cu 68 de angajati si o CA de 4.2M RON. Scorul de maturitate digitala ACDA este 1.67 din 5 (NECONFORM), cu gap-uri critice pe toate cele 3 arii: Oameni, Tehnologie si Strategie.",
    abordare_acda: "ACDA nu face implementare de cod. Proiectam arhitectura si roadmap-ul, apoi supervizam implementarea disciplinata. Tratam AI-ul ca pe un instrument de transformare care necesita rigoare si ROI clar masurabil.",
    livrabile: "Pachetul de Transformare include 7 livrabile: Arhitectura target, Model investitional (CAPEX/OPEX/ROI), KPI Tree, Roadmap implementare pe trimestre, Criterii selectie parteneri, Guvernanta si Risc AI, Plan adoptie si Change management.",
    timeline: "Faza 1 (luna 1): Diagnostic Sprint — analiza profunda, scor maturitate, ROI. Faza 2 (luna 2-3): Pachet de Transformare — arhitectura, roadmap, model investitional. Faza 3 (optional, retainer): Management si Guvernanta — supervizare implementare.",
    de_ce_acda: "GPS-ul, nu soferul. ACDA arata drumul, riscurile si scurtaturile. 600+ clienti, 75M+ EUR finantari atrase, 95% rata de succes. Anti-Hype AI Approach: fara povesti SF, doar ROI masurabil.",
    termeni: "Mini-Diagnostic: 750 EUR (se deduce integral din Diagnostic Sprint). Diagnostic Sprint si Pachet de Transformare: oferta personalizata in functie de complexitate. Numar limitat de proiecte active lunar.",
  },
  refs: { palace_ref: "dept_ctd/2026-04-16/oferta_44521837", gdrive_ref: "CTD/CloudServe SRL/oferta_2026-04-16.docx", notion_ref: null },
  metadata: { model: "qwen3.5:35b-a3b", durata_procesare_sec: 65, timestamp: "2026-04-16T10:00:00Z", agent_version: "1.0.0" },
};

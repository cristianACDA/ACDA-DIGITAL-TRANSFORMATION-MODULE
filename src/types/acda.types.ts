import type { MATURITY_INDICATORS, SCORE_THRESHOLDS } from "../constants/acda.constants";
import type { StatusProiect } from "../contracts/agent-contracts";

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * Statusul proiectului — unificat cu contractele agenţilor (D-CTD-01).
 * Valori: CIORNA, VALIDARE_CONSULTANT, ASTEAPTA_APROBARE, APROBAT, RESPINS,
 * REVIEW_OPUS, FINALIZAT, ARHIVAT.
 */
export type ProjectStatus = StatusProiect;

export enum MaturityLevel {
  Neconform  = "NECONFORM",
  InProgres  = "IN_PROGRES",
  Conform    = "CONFORM",
  Lider      = "LIDER",
}

export enum OriginSource {
  MaturityGap        = "maturity_gap",
  ProcessBottleneck  = "process_bottleneck",
  TechnologyGap      = "technology_gap",
  ConsultantManual   = "consultant_manual",
  AiGenerated        = "ai_generated",
}

export enum EffortSize {
  S  = "S",
  M  = "M",
  L  = "L",
  XL = "XL",
}

// ─── Derived types from constants ─────────────────────────────────────────────

export type IndicatorCode = typeof MATURITY_INDICATORS[number]["id"];
export type ScoreThresholdKey = keyof typeof SCORE_THRESHOLDS;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  company_name: string;
  cui?: string;
  industry?: string;
  country?: string;
  company_size?: string;
  employee_count?: number;
  annual_revenue?: number;
  main_contact_name?: string;
  main_contact_role?: string;
  main_contact_email?: string;
  main_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  status: ProjectStatus;
  current_stage?: string;
  methodology_version: string;
  completion_progress?: number;
  start_date?: string;
  target_end_date?: string;
  consultant_owner?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessContext {
  id: string;
  project_id: string;
  business_model?: string;
  main_products_services?: string;
  strategic_objectives?: string;
  main_growth_constraints?: string;
  main_operational_constraints?: string;
  key_markets?: string;
  key_customer_segments?: string;
  competitive_context?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EBITBaseline {
  id: string;
  project_id: string;
  annual_revenue?: number;
  operational_costs?: number;
  ebit_current?: number;
  ebit_margin_current?: number;
  ebit_target?: number;
  ebit_target_delta_percent?: number;
  it_spend_current?: number;
  change_management_spend_current?: number;
  rule_1_to_1_ratio?: number;
  financial_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaturityIndicator {
  id: string;
  project_id: string;
  indicator_code: IndicatorCode;
  indicator_name?: string;
  area?: string;
  raw_input_json?: string;
  score?: number;
  calculation_method?: string;
  consultant_comment?: string;
  // F2-T1 supliment: confidence & data_source aliniate cu contractul agenți.
  confidence?: number;
  confidence_level?: "HIGH" | "MEDIUM" | "LOW";
  data_source?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaturityScore {
  id: string;
  project_id: string;
  people_adoption_score?: number;
  technology_data_score?: number;
  strategy_roi_score?: number;
  overall_score?: number;
  maturity_level?: MaturityLevel;
  main_gaps_summary?: string;
  created_at: string;
  updated_at: string;
}

/** Proces operaţional — aliniat cu tabelul Process (F4). Campuri D-CTD-02. */
export interface Process {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  time_execution?: string;
  cost_estimated?: number;
  blocking_score?: number;         // 1-5
  ebit_impact?: number;
  citation?: string;
  confidence?: number;
  confidence_level?: "HIGH" | "MEDIUM" | "LOW";
  data_source?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValueStream {
  id: string;
  project_id: string;
  process_id: string;
  current_flow_description?: string;
  bottleneck_description?: string;
  waste_type?: string;
  blocking_score?: number;
  estimated_time_loss?: number;
  estimated_cost_loss?: number;
  estimated_ebit_impact?: number;
  improvement_potential?: number;
  created_at: string;
  updated_at: string;
}

/** Problemă identificată. Tabel Problem (F4). */
export interface ProblemStatement {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  financial_impact?: number;
  root_cause?: string;
  /** JSON stringified: array de IndicatorCode. */
  linked_indicators?: string;
  citation?: string;
  confidence?: number;
  confidence_level?: "HIGH" | "MEDIUM" | "LOW";
  data_source?: string | null;
  created_at: string;
  updated_at: string;
}

/** Oportunitate identificată. Tabel Opportunity (F4). */
export interface Opportunity {
  id: string;
  project_id: string;
  title: string;
  type?: string;                   // AI / automatizare / integrare / strategie
  ebit_impact_estimated?: number;
  effort?: EffortSize;
  risk?: number;                   // 1-5
  citation?: string;
  confidence?: number;
  confidence_level?: "HIGH" | "MEDIUM" | "LOW";
  data_source?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessCase {
  id: string;
  project_id: string;
  opportunity_id: string;
  estimated_cost?: number;
  estimated_benefit?: number;
  estimated_ebit_contribution?: number;
  roi_percent?: number;
  payback_months?: number;
  confidence_level?: "HIGH" | "MEDIUM" | "LOW";
  assumptions?: string;
  created_at: string;
  updated_at: string;
}

export interface Initiative {
  id: string;
  project_id: string;
  opportunity_id: string;
  title: string;
  strategic_objective?: string;
  priority_rank?: number;
  decision_status?: string;
  estimated_cost?: number;
  estimated_ebit_contribution?: number;
  timeline_bucket?: string;
  owner_role?: string;
  pilot_candidate?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StrategyPillar {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_outcome?: string;
  linked_ebit_objective?: string;
  priority_order?: number;
  created_at: string;
  updated_at: string;
}

export interface RoadmapPhase {
  id: string;
  project_id: string;
  phase_name: string;
  phase_order?: number;
  duration_weeks?: number;
  budget_technology?: number;
  budget_adoption?: number;
  rule_1_to_1_status?: string;
  main_goal?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportSection {
  id: string;
  project_id: string;
  section_code: string;
  section_title?: string;
  content_json?: string;
  completion_status?: string;
  generated_at?: string;
  updated_at: string;
}

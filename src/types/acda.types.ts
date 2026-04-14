import type { MATURITY_INDICATORS, SCORE_THRESHOLDS } from "../constants/acda.constants";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ProjectStatus {
  Draft     = "draft",
  Active    = "active",
  Review    = "review",
  Completed = "completed",
  Archived  = "archived",
}

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

export interface Process {
  id: string;
  project_id: string;
  name: string;
  department?: string;
  owner_name?: string;
  description?: string;
  automation_level?: number;
  execution_frequency?: string;
  avg_execution_time?: number;
  estimated_cost_per_cycle?: number;
  pain_level?: number;
  criticality?: number;
  linked_ebit_impact?: number;
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

export interface ProblemStatement {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  root_cause?: string;
  estimated_financial_impact?: number;
  estimated_ebit_impact?: number;
  severity?: number;
  linked_indicator_code?: IndicatorCode;
  linked_process_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  type?: string;
  origin_source?: OriginSource;
  linked_problem_id?: string;
  linked_process_id?: string;
  estimated_ebit_impact?: number;
  estimated_operational_impact?: number;
  estimated_effort?: EffortSize;
  estimated_risk?: number;
  priority_hint?: number;
  status?: string;
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
  confidence_level?: number;
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

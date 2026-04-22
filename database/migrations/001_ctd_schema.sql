-- ACDA CTD — PostgreSQL schema (acda_obs on DGX)
-- Migrare SQLite → PG cu rebrand ctd_* snake_case.
-- Idempotent: CREATE TABLE IF NOT EXISTS. Safe rerun.
-- Timestamps rămân TEXT (ISO 8601) pentru compatibilitate frontend (string roundtrip).

BEGIN;

CREATE TABLE IF NOT EXISTS ctd_clients (
  id                   TEXT PRIMARY KEY,
  company_name         TEXT NOT NULL,
  cui                  TEXT,
  industry             TEXT,
  country              TEXT,
  company_size         TEXT,
  employee_count       INTEGER,
  annual_revenue       DOUBLE PRECISION,
  main_contact_name    TEXT,
  main_contact_role    TEXT,
  main_contact_email   TEXT,
  main_contact_phone   TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ctd_projects (
  id                         TEXT PRIMARY KEY,
  client_id                  TEXT NOT NULL REFERENCES ctd_clients(id) ON DELETE CASCADE,
  name                       TEXT NOT NULL,
  status                     TEXT NOT NULL,
  current_stage              TEXT,
  methodology_version        TEXT NOT NULL,
  completion_progress        DOUBLE PRECISION,
  start_date                 TEXT,
  target_end_date            TEXT,
  consultant_owner           TEXT,
  validation_time_seconds    INTEGER,
  validated_at               TEXT,
  created_at                 TEXT NOT NULL,
  updated_at                 TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ctd_ebit_baselines (
  id                              TEXT PRIMARY KEY,
  project_id                      TEXT NOT NULL UNIQUE REFERENCES ctd_projects(id) ON DELETE CASCADE,
  annual_revenue                  DOUBLE PRECISION,
  operational_costs               DOUBLE PRECISION,
  ebit_current                    DOUBLE PRECISION,
  ebit_margin_current             DOUBLE PRECISION,
  ebit_target                     DOUBLE PRECISION,
  ebit_target_delta_percent       DOUBLE PRECISION,
  it_spend_current                DOUBLE PRECISION,
  change_management_spend_current DOUBLE PRECISION,
  rule_1_to_1_ratio               DOUBLE PRECISION,
  financial_notes                 TEXT,
  confidence                      DOUBLE PRECISION,
  confidence_level                TEXT,
  data_source                     TEXT,
  created_at                      TEXT NOT NULL,
  updated_at                      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ctd_maturity_indicators (
  id                   TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES ctd_projects(id) ON DELETE CASCADE,
  indicator_code       TEXT NOT NULL,
  indicator_name       TEXT,
  area                 TEXT,
  raw_input_json       TEXT,
  score                DOUBLE PRECISION,
  calculation_method   TEXT,
  consultant_comment   TEXT,
  confidence           DOUBLE PRECISION,
  confidence_level     TEXT,
  data_source          TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  UNIQUE (project_id, indicator_code)
);

CREATE TABLE IF NOT EXISTS ctd_maturity_scores (
  id                       TEXT PRIMARY KEY,
  project_id               TEXT NOT NULL UNIQUE REFERENCES ctd_projects(id) ON DELETE CASCADE,
  people_adoption_score    DOUBLE PRECISION,
  technology_data_score    DOUBLE PRECISION,
  strategy_roi_score       DOUBLE PRECISION,
  overall_score            DOUBLE PRECISION,
  maturity_level           TEXT,
  main_gaps_summary        TEXT,
  confidence               DOUBLE PRECISION,
  confidence_level         TEXT,
  data_source              TEXT,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ctd_processes (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL REFERENCES ctd_projects(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  time_execution     TEXT,
  cost_estimated     DOUBLE PRECISION,
  blocking_score     INTEGER,
  ebit_impact        DOUBLE PRECISION,
  citation           TEXT,
  confidence         DOUBLE PRECISION,
  confidence_level   TEXT,
  data_source        TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ctd_problems (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL REFERENCES ctd_projects(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  financial_impact   DOUBLE PRECISION,
  root_cause         TEXT,
  linked_indicators  TEXT,
  citation           TEXT,
  confidence         DOUBLE PRECISION,
  confidence_level   TEXT,
  data_source        TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ctd_opportunities (
  id                      TEXT PRIMARY KEY,
  project_id              TEXT NOT NULL REFERENCES ctd_projects(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  type                    TEXT,
  ebit_impact_estimated   DOUBLE PRECISION,
  effort                  TEXT,
  risk                    INTEGER,
  citation                TEXT,
  confidence              DOUBLE PRECISION,
  confidence_level        TEXT,
  data_source             TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

-- Index-uri pe FK pentru query perf la scale (sute+ proiecte).
CREATE INDEX IF NOT EXISTS idx_ctd_projects_client             ON ctd_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_ctd_ebit_baselines_project      ON ctd_ebit_baselines(project_id);
CREATE INDEX IF NOT EXISTS idx_ctd_maturity_indicators_project ON ctd_maturity_indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_ctd_maturity_scores_project     ON ctd_maturity_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_ctd_processes_project           ON ctd_processes(project_id);
CREATE INDEX IF NOT EXISTS idx_ctd_problems_project            ON ctd_problems(project_id);
CREATE INDEX IF NOT EXISTS idx_ctd_opportunities_project       ON ctd_opportunities(project_id);

COMMIT;

-- ACDA Digital Transformation Module — Schema F1-T1
-- Convenția D-CTD-02: confidence, confidence_level, data_source pe entități AI-fed.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Client (
  id                   TEXT PRIMARY KEY,
  company_name         TEXT NOT NULL,
  cui                  TEXT,
  industry             TEXT,
  country              TEXT,
  company_size         TEXT,
  employee_count       INTEGER,
  annual_revenue       REAL,
  main_contact_name    TEXT,
  main_contact_role    TEXT,
  main_contact_email   TEXT,
  main_contact_phone   TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Project (
  id                         TEXT PRIMARY KEY,
  client_id                  TEXT NOT NULL REFERENCES Client(id) ON DELETE CASCADE,
  name                       TEXT NOT NULL,
  status                     TEXT NOT NULL,
  current_stage              TEXT,
  methodology_version        TEXT NOT NULL,
  completion_progress        REAL,
  start_date                 TEXT,
  target_end_date            TEXT,
  consultant_owner           TEXT,
  validation_time_seconds    INTEGER,
  validated_at               TEXT,
  created_at                 TEXT NOT NULL,
  updated_at                 TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS EBITBaseline (
  id                              TEXT PRIMARY KEY,
  project_id                      TEXT NOT NULL UNIQUE REFERENCES Project(id) ON DELETE CASCADE,
  annual_revenue                  REAL,
  operational_costs               REAL,
  ebit_current                    REAL,
  ebit_margin_current             REAL,
  ebit_target                     REAL,
  ebit_target_delta_percent       REAL,
  it_spend_current                REAL,
  change_management_spend_current REAL,
  rule_1_to_1_ratio               REAL,
  financial_notes                 TEXT,
  confidence                      REAL,
  confidence_level                TEXT,
  data_source                     TEXT,
  created_at                      TEXT NOT NULL,
  updated_at                      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS MaturityIndicator (
  id                   TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
  indicator_code       TEXT NOT NULL,
  indicator_name       TEXT,
  area                 TEXT,
  raw_input_json       TEXT,
  score                REAL,
  calculation_method   TEXT,
  consultant_comment   TEXT,
  confidence           REAL,
  confidence_level     TEXT,
  data_source          TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  UNIQUE(project_id, indicator_code)
);

-- Process, Problem, Opportunity — date operaţionale per proiect.
-- Adăugate în F4 pentru persistenţă cockpit pag. 4/5/7. Confidence D-CTD-02.

CREATE TABLE IF NOT EXISTS Process (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  time_execution     TEXT,
  cost_estimated     REAL,
  blocking_score     INTEGER,
  ebit_impact        REAL,
  citation           TEXT,
  confidence         REAL,
  confidence_level   TEXT,
  data_source        TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Problem (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  financial_impact   REAL,
  root_cause         TEXT,
  linked_indicators  TEXT,
  citation           TEXT,
  confidence         REAL,
  confidence_level   TEXT,
  data_source        TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Opportunity (
  id                      TEXT PRIMARY KEY,
  project_id              TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  type                    TEXT,
  ebit_impact_estimated   REAL,
  effort                  TEXT,
  risk                    INTEGER,
  citation                TEXT,
  confidence              REAL,
  confidence_level        TEXT,
  data_source             TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS MaturityScore (
  id                       TEXT PRIMARY KEY,
  project_id               TEXT NOT NULL UNIQUE REFERENCES Project(id) ON DELETE CASCADE,
  people_adoption_score    REAL,
  technology_data_score    REAL,
  strategy_roi_score       REAL,
  overall_score            REAL,
  maturity_level           TEXT,
  main_gaps_summary        TEXT,
  confidence               REAL,
  confidence_level         TEXT,
  data_source              TEXT,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

-- 011_frontier.sql — Frontier tracking + verdict bypass.
-- PostgreSQL. Aditiv pe ctd_projects, idempotent (ADD COLUMN IF NOT EXISTS).
-- Zero modificare distructivă a schemei existente (001). Bloc rezervat: 011 (frontier).
-- Sursă: TE-CTD-FRONTIER-SCHEMA-001 v1.1 + BRIEF_Frontier_branch003.

-- ── Tracking frontier (7 coloane) ────────────────────────────────────────────
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS frontier_status      TEXT CHECK (frontier_status IN ('QUEUED','RUNNING','DONE','FAILED'));
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS frontier_started_at  TIMESTAMP;
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS frontier_finished_at TIMESTAMP;
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS notion_task_id       TEXT;
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS routine_session_url  TEXT;
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS verdict              TEXT CHECK (verdict IN ('PASS','WARN','FAIL'));
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS report_gdrive_url    TEXT;

-- ── Bypass verdict, controlat admin (3 coloane) ──────────────────────────────
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS verdict_override        TEXT CHECK (verdict_override IN ('PASS','WARN','FAIL'));
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS verdict_override_by     TEXT;
ALTER TABLE ctd_projects ADD COLUMN IF NOT EXISTS verdict_override_reason TEXT;

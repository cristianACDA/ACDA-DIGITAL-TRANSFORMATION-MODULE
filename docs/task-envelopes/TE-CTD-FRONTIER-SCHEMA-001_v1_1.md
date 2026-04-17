# TE-CTD-FRONTIER-SCHEMA-001 — Schema v1.3 Bridge Routines + Flow 8 Statusuri

**Task Envelope | 17 Aprilie 2026 | v1.1**
**Urgență:** Val 1 — primul TE din pachetul FRONTIER (deadline pachet: 20 Apr seara)
**Deadline acest TE:** Vineri 17 Apr seara
**Executor:** Claude Code pe MacBook Air M5 (repo `~/ACDA-DIGITAL-TRANSFORMATION-MODULE/`)
**Aprobare:** Cristian Daniel Lungu

---

## Changelog v1.0 → v1.1 (17 Apr 2026)

Trei ajustări aprobate post-review v1.0:

1. **Pas 0 — Validare pre-execuție** introdus ca gate obligatoriu înainte de Faza 1. Claude Code rulează 5 comenzi diagnostic, afișează output-ul real în chat, și **STOP dacă schema reală diferă de ipoteza TE-ului** — surprize se documentează ca addendum v1.2 înainte de orice modificare SQL.
2. **3 coloane extra** pentru bypass controlat verdict: `verdict_override`, `verdict_override_by`, `verdict_override_reason`. Acces exclusiv prin endpoint admin în TE-CTD-FRONTIER-UI-001 §opțional; zero expunere în UI standard.
3. **Trigger SQLite `Project_updated_at`** auto-refresh pe orice UPDATE. Handlerele NU mai setează manual `updated_at`. Previne recursie cu `WHEN OLD.updated_at = NEW.updated_at`.

---

## Sumar

Migrarea schemei SQLite de la v1.2 la v1.3 pentru integrarea cu Claude Code Routines (bridge frontier ACDA OS, lansat de Anthropic pe 14 Apr 2026). Include:

- **10 coloane noi** pe tabela `Project`: 7 pentru tracking rutină frontier (`notion_task_id`, `routine_session_url`, `gdrive_output_link`, `frontier_status`, `verdict`, `frontier_started_at`, `frontier_completed_at`) + **3 pentru bypass controlat verdict** (`verdict_override`, `verdict_override_by`, `verdict_override_reason`)
- **Restructurare flow de la 7 la 8 statusuri** în ordine Opus-first: `RUTINĂ_FRONTIER` vine imediat după `CIORNĂ`, `AȘTEAPTĂ_APROBARE` se elimină absorbit în `VALIDARE_CONSULTANT`, se adaugă `OFERTĂ_GENERATĂ` și `RESPINS`
- **Trigger `Project_updated_at`** auto-refresh timestamp la orice UPDATE
- **Zod schemas** ca single source of truth pentru TypeScript + validare API
- **Update CLAUDE.md §4** cu diagrama nouă + mapping v1.2 → v1.3

Schema v1.3 rulează pe **SQLite local** (scenariul B aprobat). Port la PostgreSQL rămâne task separat în `TE-CTD-MIGRATE-DGX-001`.

---

## Decizii canonice aplicate

| Decizie | Aplicare |
|---------|----------|
| **A1 Scenariul B** | SQLite local acum; SQL folosește `TEXT CHECK (col IN (...))` în loc de `CREATE TYPE` |
| **A3 Revizuit** | 8 statusuri Opus-first: `RUTINĂ_FRONTIER` după `CIORNĂ`, nu după `AȘTEAPTĂ_APROBARE` |
| **A3 — `AȘTEAPTĂ_APROBARE` eliminat** | Absorbit în `VALIDARE_CONSULTANT` |
| **A3 — Statusuri noi** | `OFERTĂ_GENERATĂ`, `RESPINS` |
| **Backward compat** | UPDATE rânduri existente conform mapping v1.2 → v1.3 în același TRANSACTION |
| **Zod = sursa de adevăr** | SQL-ul nu se referă niciodată direct din handler; se referă doar `FlowStatus` |
| **Ajustare v1.1 — Bypass controlat verdict** | 3 coloane NULL default, setate exclusiv prin endpoint admin |
| **Ajustare v1.1 — Trigger updated_at** | Auto-gestionat de SQLite; handler-e nu mai seta manual |

---

## Fișiere afectate

| # | Fișier | Acțiune | Locație |
|---|--------|---------|---------|
| 1 | `database/migrations/003_frontier_v13_up.sql` | NOU | repo CTD |
| 2 | `database/migrations/003_frontier_v13_down.sql` | NOU | repo CTD |
| 3 | `database/init.ts` | ALTER: schema Project actualizată + apel migration la init | repo CTD |
| 4 | `src/contracts/agent-contracts.ts` | ALTER: `FlowStatus`, `FrontierStatus`, `RoutineVerdict`, `FLOW_TRANSITIONS` | repo CTD |
| 5 | `src/contracts/project-schema.ts` | NOU/ALTER: `ProjectSchema` Zod cu cele 10 câmpuri noi | repo CTD |
| 6 | `server/index.ts` | ALTER: handler `PUT /api/projects/:id/status` folosește `FlowStatus.parse()` + `isValidTransition()` | repo CTD |
| 7 | `src/context/ProjectContext.tsx` | ALTER: string literals actualizate | repo CTD |
| 8 | `src/pages/**/*.tsx` | ALTER: label-uri UI status (grep & replace) | repo CTD |
| 9 | `CLAUDE.md` | ALTER: §4 rescris complet + nota trigger `updated_at` în §3 | repo CTD |
| 10 | `package.json` | ALTER: scripturi `db:migrate:v13` + `db:rollback:v13` | repo CTD |
| 11 | `tests/project-status.test.ts` | NOU: teste unitare FlowStatus + FLOW_TRANSITIONS + trigger updated_at | repo CTD |

---

## ⚠️ PAS 0 — Validare pre-execuție (5 min, OBLIGATORIU înainte de Faza 1)

**Regulă strictă:** înainte de orice modificare SQL, Claude Code execută următoarea secvență și afișează output-ul integral în chat. **Dacă schema reală diferă de ipoteza din TE sau apar tabele dependente neașteptate → STOP, așteaptă decizie Cristian pentru addendum v1.2.**

```bash
# Pas 0.1 — Schema Project (ipoteza TE-ului)
sqlite3 database/acda.db ".schema Project"

# Pas 0.2 — Schema Client (FK parent)
sqlite3 database/acda.db ".schema Client"

# Pas 0.3 — Lista completă tabele (detectează dacă INGEST-001 a rulat deja)
sqlite3 database/acda.db ".tables"

# Pas 0.4 — Trigger-uri existente (evită conflicte cu Project_updated_at)
sqlite3 database/acda.db "SELECT name, sql FROM sqlite_master WHERE type='trigger'"

# Pas 0.5 — Statusuri reale în date (detectează RESPINS deja folosit)
sqlite3 database/acda.db "SELECT DISTINCT status FROM Project"

# Pas 0.6 — Grep referințe string literals în codebase
grep -rn "REVIEW_OPUS\|AȘTEAPTĂ_APROBARE\|RESPINS" src/ server/ tests/ docs/ 2>/dev/null || echo "no matches"
```

### Condiții STOP (raportează la Cristian, nu continua)

| Condiție detectată | Acțiune |
|---|---|
| Schema `Project` nu conține **exact** coloanele asumate în TE (`id, client_id, name, type, status, model, set_indicatori_versiune, durata_procesare_sec, data_call, transcriere_ref, created_at, updated_at`) | STOP. Raport schema reală. Addendum v1.2 ajustează Faza 1.1 INSERT SELECT. |
| Tabele `Process`, `Problem` sau `Opportunity` există deja (INGEST-001 a rulat pre-maturitate) | STOP. Raport `.schema` pentru fiecare. Decizie Cristian dacă se preservă FK-urile pe Project. |
| Trigger `Project_updated_at` există deja (din alt TE) | STOP. Raport semantica lui. Decizie: suprascrie sau păstrează. |
| `SELECT DISTINCT status FROM Project` conține `RESPINS` ca valoare deja folosită | RESPINS e valid existing — **NU e status nou**. Migration-ul îl preservă identical. Continuă Faza 1 fără modificări. |
| `grep` returnează hit-uri în fișiere neașteptate (ex. `docs/`, `tests/`, teme terțe) | Listează toate hit-urile. Raport cantitativ (număr fișiere × număr match-uri) înainte de Faza 3.4 grep-and-replace. |

### Condiție GREEN (continuă la Faza 1)

- Schema `Project` identică cu ipoteza TE
- Nicio tabelă `Process`/`Problem`/`Opportunity` existentă
- Niciun trigger `Project_updated_at` existent
- Grep returnează doar hit-uri în `src/`, `server/`, `CLAUDE.md` (anticipat și documentat)
- `RESPINS` absent din date (devine status nou, cum e documentat)

---

## FAZA 1 — Migration `003_frontier_v13_up.sql` (50 min)

### 1.1 Fișier: `database/migrations/003_frontier_v13_up.sql`

```sql
-- ============================================================================
-- Migration: 003_frontier_v13_up.sql
-- Purpose:   Schema v1.2 → v1.3 (Bridge Routines + 8-status flow + verdict override)
-- Author:    Claude Code (ACDA CTD)
-- Date:      2026-04-17
-- Ref:       TE-CTD-FRONTIER-SCHEMA-001 v1.1
--
-- Changes:
--   1. Add 10 new columns to Project:
--        7 frontier tracking + 3 verdict override
--   2. Replace status CHECK: 7 statuses → 8 statuses (Opus-first)
--   3. Data migration:
--        REVIEW_OPUS → RUTINĂ_FRONTIER
--        AȘTEAPTĂ_APROBARE → VALIDARE_CONSULTANT
--   4. All existing rows: frontier_status='NOT_STARTED', verdict=NULL,
--        verdict_override=NULL, verdict_override_by=NULL, verdict_override_reason=NULL
--   5. Create trigger Project_updated_at (auto-refresh on UPDATE)
-- ============================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Step 1: Create new Project table with v1.3 schema
CREATE TABLE Project_new (
  id                      TEXT PRIMARY KEY,
  client_id               TEXT NOT NULL REFERENCES Client(id),
  name                    TEXT NOT NULL,
  type                    TEXT NOT NULL DEFAULT 'CTD',
  status                  TEXT NOT NULL DEFAULT 'CIORNĂ'
                          CHECK (status IN (
                            'CIORNĂ',
                            'RUTINĂ_FRONTIER',
                            'VALIDARE_CONSULTANT',
                            'APROBAT',
                            'OFERTĂ_GENERATĂ',
                            'FINALIZAT',
                            'ARHIVAT',
                            'RESPINS'
                          )),

  -- v1.3 frontier routine fields:
  notion_task_id          TEXT,
  routine_session_url     TEXT,
  gdrive_output_link      TEXT,
  frontier_status         TEXT NOT NULL DEFAULT 'NOT_STARTED'
                          CHECK (frontier_status IN (
                            'NOT_STARTED','QUEUED','IN_PROGRESS','DONE','FAILED'
                          )),
  verdict                 TEXT
                          CHECK (verdict IS NULL OR verdict IN ('PASS','WARN','FAIL')),
  frontier_started_at     TEXT,
  frontier_completed_at   TEXT,

  -- v1.3 verdict override (bypass controlat Cristian, ajustare v1.1):
  verdict_override        TEXT
                          CHECK (verdict_override IS NULL OR verdict_override IN ('PASS','WARN','FAIL')),
  verdict_override_by     TEXT,
  verdict_override_reason TEXT,

  -- Existing metadata fields (preserve from v1.2):
  model                   TEXT,
  set_indicatori_versiune TEXT,
  durata_procesare_sec    INTEGER,
  data_call               TEXT,
  transcriere_ref         TEXT,

  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy data with status mapping (v1.2 → v1.3)
INSERT INTO Project_new (
  id, client_id, name, type, status,
  notion_task_id, routine_session_url, gdrive_output_link,
  frontier_status, verdict, frontier_started_at, frontier_completed_at,
  verdict_override, verdict_override_by, verdict_override_reason,
  model, set_indicatori_versiune, durata_procesare_sec,
  data_call, transcriere_ref,
  created_at, updated_at
)
SELECT
  id, client_id, name, type,
  CASE status
    WHEN 'REVIEW_OPUS'       THEN 'RUTINĂ_FRONTIER'
    WHEN 'AȘTEAPTĂ_APROBARE' THEN 'VALIDARE_CONSULTANT'
    ELSE status
  END AS status,
  NULL, NULL, NULL,           -- notion_task_id, routine_session_url, gdrive_output_link
  'NOT_STARTED', NULL,        -- frontier_status, verdict
  NULL, NULL,                 -- frontier_started_at, frontier_completed_at
  NULL, NULL, NULL,           -- verdict_override, verdict_override_by, verdict_override_reason
  model, set_indicatori_versiune, durata_procesare_sec,
  data_call, transcriere_ref,
  created_at, updated_at
FROM Project;

-- Step 3: Drop old table
DROP TABLE Project;

-- Step 4: Rename new table
ALTER TABLE Project_new RENAME TO Project;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_project_client_id        ON Project(client_id);
CREATE INDEX IF NOT EXISTS idx_project_status           ON Project(status);
CREATE INDEX IF NOT EXISTS idx_project_frontier_status  ON Project(frontier_status);
CREATE INDEX IF NOT EXISTS idx_project_notion_task_id   ON Project(notion_task_id);
CREATE INDEX IF NOT EXISTS idx_project_verdict_override ON Project(verdict_override_by); -- audit queries

-- Step 6: Create trigger Project_updated_at (ajustare v1.1)
-- Pattern: previne recursie cu WHEN OLD.updated_at = NEW.updated_at
DROP TRIGGER IF EXISTS Project_updated_at;
CREATE TRIGGER Project_updated_at
AFTER UPDATE ON Project
FOR EACH ROW
WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE Project SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Step 7: Migration marker
CREATE TABLE IF NOT EXISTS _schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO _schema_migrations (version) VALUES ('003_frontier_v13')
  ON CONFLICT(version) DO NOTHING;

COMMIT;

PRAGMA foreign_keys = ON;

-- Verification queries (run manually post-migration):
-- PRAGMA table_info(Project);
-- SELECT DISTINCT status FROM Project;
-- SELECT DISTINCT frontier_status FROM Project;
-- SELECT name FROM sqlite_master WHERE type='trigger' AND name='Project_updated_at';
-- SELECT COUNT(*) FROM _schema_migrations WHERE version='003_frontier_v13';
```

### 1.2 Notă arhitecturală — pattern SQLite 5-pași

SQLite nu permite ALTER CHECK direct și nu permite eliminarea/modificarea unei coloane cu FK. Pattern-ul 5-pași (copy → drop → rename) este documentat oficial în [SQLite ALTER TABLE docs](https://www.sqlite.org/lang_altertable.html) ca singura metodă sigură. FK-urile externe către `Project(id)` (dacă există la momentul execuției — vezi Pas 0) nu se rup pentru că PK-urile rămân identice după rename, iar `PRAGMA foreign_keys = OFF` previne cascade în timpul migrării.

### 1.3 Mapping canonic v1.2 → v1.3

| v1.2 status | v1.3 status | Justificare |
|-------------|-------------|-------------|
| `CIORNĂ` | `CIORNĂ` | Neschimbat |
| `VALIDARE_CONSULTANT` | `VALIDARE_CONSULTANT` | Neschimbat (poziție diferită în flow) |
| `AȘTEAPTĂ_APROBARE` | `VALIDARE_CONSULTANT` | **Absorbit** |
| `APROBAT` | `APROBAT` | Neschimbat (Gate Cristian) |
| `REVIEW_OPUS` | `RUTINĂ_FRONTIER` | **Redenumit** |
| `FINALIZAT` | `FINALIZAT` | Neschimbat |
| `ARHIVAT` | `ARHIVAT` | Neschimbat |
| *(nou în v1.3)* | `OFERTĂ_GENERATĂ` | Trigger `acda-offer-personalized` |
| *(nou în v1.3)* | `RESPINS` | Lateral — FAIL rutină sau respingere umană |

### Definition of Done Faza 1

- [ ] `sqlite3 database/acda.db < database/migrations/003_frontier_v13_up.sql` exit 0
- [ ] `PRAGMA table_info(Project)` listează cele **10 coloane noi** (7 frontier + 3 override)
- [ ] `SELECT DISTINCT status FROM Project` nu conține `REVIEW_OPUS` sau `AȘTEAPTĂ_APROBARE`
- [ ] Seed CloudServe: `frontier_status='NOT_STARTED'`, `verdict=NULL`, `verdict_override=NULL`
- [ ] `SELECT name FROM sqlite_master WHERE type='trigger' AND name='Project_updated_at'` returnează 1 rând
- [ ] `SELECT version FROM _schema_migrations WHERE version='003_frontier_v13'` returnează 1 rând
- [ ] `PRAGMA foreign_keys` returnează `1` după migrare

---

## FAZA 2 — Rollback `003_frontier_v13_down.sql` (25 min)

### 2.1 Fișier: `database/migrations/003_frontier_v13_down.sql`

```sql
-- ============================================================================
-- Rollback: 003_frontier_v13_down.sql
-- Purpose:  Revert schema v1.3 → v1.2
--
-- WARNING — SEMANTIC LOSS:
--   OFERTĂ_GENERATĂ  → APROBAT               (pierde info ofertă generată)
--   RESPINS          → VALIDARE_CONSULTANT   (pierde info respingere)
--   verdict_override → pierdut complet       (nu există în v1.2)
--   Toate valorile frontier_* → pierdute
--
--   Rollback e destinat EXCLUSIV scenariilor de emergență.
--   Nu rula în producție fără backup DB prealabil.
-- ============================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Step 0: Drop trigger v1.3 (ajustare v1.1)
DROP TRIGGER IF EXISTS Project_updated_at;

-- Step 1: Recreate v1.2 Project table
CREATE TABLE Project_old (
  id                      TEXT PRIMARY KEY,
  client_id               TEXT NOT NULL REFERENCES Client(id),
  name                    TEXT NOT NULL,
  type                    TEXT NOT NULL DEFAULT 'CTD',
  status                  TEXT NOT NULL DEFAULT 'CIORNĂ'
                          CHECK (status IN (
                            'CIORNĂ',
                            'VALIDARE_CONSULTANT',
                            'AȘTEAPTĂ_APROBARE',
                            'APROBAT',
                            'REVIEW_OPUS',
                            'FINALIZAT',
                            'ARHIVAT'
                          )),
  model                   TEXT,
  set_indicatori_versiune TEXT,
  durata_procesare_sec    INTEGER,
  data_call               TEXT,
  transcriere_ref         TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Reverse status mapping (with semantic loss)
INSERT INTO Project_old (
  id, client_id, name, type, status,
  model, set_indicatori_versiune, durata_procesare_sec,
  data_call, transcriere_ref,
  created_at, updated_at
)
SELECT
  id, client_id, name, type,
  CASE status
    WHEN 'RUTINĂ_FRONTIER'  THEN 'REVIEW_OPUS'
    WHEN 'OFERTĂ_GENERATĂ'  THEN 'APROBAT'               -- SEMANTIC LOSS
    WHEN 'RESPINS'          THEN 'VALIDARE_CONSULTANT'   -- SEMANTIC LOSS
    ELSE status
  END AS status,
  model, set_indicatori_versiune, durata_procesare_sec,
  data_call, transcriere_ref,
  created_at, updated_at
FROM Project;

-- Step 3-5: Drop new, rename old
DROP TABLE Project;
ALTER TABLE Project_old RENAME TO Project;

-- Recreate v1.2 indexes
CREATE INDEX IF NOT EXISTS idx_project_client_id ON Project(client_id);
CREATE INDEX IF NOT EXISTS idx_project_status    ON Project(status);

-- Remove migration marker
DELETE FROM _schema_migrations WHERE version = '003_frontier_v13';

COMMIT;

PRAGMA foreign_keys = ON;
```

### 2.2 Scripturi npm în `package.json`

```json
{
  "scripts": {
    "db:migrate:v13": "sqlite3 database/acda.db < database/migrations/003_frontier_v13_up.sql",
    "db:rollback:v13": "sqlite3 database/acda.db < database/migrations/003_frontier_v13_down.sql"
  }
}
```

### Definition of Done Faza 2

- [ ] Rollback exit 0 pe DB post-migration
- [ ] `SELECT name FROM sqlite_master WHERE type='trigger' AND name='Project_updated_at'` → 0 rânduri post-rollback
- [ ] Schema post-rollback identică cu pre-migration: `.schema Project | diff /tmp/schema-v12.sql -` → 0 linii
- [ ] `SELECT COUNT(*) FROM Project` identic pre ↔ post rollback

---

## FAZA 3 — Zod schemas + TypeScript types (35 min)

### 3.1 Fișier: `src/contracts/agent-contracts.ts` (ALTER — append)

```typescript
import { z } from 'zod';

// ============================================================================
// v1.3 — Flow 8 statusuri (Opus-first, 17 Apr 2026)
// ============================================================================

export const FlowStatus = z.enum([
  'CIORNĂ',
  'RUTINĂ_FRONTIER',
  'VALIDARE_CONSULTANT',
  'APROBAT',
  'OFERTĂ_GENERATĂ',
  'FINALIZAT',
  'ARHIVAT',
  'RESPINS'
]);
export type FlowStatus = z.infer<typeof FlowStatus>;

export const FrontierStatus = z.enum([
  'NOT_STARTED',
  'QUEUED',
  'IN_PROGRESS',
  'DONE',
  'FAILED'
]);
export type FrontierStatus = z.infer<typeof FrontierStatus>;

export const RoutineVerdict = z.enum(['PASS', 'WARN', 'FAIL']);
export type RoutineVerdict = z.infer<typeof RoutineVerdict>;

/**
 * Tranziții legale între statusuri. Validate server-side în
 * PUT /api/projects/:id/status înainte de UPDATE.
 *
 * Regula specială: RUTINĂ_FRONTIER → VALIDARE_CONSULTANT e permisă doar dacă
 * verdict ∈ {PASS, WARN} sau verdict_override ∈ {PASS, WARN} (bypass Cristian).
 * Dacă verdict=FAIL și nicio override → tranziție → RESPINS (sau retry CIORNĂ).
 * Regula se aplică în handler, nu în map-ul de mai jos.
 */
export const FLOW_TRANSITIONS: Record<FlowStatus, readonly FlowStatus[]> = {
  'CIORNĂ':              ['RUTINĂ_FRONTIER', 'RESPINS'],
  'RUTINĂ_FRONTIER':     ['VALIDARE_CONSULTANT', 'RESPINS'],
  'VALIDARE_CONSULTANT': ['APROBAT', 'RESPINS'],
  'APROBAT':             ['OFERTĂ_GENERATĂ'],
  'OFERTĂ_GENERATĂ':     ['FINALIZAT'],
  'FINALIZAT':           ['ARHIVAT'],
  'ARHIVAT':             [],
  'RESPINS':             ['CIORNĂ']  // retry pipeline
} as const;

export function isValidTransition(from: FlowStatus, to: FlowStatus): boolean {
  return FLOW_TRANSITIONS[from].includes(to);
}
```

### 3.2 Fișier: `src/contracts/project-schema.ts` (NOU)

```typescript
import { z } from 'zod';
import { FlowStatus, FrontierStatus, RoutineVerdict } from './agent-contracts';

export const ProjectSchema = z.object({
  id: z.string().min(1),
  client_id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('CTD').default('CTD'),
  status: FlowStatus.default('CIORNĂ'),

  // v1.3 frontier tracking
  notion_task_id: z.string().nullable().default(null),
  routine_session_url: z.string().url().nullable().default(null),
  gdrive_output_link: z.string().url().nullable().default(null),
  frontier_status: FrontierStatus.default('NOT_STARTED'),
  verdict: RoutineVerdict.nullable().default(null),
  frontier_started_at: z.string().datetime().nullable().default(null),
  frontier_completed_at: z.string().datetime().nullable().default(null),

  // v1.3 verdict override (bypass Cristian, ajustare v1.1)
  verdict_override: RoutineVerdict.nullable().default(null),
  verdict_override_by: z.string().nullable().default(null),
  verdict_override_reason: z.string().nullable().default(null),

  // Metadata v1.2
  model: z.string().nullable().default(null),
  set_indicatori_versiune: z.string().nullable().default(null),
  durata_procesare_sec: z.number().int().nullable().default(null),
  data_call: z.string().nullable().default(null),
  transcriere_ref: z.string().nullable().default(null),

  created_at: z.string(),
  updated_at: z.string()
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectStatusUpdateSchema = z.object({
  status: FlowStatus
});
export type ProjectStatusUpdate = z.infer<typeof ProjectStatusUpdateSchema>;

/**
 * Efective verdict = override dacă există, altfel verdict real.
 * Folosit în regulile de tranziție.
 */
export function effectiveVerdict(p: Project): RoutineVerdict | null {
  return p.verdict_override ?? p.verdict;
}
```

### 3.3 Update handler `PUT /api/projects/:id/status` în `server/index.ts`

```typescript
import { FlowStatus, isValidTransition, FLOW_TRANSITIONS } from '../src/contracts/agent-contracts';
import { ProjectStatusUpdateSchema, effectiveVerdict } from '../src/contracts/project-schema';

app.put('/api/projects/:id/status', async (req, res) => {
  try {
    const { status: newStatus } = ProjectStatusUpdateSchema.parse(req.body);
    const project = db.prepare(`
      SELECT status, verdict, verdict_override, verdict_override_by
      FROM Project WHERE id = ?
    `).get(req.params.id) as any;
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const currentStatus = project.status as FlowStatus;

    if (!isValidTransition(currentStatus, newStatus)) {
      return res.status(400).json({
        error: 'INVALID_TRANSITION',
        message: `Tranziție invalidă: ${currentStatus} → ${newStatus}`,
        allowed: FLOW_TRANSITIONS[currentStatus]
      });
    }

    // Regula specială: RUTINĂ_FRONTIER → VALIDARE_CONSULTANT
    // verdict efectiv (real sau override) trebuie să fie PASS sau WARN
    if (currentStatus === 'RUTINĂ_FRONTIER' && newStatus === 'VALIDARE_CONSULTANT') {
      const eff = project.verdict_override ?? project.verdict;
      if (!eff || eff === 'FAIL') {
        return res.status(400).json({
          error: 'VERDICT_REQUIRED',
          message: `Tranziție necesită verdict PASS sau WARN (actual: ${eff ?? 'null'}). Folosește endpoint admin pentru override dacă aplicabil.`
        });
      }
    }

    // NOTĂ: NU seta manual updated_at — trigger Project_updated_at îl gestionează
    db.prepare('UPDATE Project SET status = ? WHERE id = ?')
      .run(newStatus, req.params.id);
    res.json({ id: req.params.id, status: newStatus });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'VALIDATION', issues: err.errors });
    res.status(500).json({ error: 'INTERNAL', message: String(err) });
  }
});
```

### 3.4 Grep & replace în codebase

```bash
# Raport pre-replace (din Pas 0, re-rulează pentru confirmare)
grep -rln 'REVIEW_OPUS' src/ server/ --include='*.ts' --include='*.tsx'
grep -rln 'AȘTEAPTĂ_APROBARE' src/ server/ --include='*.ts' --include='*.tsx'
```

Înlocuire:
- `REVIEW_OPUS` → `RUTINĂ_FRONTIER`
- `AȘTEAPTĂ_APROBARE` → `VALIDARE_CONSULTANT`

**Excepții (NU înlocui):**
- Comentariile din migration files (referință istorică necesară)
- Comentariile tabelar de mapping în CLAUDE.md §4 (referință istorică)

### 3.5 Elimină `SET updated_at = datetime('now')` din handler-e (ajustare v1.1)

```bash
# Găsește locuri unde handler-e setează manual updated_at pe Project
grep -rn "UPDATE Project.*updated_at" server/ src/
```

Pentru fiecare hit: elimină `updated_at = datetime('now')` din UPDATE statement. Trigger-ul `Project_updated_at` îl gestionează automat.

### Definition of Done Faza 3

- [ ] `npm run build` PASS (zero erori TypeScript, zero `any`)
- [ ] Test Vitest: `FlowStatus.parse('REVIEW_OPUS')` aruncă `ZodError`
- [ ] Test Vitest: `FlowStatus.parse('RUTINĂ_FRONTIER')` OK
- [ ] Test Vitest: `isValidTransition('CIORNĂ', 'RUTINĂ_FRONTIER')` → `true`
- [ ] Test Vitest: `isValidTransition('CIORNĂ', 'APROBAT')` → `false`
- [ ] Test Vitest: `effectiveVerdict` returnează `verdict_override` când e setat, altfel `verdict`
- [ ] `grep -r "REVIEW_OPUS" src/ server/ --include='*.ts' --include='*.tsx'` → zero match
- [ ] `grep -r "AȘTEAPTĂ_APROBARE" src/ server/ --include='*.ts' --include='*.tsx'` → zero match
- [ ] `grep -rn "UPDATE Project.*updated_at" server/ src/` → zero match (trigger preia)

---

## FAZA 4 — Update `CLAUDE.md` (20 min)

### 4.1 Înlocuiește §4 complet cu:

```markdown
## §4 Flow 8 statusuri (v1.3 — 17 Apr 2026, Opus-first)

Fluxul canonic pentru proiecte CTD după integrarea Claude Code Routines:

    CIORNĂ
       │ (Agent_CTD Qwen scorare preliminară pe DGX)
       ↓
    RUTINĂ_FRONTIER
       │ (acda-ctd-full Opus pipeline: analyze + pages + scqaps + report + review)
       │ verdict efectiv ∈ {PASS, WARN}
       ↓
    VALIDARE_CONSULTANT
       │ (Patricia/Oana verifică raport Opus, ~15 min)
       ↓
    APROBAT
       │ (Gate Cristian — 1 punct consolidat)
       ↓
    OFERTĂ_GENERATĂ
       │ (trigger acda-offer-personalized)
       ↓
    FINALIZAT
       │ (client semnat)
       ↓
    ARHIVAT

    ─── Lateral ───
    RESPINS ← accesibil din CIORNĂ, RUTINĂ_FRONTIER, VALIDARE_CONSULTANT
       ↓ (retry pipeline)
    CIORNĂ

**Regulă tranziție specială:** `RUTINĂ_FRONTIER → VALIDARE_CONSULTANT` e permisă
doar dacă verdict efectiv (real sau override) ∈ {PASS, WARN}. Dacă verdict=FAIL
și nicio override → `RUTINĂ_FRONTIER → RESPINS` (cu opțiune de retry → `CIORNĂ`).

**Verdict override (bypass controlat Cristian):** câmpurile `verdict_override`,
`verdict_override_by`, `verdict_override_reason` pe Project. Acces exclusiv prin
endpoint admin. Zero expunere în UI standard. Audit persistent în log.

### Mapping v1.2 → v1.3

| v1.2 | v1.3 | Notă |
|------|------|------|
| `REVIEW_OPUS` | `RUTINĂ_FRONTIER` | Redenumit + mutat imediat după `CIORNĂ` |
| `AȘTEAPTĂ_APROBARE` | `VALIDARE_CONSULTANT` | Absorbit |
| — | `OFERTĂ_GENERATĂ` | Nou între APROBAT și FINALIZAT |
| — | `RESPINS` | Nou, lateral |

**Sursa de adevăr:** `src/contracts/agent-contracts.ts` — `FlowStatus`, `FLOW_TRANSITIONS`.
```

### 4.2 Adaugă în §3 Stack o notă despre trigger `updated_at`:

```markdown
**Notă gestionare `updated_at` (v1.3):** toate tabelele cu coloana `updated_at`
au trigger SQLite `<Table>_updated_at` care refresh-ează automat timestamp-ul
la orice UPDATE. **Handler-ele NU setează manual `updated_at`** — pattern-ul
`SET updated_at = datetime('now')` în UPDATE statements e interzis.
Trigger-ul folosește `WHEN OLD.updated_at = NEW.updated_at` pentru prevenire
recursie.
```

### Definition of Done Faza 4

- [ ] CLAUDE.md §4 reflectă flow v1.3 complet cu diagramă + mapping + regulă specială + notă verdict_override
- [ ] CLAUDE.md §3 conține nota despre trigger `updated_at`
- [ ] Referințe la `REVIEW_OPUS`/`AȘTEAPTĂ_APROBARE` apar doar în tabel mapping (context istoric)

---

## FAZA 5 — Triplu Audit (25 min)

### 5.1 Pre-Activare

- [ ] Backup: `cp database/acda.db database/acda.db.backup-v12-$(date +%Y%m%d-%H%M%S)`
- [ ] Schema diff pre: `sqlite3 database/acda.db ".schema Project" > /tmp/schema-v12.sql`
- [ ] Dry-run pe copie: `cp acda.db /tmp/test-migrate.db && sqlite3 /tmp/test-migrate.db < 003_frontier_v13_up.sql`
- [ ] Dry-run rollback pe aceeași copie: `sqlite3 /tmp/test-migrate.db < 003_frontier_v13_down.sql`
- [ ] Diff schema post-rollback vs pre: `sqlite3 /tmp/test-migrate.db ".schema Project" | diff /tmp/schema-v12.sql -` → 0 linii

### 5.2 Securitate

- [ ] Zero secrete în migration files: `grep -iE 'token|secret|password|bearer|api[_-]key' database/migrations/003_frontier_v13_*.sql` → 0 match
- [ ] Zero URL-uri hardcodate cu credențiale
- [ ] `PRAGMA foreign_keys` restaurat la `ON` în ambele scripturi
- [ ] `CHECK` la nivel DB pentru `frontier_status`, `verdict`, `verdict_override`, `status` (defense-in-depth)
- [ ] Trigger `Project_updated_at` nu creează buclă infinită (verificat prin test: UPDATE de 10x consecutive → 10 refresh-uri, nu infinite)

### 5.3 Post-Activare

- [ ] `npm run dev` pornește fără erori
- [ ] Seed CloudServe vizibil în UI cu status mapat corect
- [ ] Test pozitiv status: `curl -X PUT localhost:3001/api/projects/p-cloudserve-001/status -H 'Content-Type: application/json' -d '{"status":"RUTINĂ_FRONTIER"}'` → 200 (dacă status curent = CIORNĂ)
- [ ] Test negativ Zod: body cu `{"status":"REVIEW_OPUS"}` → 400 `VALIDATION`
- [ ] Test negativ tranziție: `CIORNĂ → APROBAT` → 400 `INVALID_TRANSITION` cu `allowed[]`
- [ ] Test negativ verdict: `RUTINĂ_FRONTIER → VALIDARE_CONSULTANT` cu verdict=NULL → 400 `VERDICT_REQUIRED`
- [ ] Test trigger `updated_at`:

```typescript
// tests/project-status.test.ts — test integrare
test('updated_at refreshes automatically on any Project UPDATE', async () => {
  const id = await createTestProject();
  const t1 = (await db.get('SELECT updated_at FROM Project WHERE id = ?', id)).updated_at;
  await new Promise(r => setTimeout(r, 1100)); // SQLite datetime precision = 1 sec
  await db.run('UPDATE Project SET name = ? WHERE id = ?', ['Renamed', id]);
  const t2 = (await db.get('SELECT updated_at FROM Project WHERE id = ?', id)).updated_at;
  expect(new Date(t2).getTime()).toBeGreaterThan(new Date(t1).getTime());
});

test('trigger does not recurse infinitely', async () => {
  const id = await createTestProject();
  // 10 UPDATE-uri consecutive nu produc loop
  for (let i = 0; i < 10; i++) {
    await db.run('UPDATE Project SET name = ? WHERE id = ?', [`iter-${i}`, id]);
  }
  // Dacă ajunge aici fără timeout/stack overflow, pass
  expect(true).toBe(true);
});
```

- [ ] Toate testele Vitest existente trec: `npm run test`
- [ ] `npm run build` PASS

### Definition of Done Faza 5

- [ ] Cele 3 secțiuni audit completate în PR description
- [ ] Screenshot UI dashboard cu seed CloudServe în status v1.3 (attach PR)
- [ ] Lista de comenzi rulate + output-uri documentate

---

## Ordine execuție

```
Pas 0 (validare)  →  Faza 1 (up.sql)  →  Faza 2 (down.sql)  →  Faza 3 (Zod)  →  Faza 4 (CLAUDE.md)  →  Faza 5 (Audit)
    5 min              50 min              25 min                35 min           20 min              25 min
                                                                                            Total: ~2h 40min
```

**Dependențe interne:**
- Faza 1 depinde de Pas 0 GREEN
- Faza 2 depinde de Faza 1 (logica inversă)
- Faza 3 depinde de Faza 1 (schema SQL = sursa pentru Zod)
- Faza 4 depinde de Faza 3 (CLAUDE.md referă `FlowStatus`)
- Faza 5 depinde de toate

**Checkpoint raportare:** după Faza 1 completă și înainte de Faza 2 — raport către Cristian cu rezultatul `PRAGMA table_info(Project)` și output `SELECT status, frontier_status, verdict FROM Project`.

**Commit strategy:** 1 commit per fază, mesaje descriptive. PR unic pe branch `feat/frontier-schema-v13`.

---

## gstack pipeline (pre-merge)

| Stage | Comandă |
|-------|---------|
| `/review` | Review manual Claude Code + sintaxa SQL cu `sqlite3 :memory:` |
| `/cso` | `grep -iE 'token\|secret\|password' database/migrations/*.sql` |
| `/qa` | `npm run test && npm run build` |
| `/canary` | `npm run db:migrate:v13 && sqlite3 database/acda.db "SELECT COUNT(*) FROM Project"` |
| `/ship` | `git commit -m "feat(schema): add frontier routine fields + 8-status flow v1.3 + updated_at trigger (TE-CTD-FRONTIER-SCHEMA-001 v1.1)"` |

---

## Blast Radius

| Componentă | Impact | Risc |
|-----------|--------|------|
| Tabela `Project` | Reconstruire completă (5-step pattern), 10 coloane noi | **MEDIU** — mitigat prin backup + dry-run + Pas 0 |
| Trigger `Project_updated_at` | Nou; gestionează auto-refresh | LOW — pattern WHEN previne recursie |
| FK externe (Process/Problem/Opportunity) | Zero impact direct (nu există la 17 Apr, verificat la Pas 0) | ZERO |
| API status handler | Logică nouă tranziții + verdict efectiv | LOW — test coverage nou |
| Handler-e cu `SET updated_at` manual | Eliminate; trigger-ul preia | LOW — grep + test integrare |
| UI status display | Label-uri actualizate | LOW — strings only |
| Zod contracts | 3 enum-uri noi + ProjectSchema | LOW — additive |
| CLAUDE.md | Rewrite §4 + notă §3 | ZERO |
| Seed CloudServe | Status mapat deterministic | ZERO |

---

## Reguli execuție Claude Code

1. **Pas 0 este non-negociabil** — STOP la prima surpriză
2. **gstack obligatoriu** — oprire la primul FAIL
3. **Backup obligatoriu** înainte de Faza 5.3
4. **Zero hardcodare credențiale**
5. **TypeScript strict** — zero `any`, zero `@ts-ignore`
6. **Commit per fază** cu mesaj descriptiv
7. **Handler-ele NU setează manual `updated_at`** (trigger-ul gestionează)
8. **Pattern SQLite 5-pași obligatoriu** — nu încerca alternative
9. **Nu modifica tabele Client/EBITBaseline/MaturityIndicator/MaturityScore** (scope strict)
10. **Checkpoint raport** după Faza 1 completă, înainte de Faza 2

---

## Referințe

| Document | Ce furnizează |
|----------|--------------|
| `CTD_Bridge_Integration_Brief_17Apr2026.md` §2.2 | Lista 7 coloane frontier + efort estimat |
| Răspuns Cristian 17 Apr 2026 A3 | Flow 8 statusuri Opus-first + mapping v1.2 → v1.3 |
| Răspuns Cristian 17 Apr 2026 A1 | Scenariul B (SQLite local) |
| Răspuns Cristian 17 Apr 2026 (v1.1 ajustări) | Pas 0 + 3 coloane override + trigger updated_at |
| `TE-CTD-INGEST-001 v1.0` | Stilul TE + schema Process/Problem/Opportunity viitoare |
| `TE-BRIDGE-ROUTINES-001 v1.0` | Context arhitectural bridge |
| `Manual AAA v2.0` cap. 11.5 | 14 criterii PASS/WARN/FAIL |
| [SQLite ALTER TABLE docs](https://www.sqlite.org/lang_altertable.html) | Pattern 5-pași |

---

## Livrabile finale (checklist consolidat)

- [ ] Pas 0 GREEN raportat în chat (sau STOP cu addendum v1.2)
- [ ] `database/migrations/003_frontier_v13_up.sql` — creat
- [ ] `database/migrations/003_frontier_v13_down.sql` — creat
- [ ] `src/contracts/agent-contracts.ts` — FlowStatus + FrontierStatus + RoutineVerdict + FLOW_TRANSITIONS + isValidTransition
- [ ] `src/contracts/project-schema.ts` — ProjectSchema + ProjectStatusUpdateSchema + effectiveVerdict
- [ ] `server/index.ts` — handler status cu validare tranziții + regula verdict efectiv + eliminare manual updated_at
- [ ] `src/context/ProjectContext.tsx` — string literals actualizate
- [ ] `src/pages/**/*.tsx` — label-uri UI actualizate
- [ ] `CLAUDE.md §4` — rescris cu flow v1.3 + mapping + notă verdict_override
- [ ] `CLAUDE.md §3` — notă trigger `updated_at`
- [ ] `package.json` — scripturi `db:migrate:v13` + `db:rollback:v13`
- [ ] `tests/project-status.test.ts` — teste FlowStatus + FLOW_TRANSITIONS + trigger updated_at
- [ ] Triplu Audit documentat în PR description
- [ ] Checkpoint raport după Faza 1 transmis
- [ ] PR pe branch `feat/frontier-schema-v13` — merge pe `main` doar după approval Cristian

---

*ACDA Consulting SRL | acda.ro | TE-CTD-FRONTIER-SCHEMA-001 v1.1 | 17 Aprilie 2026 | Confidențial*

# TE-CTD-FRONTIER-API-001 — Handler-e Frontier + Adapter Bridge + Runbook SSH

**Task Envelope | 17 Aprilie 2026 | v1.1**
**Urgență:** Val 1 — al doilea TE din pachetul FRONTIER
**Deadline acest TE:** Sâmbătă 18 / Duminică 19 Apr 2026
**Executor:** Claude Code pe MacBook Air M5 (repo `~/ACDA-DIGITAL-TRANSFORMATION-MODULE/`)
**Aprobare:** Cristian Daniel Lungu

---

## Changelog v1.0 → v1.1 (17 Apr 2026, post confirmare contracte Claude DGX)

Trei ajustări pe baza completărilor Claude DGX pe contractele CLI:

1. **Contract 2 extins — `BridgeError` Zod tolerează `retry_after_seconds` + `debug_context`.** Pentru `error_type=RATE_LIMIT`, stderr JSON include `retry_after_seconds` (int, extras din Anthropic 429 header). Handler-ul propagă valoarea ca header HTTP `Retry-After` în response-ul 429 — UI polling și sendPrompt backoff se sincronizează cu rate-limit-ul real. Opțional `debug_context` (object) pentru audit Wazuh, tolerat permisiv în Zod.
2. **Contract 4 extins — circuit breaker per-rutină cu subcomenzi CLI.** Naming canonic: `~/acda-bridge/.circuit-breaker-{ROUTINE_SLUG}` (ex. `.circuit-breaker-ctd-full`) — oprire selectivă pe rutină, fără blocaj global. Conținut JSON opțional cu `reason` + `auto_expire_at`; systemd timer DGX la 5 min curăță cele expirate. CLI expune `break/unbreak/status` — documentate în runbook `ssh-to-dgx.md` §5.
3. **Contract 6 confirm + monitorizare.** Timeout 30s pe subprocess SSH e corect. Monitorizare P95 prin `acda_obs.agent_log.duration_ms` pe DGX (Claude DGX side); dacă P95 >25s în primele 72h post go-live, Cristian urcă la 45s printr-un addendum.

---

## Sumar

Expune două endpoint-uri REST pe backend-ul Express pentru declanșarea și monitorizarea rutinei frontier `acda-ctd-full`:

- **`POST /api/ctd/:project_id/trigger-frontier`** — validează tranziție CIORNĂ → RUTINĂ_FRONTIER, apelează `bridge_publisher.publish` pe DGX (via SSH subprocess cu Tailscale, sau local în producție post-migrare), actualizează `Project` cu `notion_task_id`, `routine_session_url`, `frontier_status='QUEUED'`, `frontier_started_at=NOW()`, `status='RUTINĂ_FRONTIER'`. Returnează 202.
- **`GET /api/ctd/:project_id/frontier-status`** — cache in-memory 5s, SELECT din `Project` coloanele frontier, returnează JSON consolidat pentru UI polling.

Include:
- **Adapter `BridgePublisher`** cu 2 moduri (ssh/local) comutabil via env var `BRIDGE_MODE`
- **Runbook `docs/runbooks/ssh-to-dgx.md`** — setup + troubleshooting SSH Tailscale către DGX
- **Test integrare** `tests/integration/bridge-trigger.test.ts` — 5 scenarii (happy + 4 negative) cu mock subprocess

## Dependențe externe (blocante dacă nu sunt satisfăcute)

| # | Dependență | Owner | Deadline | Status la 17 Apr |
|---|-----------|-------|----------|------------------|
| 1 | `TE-CTD-FRONTIER-SCHEMA-001 v1.1` merged pe `main` | Claude Code + Cristian approval | Vineri 17 Apr seara | PENDING execuție |
| 2 | CLI `bridge_publisher.py publish` live pe DGX (spec în Anexa A) | TE-BRIDGE-ROUTINES-001 Faza 4.3 | Duminică 19 Apr seara | PENDING |
| 3 | Rutina `acda-ctd-full` creată manual la `claude.ai/code/routines` + token + URL în `~/.openclaw/.env` pe DGX ca `ROUTINE_CTD_FULL_TOKEN` | Cristian (30 min UI) | Sâmbătă 18 Apr | PENDING |
| 4 | Cheie SSH non-interactivă MacBook → DGX funcțională | Cristian (setup existent) | Vineri 17 Apr seara | TEST OBLIGATORIU |

### Test dependență #4 înainte de începere Faza 1:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 sparkacda1@100.93.193.85 'echo ok'
# Expected: "ok" în <2s, exit 0
# Dacă FAIL: STOP, raport Cristian, nu începe Faza 1 până nu e rezolvat
```

## Out of scope (separate TE-uri)

- Componenta React `<FrontierRoutineProgress />` — **TE-CTD-FRONTIER-UI-001**
- Endpoint `/api/ctd/:project_id/report-preview` (descarcă `report_final.md` din GDrive) — task opțional API-001 dacă rămâne >30 min rezervă, altfel TE separat
- SSE `/api/ctd/events` real-time push — **TE-CTD-FRONTIER-SSE-001** (post Val 1)
- Endpoint admin `POST /api/admin/verdict-override` — **TE-CTD-FRONTIER-UI-001 §opțional**

---

## Fișiere afectate

| # | Fișier | Acțiune |
|---|--------|---------|
| 1 | `src/services/bridge.ts` | NOU — adapter `BridgePublisher` cu 2 moduri |
| 2 | `src/services/frontier-status-cache.ts` | NOU — cache in-memory 5s TTL |
| 3 | `src/contracts/frontier-schemas.ts` | NOU — Zod request/response pentru handler-e |
| 4 | `server/ctd-frontier-routes.ts` | NOU — router Express cu 2 handler-e |
| 5 | `server/index.ts` | ALTER — mount `ctd-frontier-routes` |
| 6 | `tests/integration/bridge-trigger.test.ts` | NOU — 5 scenarii mock subprocess |
| 7 | `tests/fixtures/bridge-publisher-responses.ts` | NOU — fixtures pentru mock |
| 8 | `docs/runbooks/ssh-to-dgx.md` | NOU — setup + troubleshooting |
| 9 | `.env.example` | ALTER — adaugă variabile |
| 10 | `CLAUDE.md` | ALTER — §5 (secțiune nouă "Frontier Bridge") |

---

## FAZA 0 — Configurare `.env` + test SSH (10 min)

### 0.1 Adaugă în `.env.example`

```bash
# ========== Frontier Bridge (v1.3) ==========
# Mod de operare:
#   ssh   = dev pe MacBook, bridge_publisher rulează pe DGX remote
#   local = producție pe DGX, bridge_publisher rulează local
BRIDGE_MODE=ssh

# DGX SSH connection (folosit doar dacă BRIDGE_MODE=ssh)
DGX_HOST=100.93.193.85
DGX_USER=sparkacda1
DGX_SSH_KEY_PATH=~/.ssh/acda_dgx_ed25519

# Path bridge_publisher pe DGX (folosit de ambele moduri)
BRIDGE_PUBLISHER_PATH=~/acda-bridge/bridge_publisher.py

# Timeout pentru subprocess publish (secunde)
BRIDGE_SUBPROCESS_TIMEOUT_SEC=30
```

**Cristian setează în `.env` real (nu commit):** `DGX_HOST`, `DGX_USER`, `DGX_SSH_KEY_PATH` cu valorile exacte.

### 0.2 Test SSH funcțional (obligatoriu înainte de Faza 1)

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 sparkacda1@${DGX_HOST} 'echo ok && uname -n'
# Expected:
#   ok
#   spark-e0f5  (sau hostname DGX)
#   Exit 0, <2s
```

**STOP dacă test-ul eșuează** — Cristian rezolvă (cheie lipsă, Tailscale down, etc.) înainte de continuare.

### Definition of Done Faza 0

- [ ] `.env.example` actualizat cu cele 5 variabile noi
- [ ] `.env` local (netracked) configurat cu valori reale
- [ ] Test SSH returnează `ok` în <2s

---

## FAZA 1 — Adapter `BridgePublisher` (50 min)

### 1.1 Fișier: `src/contracts/frontier-schemas.ts`

```typescript
import { z } from 'zod';

// Request body pentru POST /trigger-frontier
export const TriggerFrontierRequest = z.object({
  gdrive_input_link: z.string().url(),
  agent_name: z.literal('Agent_CTD').default('Agent_CTD'),
  priority: z.enum(['P0', 'P1', 'P2']).default('P1'),
  sla_hours: z.number().int().positive().default(24),
  metadata: z.record(z.unknown()).default({})
});
export type TriggerFrontierRequest = z.infer<typeof TriggerFrontierRequest>;

// Response de la bridge_publisher.publish (JSON parsat din stdout)
export const BridgePublishResponse = z.object({
  task_id: z.string().min(1),
  notion_task_id: z.string().min(1),
  routine_session_url: z.string().url()
});
export type BridgePublishResponse = z.infer<typeof BridgePublishResponse>;

// Response handler POST /trigger-frontier
export const TriggerFrontierResponse = BridgePublishResponse.extend({
  project_id: z.string(),
  frontier_status: z.literal('QUEUED'),
  frontier_started_at: z.string().datetime()
});

// Response handler GET /frontier-status
export const FrontierStatusResponse = z.object({
  project_id: z.string(),
  frontier_status: z.enum(['NOT_STARTED','QUEUED','IN_PROGRESS','DONE','FAILED']),
  verdict: z.enum(['PASS','WARN','FAIL']).nullable(),
  verdict_override: z.enum(['PASS','WARN','FAIL']).nullable(),
  effective_verdict: z.enum(['PASS','WARN','FAIL']).nullable(),
  gdrive_output_link: z.string().url().nullable(),
  notion_task_id: z.string().nullable(),
  routine_session_url: z.string().url().nullable(),
  frontier_started_at: z.string().datetime().nullable(),
  frontier_completed_at: z.string().datetime().nullable(),
  elapsed_seconds: z.number().int().nullable()
});
export type FrontierStatusResponse = z.infer<typeof FrontierStatusResponse>;

// Erori bridge (din stderr JSON)
export const BridgeError = z.object({
  error_type: z.enum([
    'RATE_LIMIT','NETWORK','INVALID_INPUT','ROUTINE_DOWN','TIMEOUT','INTERNAL'
  ]),
  message: z.string(),
  // v1.1 — contract 2 extins (doar pentru RATE_LIMIT, absent pentru celelalte):
  retry_after_seconds: z.number().int().positive().optional(),
  // v1.1 — audit Wazuh, tolerat permisiv:
  debug_context: z.record(z.unknown()).optional()
});
export type BridgeError = z.infer<typeof BridgeError>;
```

### 1.2 Fișier: `src/services/bridge.ts`

```typescript
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import {
  BridgePublishResponse,
  BridgeError,
  type TriggerFrontierRequest
} from '../contracts/frontier-schemas';

const execAsync = promisify(exec);

const BRIDGE_MODE = (process.env.BRIDGE_MODE ?? 'ssh') as 'ssh' | 'local';
const DGX_HOST = process.env.DGX_HOST;
const DGX_USER = process.env.DGX_USER;
const DGX_SSH_KEY_PATH = process.env.DGX_SSH_KEY_PATH;
const BRIDGE_PUBLISHER_PATH = process.env.BRIDGE_PUBLISHER_PATH ?? '~/acda-bridge/bridge_publisher.py';
const TIMEOUT_SEC = Number(process.env.BRIDGE_SUBPROCESS_TIMEOUT_SEC ?? 30);

interface PublishArgs extends TriggerFrontierRequest {
  project_id: string;
}

export class BridgeError_Thrown extends Error {
  constructor(
    public readonly error_type: BridgeError['error_type'],
    message: string,
    public readonly retry_after_seconds?: number,  // v1.1 — doar pentru RATE_LIMIT
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

/**
 * Apelează bridge_publisher.publish pe DGX. Ruta aleasă depinde de BRIDGE_MODE.
 * Aruncă BridgeError_Thrown cu error_type clasificat la orice eșec.
 */
export async function triggerFrontier(args: PublishArgs): Promise<z.infer<typeof BridgePublishResponse>> {
  if (BRIDGE_MODE === 'ssh') return execViaSSH(args);
  return execLocal(args);
}

function buildCliCommand(args: PublishArgs): string {
  const metadataFull = { ...args.metadata, project_id: args.project_id };
  const metadataJson = JSON.stringify(metadataFull).replace(/'/g, "'\\''"); // shell-escape

  return [
    `python3 ${BRIDGE_PUBLISHER_PATH} publish`,
    `--task-type CTD_FULL`,
    `--gdrive-input-link ${JSON.stringify(args.gdrive_input_link)}`,
    `--agent-name ${JSON.stringify(args.agent_name)}`,
    `--priority ${args.priority}`,
    `--sla-hours ${args.sla_hours}`,
    `--metadata-json '${metadataJson}'`
  ].join(' ');
}

async function execViaSSH(args: PublishArgs): Promise<z.infer<typeof BridgePublishResponse>> {
  if (!DGX_HOST || !DGX_USER) {
    throw new BridgeError_Thrown('INVALID_INPUT', 'DGX_HOST și DGX_USER necesare pentru BRIDGE_MODE=ssh');
  }
  const cli = buildCliCommand(args);
  const sshCmd = [
    'ssh',
    '-o BatchMode=yes',
    '-o ConnectTimeout=10',
    '-o StrictHostKeyChecking=accept-new',
    DGX_SSH_KEY_PATH ? `-i ${DGX_SSH_KEY_PATH}` : '',
    `${DGX_USER}@${DGX_HOST}`,
    JSON.stringify(cli)
  ].filter(Boolean).join(' ');

  return runAndParse(sshCmd);
}

async function execLocal(args: PublishArgs): Promise<z.infer<typeof BridgePublishResponse>> {
  const cli = buildCliCommand(args);
  return runAndParse(cli);
}

async function runAndParse(cmd: string): Promise<z.infer<typeof BridgePublishResponse>> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: TIMEOUT_SEC * 1000 });

    // Exit 0 but stderr non-empty = warning, ignore
    if (!stdout.trim()) {
      throw new BridgeError_Thrown('INTERNAL', `Empty stdout (stderr: ${stderr?.slice(0, 200)})`);
    }

    const parsed = JSON.parse(stdout);
    return BridgePublishResponse.parse(parsed);

  } catch (err: unknown) {
    // Zod parse error = malformed response
    if (err instanceof z.ZodError) {
      throw new BridgeError_Thrown('INTERNAL', 'Malformed JSON response', err.errors);
    }

    // exec error with stderr (exit != 0)
    if (err && typeof err === 'object' && 'stderr' in err) {
      const stderr = String((err as { stderr: string }).stderr ?? '').trim();
      if (stderr) {
        try {
          const parsed = JSON.parse(stderr);
          const bridgeErr = BridgeError.parse(parsed);
          throw new BridgeError_Thrown(
            bridgeErr.error_type,
            bridgeErr.message,
            bridgeErr.retry_after_seconds  // v1.1 — propagă către handler pentru HTTP Retry-After header
          );
        } catch (inner) {
          if (inner instanceof BridgeError_Thrown) throw inner;
        }
      }
    }

    // Timeout
    if (err && typeof err === 'object' && 'killed' in err && (err as { killed: boolean }).killed) {
      throw new BridgeError_Thrown('TIMEOUT', `Subprocess timeout după ${TIMEOUT_SEC}s`);
    }

    // Re-raise if already BridgeError
    if (err instanceof BridgeError_Thrown) throw err;

    // Unknown
    throw new BridgeError_Thrown('INTERNAL', String(err));
  }
}
```

### 1.3 Mapping `BridgeError.error_type` → HTTP status

| `error_type` | HTTP status | Semantic | Header extras |
|--------------|-------------|----------|---------------|
| `RATE_LIMIT` | 429 | Rutină în rate-limit Anthropic; UI retry | `Retry-After: {retry_after_seconds}` (v1.1) |
| `NETWORK` | 503 | DGX unreachable, Tailscale down | — |
| `INVALID_INPUT` | 400 | Parametru lipsă/invalid (config sau body) | — |
| `ROUTINE_DOWN` | 503 | Rutina `acda-ctd-full` inactivă/nepublicată | — |
| `TIMEOUT` | 504 | SSH subprocess >30s | — |
| `INTERNAL` | 502 | Parse JSON eșuat, stdout gol, etc. | — |

### Definition of Done Faza 1

- [ ] `src/services/bridge.ts` compilează strict TypeScript (zero `any` expus public)
- [ ] `src/contracts/frontier-schemas.ts` compilează, exporturi Zod accesibile
- [ ] Test unitar manual: stub `exec` care returnează fixture JSON valid → `triggerFrontier` returnează obiect tipat
- [ ] Test unitar manual: stub `exec` care aruncă timeout → throw `BridgeError_Thrown` cu `error_type='TIMEOUT'`

---

## FAZA 2 — Handler `POST /api/ctd/:project_id/trigger-frontier` (50 min)

### 2.1 Fișier: `server/ctd-frontier-routes.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { triggerFrontier, BridgeError_Thrown } from '../src/services/bridge';
import {
  TriggerFrontierRequest,
  TriggerFrontierResponse
} from '../src/contracts/frontier-schemas';
import { isValidTransition } from '../src/contracts/agent-contracts';
import { getFrontierStatusCached } from '../src/services/frontier-status-cache';

const BRIDGE_ERROR_TO_HTTP: Record<string, number> = {
  RATE_LIMIT: 429,
  NETWORK: 503,
  INVALID_INPUT: 400,
  ROUTINE_DOWN: 503,
  TIMEOUT: 504,
  INTERNAL: 502
};

export function ctdFrontierRouter(db: Database.Database): Router {
  const router = Router();

  // ---------- POST /api/ctd/:project_id/trigger-frontier ----------
  router.post('/:project_id/trigger-frontier', async (req, res) => {
    const { project_id } = req.params;
    let body: z.infer<typeof TriggerFrontierRequest>;
    try {
      body = TriggerFrontierRequest.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'VALIDATION', issues: err.errors });
      }
      throw err;
    }

    // Validare existență + stare curentă
    const project = db.prepare(
      'SELECT id, status, frontier_status FROM Project WHERE id = ?'
    ).get(project_id) as { id: string; status: string; frontier_status: string } | undefined;

    if (!project) return res.status(404).json({ error: 'PROJECT_NOT_FOUND', project_id });

    // Tranziție legală: CIORNĂ → RUTINĂ_FRONTIER
    if (!isValidTransition(project.status as any, 'RUTINĂ_FRONTIER')) {
      return res.status(400).json({
        error: 'INVALID_STATE',
        message: `Tranziția necesită status=CIORNĂ (actual: ${project.status})`
      });
    }

    // Double-fire prevention
    if (project.frontier_status === 'QUEUED' || project.frontier_status === 'IN_PROGRESS') {
      return res.status(409).json({
        error: 'ALREADY_RUNNING',
        message: `Rutina deja în ${project.frontier_status}`
      });
    }

    // Apel bridge
    try {
      const bridgeResp = await triggerFrontier({ ...body, project_id });
      const startedAt = new Date().toISOString();

      // UPDATE atomic — trigger updated_at preia timestamp-ul
      db.prepare(`
        UPDATE Project SET
          status = 'RUTINĂ_FRONTIER',
          frontier_status = 'QUEUED',
          notion_task_id = ?,
          routine_session_url = ?,
          frontier_started_at = ?,
          frontier_completed_at = NULL,
          verdict = NULL,
          gdrive_output_link = NULL
        WHERE id = ?
      `).run(bridgeResp.notion_task_id, bridgeResp.routine_session_url, startedAt, project_id);

      const resp = TriggerFrontierResponse.parse({
        project_id,
        task_id: bridgeResp.task_id,
        notion_task_id: bridgeResp.notion_task_id,
        routine_session_url: bridgeResp.routine_session_url,
        frontier_status: 'QUEUED',
        frontier_started_at: startedAt
      });

      return res.status(202).json(resp);

    } catch (err) {
      if (err instanceof BridgeError_Thrown) {
        const status = BRIDGE_ERROR_TO_HTTP[err.error_type] ?? 502;
        // v1.1 — propagă Retry-After header pentru RATE_LIMIT
        if (err.error_type === 'RATE_LIMIT' && err.retry_after_seconds) {
          res.setHeader('Retry-After', String(err.retry_after_seconds));
        }
        return res.status(status).json({
          error: 'BRIDGE_ERROR',
          error_type: err.error_type,
          message: err.message,
          ...(err.retry_after_seconds !== undefined && { retry_after_seconds: err.retry_after_seconds })
        });
      }
      console.error('[trigger-frontier]', err);
      return res.status(500).json({ error: 'INTERNAL', message: String(err) });
    }
  });

  // ---------- GET /api/ctd/:project_id/frontier-status ----------
  router.get('/:project_id/frontier-status', (req, res) => {
    try {
      const status = getFrontierStatusCached(db, req.params.project_id);
      if (!status) return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
      return res.json(status);
    } catch (err) {
      console.error('[frontier-status]', err);
      return res.status(500).json({ error: 'INTERNAL', message: String(err) });
    }
  });

  return router;
}
```

### 2.2 Mount în `server/index.ts`

```typescript
import { ctdFrontierRouter } from './ctd-frontier-routes';
// ... după celelalte route mounts:
app.use('/api/ctd', ctdFrontierRouter(db));
```

### Definition of Done Faza 2

- [ ] Handler înregistrat la `/api/ctd/:project_id/trigger-frontier`
- [ ] Toate cele 6 ramuri de eroare returnează HTTP status corect (400/404/409/429/503/504/502)
- [ ] UPDATE atomic — proiect nu e niciodată în stare intermediară (status=RUTINĂ_FRONTIER + frontier_status=NOT_STARTED)
- [ ] Test manual: `curl` cu body valid pe proiect CIORNĂ → 202 + JSON matching `TriggerFrontierResponse`
- [ ] Test manual: `curl` pe proiect deja în APROBAT → 400 `INVALID_STATE`
- [ ] Test manual: `curl` de 2x consecutiv rapid → al doilea 409 `ALREADY_RUNNING`
- [ ] **v1.1** — Test manual: bridge mock returnează `{error_type: 'RATE_LIMIT', retry_after_seconds: 120}` → HTTP 429 cu header `Retry-After: 120` + body JSON include `retry_after_seconds: 120`

---

## FAZA 3 — Handler `GET /frontier-status` + cache (30 min)

### 3.1 Fișier: `src/services/frontier-status-cache.ts`

```typescript
import type Database from 'better-sqlite3';
import { FrontierStatusResponse } from '../contracts/frontier-schemas';

const CACHE_TTL_MS = 5_000;
const cache = new Map<string, { value: unknown; expires: number }>();

export function getFrontierStatusCached(
  db: Database.Database,
  projectId: string
) {
  const now = Date.now();
  const hit = cache.get(projectId);
  if (hit && hit.expires > now) return hit.value;

  const row = db.prepare(`
    SELECT
      id AS project_id,
      frontier_status, verdict, verdict_override,
      gdrive_output_link, notion_task_id, routine_session_url,
      frontier_started_at, frontier_completed_at
    FROM Project WHERE id = ?
  `).get(projectId) as any;

  if (!row) return null;

  const effective_verdict = row.verdict_override ?? row.verdict ?? null;
  const elapsed_seconds = row.frontier_started_at
    ? Math.floor((now - new Date(row.frontier_started_at).getTime()) / 1000)
    : null;

  const value = FrontierStatusResponse.parse({
    ...row,
    effective_verdict,
    elapsed_seconds
  });

  cache.set(projectId, { value, expires: now + CACHE_TTL_MS });
  return value;
}

// Pentru testare: clear cache
export function clearFrontierStatusCache(projectId?: string) {
  if (projectId) cache.delete(projectId);
  else cache.clear();
}
```

### 3.2 Notă arhitecturală cache

TTL 5s e optim pentru polling UI la 10s: 50% cache hit rate minim, fără risc de staleness perceptibilă. Map in-memory e OK pentru single-instance backend (situația curentă); la scale-out trebuie Redis, dar asta e post Val 1.

Invalidare explicită cache: apelează `clearFrontierStatusCache(projectId)` imediat după UPDATE din handler `trigger-frontier` — garantează că primul GET post-trigger vede starea nouă fără delay 5s.

Adaugă în handler `trigger-frontier` după UPDATE:
```typescript
import { clearFrontierStatusCache } from '../src/services/frontier-status-cache';
// ...
clearFrontierStatusCache(project_id);
```

### Definition of Done Faza 3

- [ ] GET returnează JSON valid matching `FrontierStatusResponse`
- [ ] `effective_verdict` = `verdict_override` când e setat, altfel `verdict`
- [ ] `elapsed_seconds` calculat corect (sau null dacă `frontier_started_at` null)
- [ ] Test manual: 2 request-uri consecutive în <5s returnează același payload (cache hit); după 5s, refresh
- [ ] Test manual: trigger-frontier urmat imediat de GET → vede `QUEUED` fără delay (cache invalidat)

---

## FAZA 4 — Runbook `docs/runbooks/ssh-to-dgx.md` (20 min)

### 4.1 Fișier: `docs/runbooks/ssh-to-dgx.md`

```markdown
# Runbook — SSH MacBook → DGX (ACDA Bridge)

**Scop:** stabilește conexiune SSH non-interactivă de la MacBook Air M5 către DGX
Spark (user `sparkacda1`) pentru apelare `bridge_publisher.py publish`.

**Ultima actualizare:** 17 Apr 2026 (TE-CTD-FRONTIER-API-001)

---

## 1. Setup inițial (o singură dată)

### 1.1 Cheie SSH non-interactivă

Cheia deja configurată: `~/.ssh/acda_dgx_ed25519` (ed25519, fără passphrase).
Dacă nu există, Cristian generează:

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/acda_dgx_ed25519 -C "acda-mac-to-dgx"
ssh-copy-id -i ~/.ssh/acda_dgx_ed25519.pub sparkacda1@<tailscale-ip>
```

### 1.2 Tailscale

DGX accesibil prin Tailscale `tailnet ts.net`. Verifică:

```bash
tailscale status | grep spark
# Expected: spark-e0f5 ... sparkacda1  online
```

Dacă offline: `tailscale up` pe ambele noduri.

### 1.3 Credențiale — Dashlane

Entry: **„ACDA OS — Infrastructure → DGX Spark SSH"**
Conține: IP Tailscale, hostname `ts.net`, key path, passphrase (dacă există).

---

## 2. Test funcțional (rulat înainte de orice deploy API-001)

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 \
    -i ~/.ssh/acda_dgx_ed25519 \
    sparkacda1@100.93.193.85 \
    'echo ok && uname -n && which python3'
```

**Expected:**
```
ok
spark-e0f5
/usr/bin/python3
```
Exit 0, <2s. Dacă oricare e diferit → Troubleshooting §3.

---

## 3. Troubleshooting

| Simptom | Cauză probabilă | Fix |
|---------|-----------------|-----|
| `Permission denied (publickey)` | Cheia nu e pe DGX `~/.ssh/authorized_keys` | `ssh-copy-id` re-run, sau Cristian adaugă manual |
| `Connection timed out` | Tailscale down sau DGX offline | `tailscale up` pe ambele, verifică `tailscale status` |
| `Connection refused` | SSH daemon oprit pe DGX | SSH direct pe consolă DGX, `sudo systemctl start ssh` |
| `Host key verification failed` | DGX re-imaged | `ssh-keygen -R 100.93.193.85` apoi reconectează (accept new) |
| Latență SSH >5s | Tailscale routing suboptim | Verifică `tailscale ping spark-e0f5`; dacă >500ms, restart Tailscale |
| `BatchMode=yes` dar cere password | Passphrase pe cheie neîncărcată în agent | `ssh-add ~/.ssh/acda_dgx_ed25519` |

---

## 4. Test end-to-end `bridge_publisher.py publish` (după TE-BRIDGE-ROUTINES-001 Faza 4.3)

```bash
ssh sparkacda1@100.93.193.85 'python3 ~/acda-bridge/bridge_publisher.py publish \
  --task-type CTD_FULL \
  --gdrive-input-link "https://drive.google.com/file/d/TEST/view" \
  --agent-name Agent_CTD \
  --priority P2 \
  --sla-hours 24 \
  --metadata-json "{\"project_id\":\"test-ping-001\",\"dry_run\":true}"'
```

**Expected stdout (JSON):**
```json
{"task_id":"t-xxxx","notion_task_id":"...","routine_session_url":"https://claude.ai/code/sessions/sess_..."}
```

Exit 0. Dacă diferit → raport CLI la Claude Code (TE-BRIDGE-ROUTINES-001).

---

## 5. Rollback / dezactivare bridge (v1.1 — contract 4 extins)

### 5.1 Circuit breaker per-rutină

Naming canonic: `~/acda-bridge/.circuit-breaker-{ROUTINE_SLUG}` (un fișier per
rutină, oprire selectivă fără blocaj global).

Conținut fișier (JSON, opțional):
```json
{
  "reason": "maintenance rutină post-incident",
  "auto_expire_at": "2026-04-18T22:00:00+03:00",
  "created_by": "cristian"
}
```

Systemd timer `~/acda-bridge/systemd/circuit-breaker-cleanup.timer` pe DGX
verifică la 5 min și șterge fișierele cu `auto_expire_at` în trecut.

### 5.2 CLI helper — subcomenzi operaționale

```bash
# Activare circuit breaker cu expirare automată
python3 ~/acda-bridge/bridge_publisher.py break acda-ctd-full \
  --reason "maintenance post-incident" \
  --expire-in 3600

# Dezactivare imediată
python3 ~/acda-bridge/bridge_publisher.py unbreak acda-ctd-full

# Verificare stare
python3 ~/acda-bridge/bridge_publisher.py status acda-ctd-full
# Output: {"routine":"acda-ctd-full","broken":true,"reason":"...","expires_in_sec":1800}
```

### 5.3 Comportament aplicativ

- Când circuit breaker activ: CLI `publish` returnează imediat `{"error_type":"ROUTINE_DOWN","message":"Circuit breaker active: {reason}"}` pe stderr, exit 1
- Handler Express traduce în HTTP 503 cu body `{"error":"BRIDGE_ERROR","error_type":"ROUTINE_DOWN"}`
- UI afișează mesaj utilizator: „Rutina temporar indisponibilă. Reîncearcă după {durata}."

Pentru reactivare manuală sau urgentă: `unbreak` prin CLI (fără să aștepți expirarea automată).

---

*ACDA Consulting | Runbook SSH-to-DGX | 17 Apr 2026*
```

### Definition of Done Faza 4

- [ ] Runbook scris și commited în `docs/runbooks/`
- [ ] Comanda test din §2 rulează și returnează exact expected output
- [ ] Pas 3 (`tailscale ping`) verificat: latență <100ms

---

## FAZA 5 — Test integrare (40 min)

### 5.1 Fișier: `tests/fixtures/bridge-publisher-responses.ts`

```typescript
export const FIXTURE_SUCCESS = {
  task_id: 't-a7f3-4b2c-9d1e',
  notion_task_id: 'notion-page-abcd1234',
  routine_session_url: 'https://claude.ai/code/sessions/sess_xyz789'
};

// v1.1 — include retry_after_seconds + debug_context (contract 2 extins)
export const FIXTURE_RATE_LIMIT_ERROR = {
  error_type: 'RATE_LIMIT',
  message: 'Rate limit exceeded: 15/day Max x20 bucket',
  retry_after_seconds: 120,
  debug_context: {
    anthropic_header_retry_after: '120',
    bucket: 'routines_daily'
  }
};

export const FIXTURE_NETWORK_ERROR = {
  error_type: 'NETWORK',
  message: 'DGX unreachable via Tailscale'
};
```

### 5.2 Fișier: `tests/integration/bridge-trigger.test.ts`

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { buildTestApp } from '../helpers/test-app';
import { FIXTURE_SUCCESS, FIXTURE_RATE_LIMIT_ERROR, FIXTURE_NETWORK_ERROR } from '../fixtures/bridge-publisher-responses';

// Mock bridge service
vi.mock('../../src/services/bridge', async () => {
  const actual = await vi.importActual<any>('../../src/services/bridge');
  return {
    ...actual,
    triggerFrontier: vi.fn()
  };
});
import { triggerFrontier, BridgeError_Thrown } from '../../src/services/bridge';

describe('POST /api/ctd/:id/trigger-frontier', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp(); // seed CloudServe in CIORNĂ
  });

  test('happy path: CIORNĂ project → 202 + DB updated', async () => {
    (triggerFrontier as any).mockResolvedValue(FIXTURE_SUCCESS);

    const res = await request(app)
      .post('/api/ctd/p-cloudserve-001/trigger-frontier')
      .send({ gdrive_input_link: 'https://drive.google.com/file/d/ABC/view' });

    expect(res.status).toBe(202);
    expect(res.body.task_id).toBe(FIXTURE_SUCCESS.task_id);
    expect(res.body.frontier_status).toBe('QUEUED');

    // Verifică DB
    const row = app.db.prepare('SELECT status, frontier_status, notion_task_id FROM Project WHERE id = ?')
      .get('p-cloudserve-001') as any;
    expect(row.status).toBe('RUTINĂ_FRONTIER');
    expect(row.frontier_status).toBe('QUEUED');
    expect(row.notion_task_id).toBe(FIXTURE_SUCCESS.notion_task_id);
  });

  test('invalid state: APROBAT project → 400 INVALID_STATE', async () => {
    app.db.prepare('UPDATE Project SET status = ? WHERE id = ?').run('APROBAT', 'p-cloudserve-001');

    const res = await request(app)
      .post('/api/ctd/p-cloudserve-001/trigger-frontier')
      .send({ gdrive_input_link: 'https://drive.google.com/file/d/ABC/view' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_STATE');
    expect(triggerFrontier).not.toHaveBeenCalled();
  });

  test('double-fire: second call in QUEUED → 409 ALREADY_RUNNING', async () => {
    (triggerFrontier as any).mockResolvedValue(FIXTURE_SUCCESS);
    await request(app).post('/api/ctd/p-cloudserve-001/trigger-frontier')
      .send({ gdrive_input_link: 'https://drive.google.com/file/d/ABC/view' });

    const res2 = await request(app).post('/api/ctd/p-cloudserve-001/trigger-frontier')
      .send({ gdrive_input_link: 'https://drive.google.com/file/d/ABC/view' });

    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('ALREADY_RUNNING');
  });

  test('bridge rate limit → 429 + Retry-After header (v1.1)', async () => {
    (triggerFrontier as any).mockRejectedValue(
      new BridgeError_Thrown('RATE_LIMIT', FIXTURE_RATE_LIMIT_ERROR.message, 120)
    );

    const res = await request(app).post('/api/ctd/p-cloudserve-001/trigger-frontier')
      .send({ gdrive_input_link: 'https://drive.google.com/file/d/ABC/view' });

    expect(res.status).toBe(429);
    expect(res.body.error_type).toBe('RATE_LIMIT');
    expect(res.body.retry_after_seconds).toBe(120);
    expect(res.headers['retry-after']).toBe('120');  // v1.1 — contract 2
    // DB neschimbat
    const row = app.db.prepare('SELECT status FROM Project WHERE id = ?').get('p-cloudserve-001') as any;
    expect(row.status).toBe('CIORNĂ');
  });

  test('bridge network error → 503', async () => {
    (triggerFrontier as any).mockRejectedValue(
      new BridgeError_Thrown('NETWORK', FIXTURE_NETWORK_ERROR.message)
    );

    const res = await request(app).post('/api/ctd/p-cloudserve-001/trigger-frontier')
      .send({ gdrive_input_link: 'https://drive.google.com/file/d/ABC/view' });

    expect(res.status).toBe(503);
    const row = app.db.prepare('SELECT status FROM Project WHERE id = ?').get('p-cloudserve-001') as any;
    expect(row.status).toBe('CIORNĂ');
  });
});
```

### 5.3 Helper `tests/helpers/test-app.ts` (NOU dacă nu există)

Setup Express app cu SQLite in-memory + seed CloudServe. Reutilizabil pentru teste viitoare.

### Definition of Done Faza 5

- [ ] Toate 5 teste trec pe `npm run test`
- [ ] Coverage pe `src/services/bridge.ts` și `server/ctd-frontier-routes.ts` ≥80%
- [ ] Nicio scurgere de mock între teste (`vi.clearAllMocks()` în `beforeEach`)

---

## FAZA 6 — Triplu Audit (20 min)

### 6.1 Pre-Activare

- [ ] Backup DB: `cp database/acda.db database/acda.db.backup-before-api001-$(date +%Y%m%d-%H%M%S)`
- [ ] SSH test reușit (Faza 0.2 re-rulat)
- [ ] Dependențele #2 și #3 (CLI + rutină) confirmate live de Cristian

### 6.2 Securitate

- [ ] `grep -iE 'sk-ant|CLAUDE_CODE_OAUTH|ROUTINE_.*_TOKEN' src/ server/ .env.example` → 0 match
- [ ] `.env` real în `.gitignore` (nu committed)
- [ ] Handler NU loghează body complet al request-urilor (ar putea conține PII din GDrive links)
- [ ] Timeout 30s aplicat efectiv (test manual cu stub `exec` care așteaptă 35s → throw TIMEOUT)
- [ ] SSH comandă escapată corect (test: `gdrive_input_link` cu caractere speciale `'\"<>;` nu permite injection)

### 6.3 Post-Activare

- [ ] `npm run dev` pornește fără erori
- [ ] `curl -X POST localhost:3001/api/ctd/p-cloudserve-001/trigger-frontier -H 'Content-Type: application/json' -d '{"gdrive_input_link":"https://drive.google.com/file/d/DRY_RUN/view"}'` — fie 202 (dacă CLI live), fie 503 NETWORK / 502 INTERNAL clar documentat
- [ ] `curl localhost:3001/api/ctd/p-cloudserve-001/frontier-status` → 200 + JSON
- [ ] UI dashboard: NO change (UI-001 e următorul TE) — confirmă că API-ul răspunde pe port fără a afecta rendering curent

### Definition of Done Faza 6

- [ ] Cele 3 secțiuni audit completate în PR description
- [ ] Output-uri `curl` atașate

---

## Ordine execuție

```
F0 (env)  →  F1 (adapter)  →  F2 (POST)  →  F3 (GET)  →  F4 (runbook)  →  F5 (test)  →  F6 (audit)
 10 min       50 min           50 min        30 min      20 min           40 min       20 min
                                                                            Total: ~3h 40min
```

**Checkpoint raportare:** după Faza 2 închisă, înainte de Faza 3 — raport către Cristian cu output test manual `curl POST /trigger-frontier`.

**Commit strategy:** 1 commit per fază, PR unic pe branch `feat/frontier-api-v13`.

---

## gstack pipeline

| Stage | Ce verifică |
|-------|-------------|
| `/review` | Sintaxa TS, naming, adapter pattern curat |
| `/cso` | Zero secrete, shell-escape SSH, NU loghează body complet |
| `/qa` | `npm run test` PASS, 5 scenarii mock PASS |
| `/canary` | `curl` manual pe endpoint real cu CLI dry_run |
| `/ship` | `git commit -m "feat(api): frontier trigger + status endpoints + SSH bridge adapter (TE-CTD-FRONTIER-API-001)"` |

---

## Blast Radius

| Componentă | Impact | Risc |
|-----------|--------|------|
| Adapter `bridge.ts` | Modul nou izolat | LOW |
| Handler POST | Schimbă DB state la success | MEDIU — mitigat prin validare stat + UPDATE atomic |
| Handler GET | Read-only + cache | ZERO |
| SSH dependency extern | Adaugă nou failure mode | MEDIU — mitigat prin timeout + error mapping clar |
| UI dashboard | Zero modificare | ZERO |
| Agent_CTD DGX | Zero modificare | ZERO |
| Cache in-memory | Stare per-instance; la restart se pierde | LOW — reconstruit din DB la primul GET |

---

## Reguli execuție Claude Code

1. **STOP dacă SSH test eșuează** (Faza 0.2) — raport Cristian
2. **STOP dacă dependența #2 (CLI) nu e live** la Faza 5 (teste mock pot rula, dar test real `curl` nu)
3. **gstack obligatoriu** — oprire la primul FAIL
4. **Zero hardcodare** credențiale sau host
5. **TypeScript strict** — zero `any` în semnături publice (ok `any` pentru `db.prepare().get()` unde better-sqlite3 nu are tipuri)
6. **NU loga body complet** al request-urilor (PII în GDrive links)
7. **NU copia `ROUTINE_CTD_FULL_TOKEN`** în `.env` CTD — rămâne pe DGX
8. **Shell-escape obligatoriu** pentru `metadata_json` în SSH command
9. **Timeout 30s aplicat strict** — verificat în Faza 6.2

---

## Anexa A — Specificația CLI `bridge_publisher.py` (v1.1 — contracte 2+4 extinse)

Dependență pentru TE-BRIDGE-ROUTINES-001 Faza 4.3. Include în TE-ul acela ca DoD
cu 3 assert-uri formale (stdout schema + task_id format + exit code pe error) — confirmate de Claude DGX.

### A.1 Subcomanda `publish`

```
python3 ~/acda-bridge/bridge_publisher.py publish \
  --task-type CTD_FULL \
  --gdrive-input-link "https://drive.google.com/file/d/XXX/view" \
  --agent-name "Agent_CTD" \
  --priority P1 \
  --sla-hours 24 \
  --metadata-json '{"project_id":"ctd-44521837-20260417","pii_masked":true}'
```

**stdout (exit 0, JSON):**
```json
{
  "task_id": "t-a7f3-4b2c",
  "notion_task_id": "notion-page-abc",
  "routine_session_url": "https://claude.ai/code/sessions/sess_xyz"
}
```

**stderr (exit != 0, JSON):**

Pentru `error_type=RATE_LIMIT`:
```json
{
  "error_type": "RATE_LIMIT",
  "message": "Rate limit exceeded: 15/day Max x20 bucket",
  "retry_after_seconds": 120,
  "debug_context": {
    "anthropic_header_retry_after": "120",
    "bucket": "routines_daily",
    "reset_at": "2026-04-18T00:00:00Z"
  }
}
```

Pentru celelalte 5 `error_type` (NETWORK / INVALID_INPUT / ROUTINE_DOWN / TIMEOUT / INTERNAL):
```json
{
  "error_type": "NETWORK",
  "message": "DGX unreachable via Tailscale"
}
```
`retry_after_seconds` și `debug_context` absente (Zod le tolerează permisiv).

### A.2 Subcomenzile `break` / `unbreak` / `status`

```bash
# Activare circuit breaker per-rutină
python3 ~/acda-bridge/bridge_publisher.py break {ROUTINE_SLUG} \
  --reason "<motiv>" \
  [--expire-in <secunde>]

# Dezactivare
python3 ~/acda-bridge/bridge_publisher.py unbreak {ROUTINE_SLUG}

# Verificare stare
python3 ~/acda-bridge/bridge_publisher.py status {ROUTINE_SLUG}
# Output (broken): {"routine":"...","broken":true,"reason":"...","expires_in_sec":1800}
# Output (healthy): {"routine":"...","broken":false}
```

### A.3 Circuit breaker — semantica fișier marker

- Fișier: `~/acda-bridge/.circuit-breaker-{ROUTINE_SLUG}` existent → `publish` returnează imediat `{"error_type":"ROUTINE_DOWN","message":"Circuit breaker active: <reason>"}` fără POST către Anthropic
- Conținut JSON opțional: `reason`, `auto_expire_at`, `created_by`
- Systemd timer DGX (la 5 min) curăță fișierele cu `auto_expire_at` în trecut

---

## Anexa B — Dry-run mode `bridge_publisher.py`

Pentru testare end-to-end fără să consume rate limit:

- `--metadata-json '{"dry_run":true,...}'` → CLI validează parametri + returnează `FIXTURE_SUCCESS` fără POST real
- Mock util pentru Faza 6.3 `/canary`

Include în TE-BRIDGE-ROUTINES-001 Faza 4.3 DoD.

---

## Referințe

| Document | Ce furnizează |
|----------|--------------|
| `TE-CTD-FRONTIER-SCHEMA-001 v1.1` | Schema v1.3 (pre-requisite) + FlowStatus + isValidTransition |
| `CTD_Bridge_Integration_Brief_17Apr2026.md` §2.2 §4.2 §4.3 | Specificația handler-elor |
| Răspuns Cristian 17 Apr 2026 A2 | Decizia SSH subprocess + spec CLI |
| `TE-BRIDGE-ROUTINES-001 v1.0` Faza 4.3 | Owner CLI `bridge_publisher.py publish` |
| Anthropic ToS Consumer §3.7 | Restricție `-p` headless interzisă |

---

## Livrabile finale (checklist consolidat)

- [ ] Test SSH funcțional (Faza 0.2) PASS
- [ ] `src/services/bridge.ts` — adapter 2 moduri
- [ ] `src/services/frontier-status-cache.ts` — cache 5s TTL
- [ ] `src/contracts/frontier-schemas.ts` — Zod complet
- [ ] `server/ctd-frontier-routes.ts` — 2 handler-e
- [ ] `server/index.ts` — mount router
- [ ] `tests/integration/bridge-trigger.test.ts` — 5 teste PASS
- [ ] `tests/fixtures/bridge-publisher-responses.ts` — fixtures
- [ ] `tests/helpers/test-app.ts` — helper reutilizabil
- [ ] `docs/runbooks/ssh-to-dgx.md` — runbook complet
- [ ] `.env.example` — 5 variabile noi
- [ ] `CLAUDE.md §5` — secțiune nouă "Frontier Bridge"
- [ ] Checkpoint raport după Faza 2 transmis
- [ ] Triplu Audit documentat în PR description
- [ ] PR pe branch `feat/frontier-api-v13` — merge după approval Cristian

---

*ACDA Consulting SRL | acda.ro | TE-CTD-FRONTIER-API-001 v1.1 | 17 Aprilie 2026 | Confidențial*

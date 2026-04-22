# DEPLOY_REPORT — CLOUDRUN-CTD-001 v1.1

> Raport execuție TE-14 CLOUDRUN-CTD-001 v1.1 (Cloud Run + Tailscale + PG DGX).
> Executor: Claude Code Opus 4.7 (1M context), branch `claude/sprint-0-claude-md-v2`.
> Aprobator: Cristian (CEO ACDA).
> Interval: 2026-04-21 — 2026-04-22.

## Status final

| Artefact | Status | Valoare |
|---|---|---|
| Cloud Run service | LIVE | `ctd` europe-west1 (proiect `acda-os-sso`) |
| Cloud Run URL (canonical) | LIVE | `https://ctd-175951084865.europe-west1.run.app` |
| Cloud Run URL (legacy) | LIVE | `https://ctd-y3db3fpgsq-ew.a.run.app` |
| Revision ID | SERVING 100% | `ctd-00004-kmz` |
| DNS `ctd.acda.cloud` | PENDING manual add Cristian CF | CNAME → `ctd-175951084865.europe-west1.run.app` proxied ORANGE |
| CF Access | Wildcard `*.acda.cloud` existent | ZERO modificări dashboard |
| Smoke `/api/health` | `{"ok":true,"db":"ok"}` | DB reachable via socat HTTP CONNECT → Tailscale → DGX |
| Smoke `/api/projects` | 1 project + 9 indicators | CloudServe SRL seed returnat corect |
| Smoke `/api/gdrive/status` | `{"configured":false,"planned":"Val 1.5"}` | Placeholder conform Q3 |
| Smoke fără CF header | HTTP 403 | Middleware cf-access.ts activ în prod |

## Decizii canonice aplicate (Q1-Q5)

- **Q1** PostgreSQL DGX via Tailscale sidecar userspace networking.
- **Q2** Rebrand tabele `ctd_*` snake_case (8 tabele, migrare SQLite → PG pură).
- **Q3** Skip LiteLLM + OpenAPI + Google Drive OAuth pentru deploy #1
  (GDrive returnează 503 + status `{configured:false, planned:'Val 1.5'}`).
- **Q4** CF Access wildcard `*.acda.cloud` existent acoperă `ctd.acda.cloud`;
  middleware server verifică `Cf-Access-Authenticated-User-Email` vs
  `process.env.CTD_WHITELIST` (whitelist 7 emails ACDA).
- **Q5** Runtime `tsx server/index.ts` direct, fără pre-compile `tsc` —
  simplifică Dockerfile + evită drift-ul dist-vs-src în development.

## Faze executate

### Faza 0 — mapare server/ (2026-04-21 seara)
- 22 endpoints Express/5 detectate
- 8 tabele SQLite actuale + 3 lipsă în mock
- OAuth2 Google Drive existent în cod dar refresh token nepopulat
- Zero Tailscale connectivity în cod pre-faza 1

### Faza 1 — Dockerfile multi-stage (commit `9a5289c`)
- Stage 1: `alpine:3.20` + Tailscale 1.96.4 amd64 binaries
- Stage 2: `node:22-slim` + `npm ci` + `vite build` → `dist/`
- Stage 3: `node:22-slim` + `npm ci --omit=dev` + copy `server/` + `database/` + entrypoint sidecar

### Faza 2 — GCP bootstrap (2026-04-21)
- APIs enabled: `run`, `cloudbuild`, `artifactregistry`, `secretmanager`
- Artifact Registry `acda-os` creat în europe-west3 (irelevant — `gcloud run deploy --source` auto-creează `cloud-run-source-deploy` în regiunea serviciului)
- Service Account `ctd-runner@acda-os-sso.iam.gserviceaccount.com`

### Faza 2.5 — Secret Manager (2026-04-21 + finalizat 2026-04-22)

| Secret | Sursă | Grant |
|---|---|---|
| `ctd-pg-password` | DGX `~/.openclaw/.env` `$ACDA_PG_PASSWORD` (pipe ssh→gcloud, no inline leak) | ctd-runner@ secretAccessor |
| `ctd-ts-authkey` | Tailscale reusable + ephemeral + 90 zile (temp file chmod 600 + shred) | ctd-runner@ secretAccessor |
| `ctd-whitelist` | CSV 7 emails ACDA (cristian, ana, oana, patricia, sorin, andrei, gabriel) | ctd-runner@ secretAccessor |

### Faza 6 — Schema PG + rescriere cod (commit `538cfee`)
- `database/pg.ts` — Pool config cu URL decompose (fix SCRAM handshake)
- `database/migrations/001_ctd_schema.sql` — 8 tabele ctd_*, idempotent
- `server/index.ts` — toate endpoint-urile rescrise async pg + ON CONFLICT
- `server/middleware/cf-access.ts` — CF Access whitelist, dev bypass
- `server/gdrive.ts` — 503 placeholder Val 1.5
- Remove SQLite legacy (`database/init.ts` + `database/schema.sql`)

**Test local** (Mac → DGX PG via Tailscale natively):
- `npm run typecheck` PASS
- `npm run db:init` — schema + seed CloudServe (1 client / 1 project / 1 ebit / 9 indicators / 3 procese / 3 probleme / 4 oportunități)
- Smoke test `GET /api/health` → `{ok:true, db:"ok"}`
- Smoke `GET /api/projects/p-cloudserve-001` → full join 9/3/3/4 PASS
- Smoke `POST /api/projects` → 201 + client autocreat tranzacțional

## Vulnerabilități acceptate (Triple Audit §4.5 securitate)

| Vuln | Severity | Decizie | Motiv |
|---|---|---|---|
| `vite` < 6.4.1 | HIGH (GHSA-4w7w-66w2-5vf9, GHSA-p9ff-h696-f583) | ACCEPT | DEV server only. Container rulează `npm ci --omit=dev` → vite nu e instalat. |
| `dompurify` < 3.3.3 | MODERATE | ACCEPT | Tranzitiv via jspdf, rulează CLIENT-SIDE la export PDF. Input din DB internă protejată CF Access + whitelist 7 emails → zero untrusted input surface. |

## Pattern `--no-traffic` în loc de `/canary` (Faza 4)

`/canary` din gstack (browse-based post-deploy monitoring) e overkill pentru
o pagină internă accesată de 7 oameni. Pattern adoptat pentru canary:

```bash
# Deploy nou fără trafic
gcloud run deploy ctd --source=. --region=europe-west1 --no-traffic
# -> produce ctd-00XXX-YYY latest (zero traffic)

# Verific manual (curl cu header Cf-Access-Client-Id dacă ai bypass token)
curl https://ctd-<revID>---<hash>.run.app/api/health

# Switch 10% trafic la revision nou pentru 30 min
gcloud run services update-traffic ctd \
  --region=europe-west1 \
  --to-revisions=ctd-00XXX-YYY=10

# Dacă OK, promovează 100%
gcloud run services update-traffic ctd \
  --region=europe-west1 \
  --to-revisions=ctd-00XXX-YYY=100
```

`/canary` gstack clasic rămâne util pentru UI-heavy apps cu traffic real
de users; pe `ctd.acda.cloud` (7 users interni) monitoring manual e suficient.

## Probleme + fix-uri întâlnite

### Faza 6 — PG SCRAM "password must be a string"
Simptom: `pg.Pool` cu `connectionString + password` separate eșua la SCRAM handshake.
Cauză: combinare fiabilă între connectionString (fără parolă) + password config option nu funcționează consistent în pg@8.20.
Fix: decompose `DATABASE_URL` prin `new URL()` → `host/port/user/database/password` ca fields separate în `PoolConfig`. Vezi `database/pg.ts:17-40`.

### Faza 3 — Deploy #1 / #2 / #3 — Tailscale userspace + pg TCP incompatibility
Simptom: Revizia boot-a Tailscale cu succes, connect-a la tailnet, dar `pg` dădea `Connection terminated due to connection timeout` la `initPostgres()`.
Cauză: Cloud Run (gVisor sandbox) fără `CAP_NET_ADMIN` → `tailscaled --tun=userspace-networking` NU creează TUN device real; expune doar **SOCKS5 + HTTP CONNECT proxy pe :1055**. Pg (node-postgres) face TCP direct la IP, nu respectă `ALL_PROXY`.

**Itinerar fix:**
1. **Încercare 1 (revision `ctd-00001-lmg`)**: Tailscale userspace + pg TCP direct — timeout 10s pe connect. `ECONNREFUSED`.
2. **Încercare 2 (revision `ctd-00002-qk9`)**: pg `stream` async factory via `SocksClient.createConnection` → pg nu await-ează Promise (sync API), `setNoDelay` apelat pe `Promise` → `TypeError: this.stream.setNoDelay is not a function`.
3. **Încercare 3 (revision `ctd-00003-?`)**: socat TCP relay cu `SOCKS5:` syntax → `socat[47] E unknown device/address "SOCKS5"` (socat 1.7.4 Debian bookworm nu suportă SOCKS5 nativ, doar SOCKS4/4A; Tailscale vorbește SOCKS5 only).
4. **Încercare 4 (revision `ctd-00004-kmz`) — LIVE**: socat `PROXY:` (HTTP CONNECT) → funcționează. Tailscale expune ambele (SOCKS5 + HTTP CONNECT) pe :1055. Pattern: pg conectează `127.0.0.1:15432` → socat bridge → HTTP CONNECT `localhost:1055` → tailnet → DGX `100.93.193.85:5432`.

### Faza 6 — PG connectivity (pre-faza, unlock manual de Cristian)
PostgreSQL 16 pe DGX default listen_addresses = `localhost` + UFW blocking tailscale0.
Fix (2026-04-22 seara, manual):
- `postgresql.conf`: `listen_addresses = 'localhost,100.93.193.85'`
- `pg_hba.conf`: `host acda_obs paperclip 100.64.0.0/10 scram-sha-256`
- `ufw allow in on tailscale0 to any port 5432`
- `systemctl restart postgresql` (reload nu e suficient pentru listen_addresses)
Backup-uri create: `postgresql.conf.bak-20260422-232125`, `pg_hba.conf.bak-20260422-232125`.

## TODO post-deploy

- [ ] **URGENT — CF Access JWT validation** — middleware curent verifică doar
  prezența header-ului `Cf-Access-Authenticated-User-Email` (easy spoof dacă
  atacatorul află URL-ul `*.run.app`). Remediation: validare semnătură
  `Cf-Access-Jwt-Assertion` cu public key CF + check audience + expiry.
  Risc actual: mic (URL obscur, 7 users interni, 1 săpt. window), dar
  audit-worthy. Recommend fix înainte de Sprint 2.
- [ ] **DNS `ctd.acda.cloud`** — CNAME adăugat manual în CF de Cristian
  (blocker Faza 5 rezolvat prin dashboard CF, nu avem API token local).
- [ ] **Val 1.5** — Activare Google Drive OAuth2 upload (re-populare refresh token în secret nou `ctd-gdrive-creds`, update Dockerfile dacă e nevoie).
- [ ] **Val 1.5** — Integrare LiteLLM pentru NarrativeService fallback (LLM optional, nu mandatory).
- [ ] **Observability** — log forwarding Cloud Run → GCP Logging sau DGX (nemotron-like stack). Current: stdout → Cloud Run logs UI, suficient pentru săptămâna 1.
- [ ] **Rotate Tailscale auth key** — expiră după 90 zile (≈ 2026-07-22). Set calendar reminder.

## Referințe

- TE-14: `CLOUDRUN-CTD-001 v1.1` (delivered via prompt — nu în repo `docs/task-envelopes/`)
- SCHEMA-001 v1.1: `docs/task-envelopes/TE-CTD-FRONTIER-SCHEMA-001_v1_1.md`
- API-001 v1.1: `docs/task-envelopes/TE-CTD-FRONTIER-API-001_v1_1.md`
- CLAUDE.md §4.4 pipeline pre-land `/review → /cso → /qa → /canary → /ship`

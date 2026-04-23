# DEPLOY_REPORT — CLOUDRUN-CTD-001 (v0.2.0-cloudsql LIVE)

> Raport execuție TE-14 CLOUDRUN-CTD-001 (Cloud Run + Cloud SQL unix socket).
> Executor: Claude Code Opus 4.7 (1M context).
> Aprobator: Cristian (CEO ACDA).
> Interval: 2026-04-21 — 2026-04-23.
>
> Tags:
> - `v0.1.0-cloudrun-live` (commit `460581f`) — initial Cloud Run + Tailscale sidecar + PG DGX
> - `v0.2.0-cloudsql` (commit `3f99d3b`) — **CURRENT LIVE** — Cloud SQL unix socket, no Tailscale

## Changelog v0.1.0 → v0.2.0 (2026-04-23)

**Driver:** sesiunea paralelă TE-UNIFIED-MIGRATE-001 a migrat 22 rânduri CTD din DGX `acda_obs.ctd_*` în Cloud SQL `acda_prod` (dual-write pattern: legacy `public.ctd_*` + unified `ctd.*` cu FK pe `public.clients` MASTER). CTD code swap a urmat natural pentru a elimina dependența de DGX.

**Ce s-a schimbat:**
- **Dockerfile**: stage Tailscale 1.96.4 alpine eliminat; runtime `apt install` redus de la `iptables socat ca-certificates` la doar `ca-certificates`. Imagine ~30 MB mai mică.
- **`docker/entrypoint.sh`**: tot bringup-ul sidecar (tailscaled, tailscale up, ALL_PROXY/HTTP_PROXY exports, socat HTTP-CONNECT relay) eliminat. Acum doar `exec tsx server/index.ts`.
- **`database/pg.ts`**: detectare unix socket dialect `postgresql://user@/db?host=/cloudsql/<conn>` cu fallback TCP pentru dev local (cloud-sql-proxy). Cold-start retry logic păstrat (Cloud SQL poate refuza conexiuni primele ~5-10s).
- **DB endpoint**: `acda-os-sso:europe-west1:acda-prod` (Cloud SQL Postgres 16) via `--add-cloudsql-instances` flag pe Cloud Run service.
- **Secret**: `ACDA_PG_PASSWORD` mounted din `acda-cloudsql-password` (înlocuiește `ctd-pg-password` care e acum orphan).

## Status final (v0.2.0-cloudsql, 2026-04-23 16:08 EEST)

| Artefact | Status | Valoare |
|---|---|---|
| Cloud Run service | LIVE | `ctd` europe-west1 (proiect `acda-os-sso`) |
| Cloud Run URL (canonical) | LIVE | `https://ctd-175951084865.europe-west1.run.app` |
| Cloud Run URL (legacy) | LIVE | `https://ctd-y3db3fpgsq-ew.a.run.app` |
| Domain custom | LIVE | `https://ctd.acda.cloud` via CF proxy ORANGE + CF Access wildcard |
| Revision ID | SERVING 100% | `ctd-00016-f5m` (commit `aaadd74`, deployed 2026-04-23 18:33 UTC) — micro-fixes #3+#4 |
| Image | digest pinned | `europe-west1-docker.pkg.dev/acda-os-sso/cloud-run-source-deploy/ctd@sha256:abf9910d14...` |
| Prior revision | retained | `ctd-00015-mqp` (commit `3f99d3b`, deployed 2026-04-23 13:08 UTC) |
| DNS `ctd.acda.cloud` | CNAME → `ghs.googlehosted.com` | Proxied ORANGE, Cloud Run domain mapping activ cu Google-managed cert |
| CF Access | Wildcard `*.acda.cloud` + middleware server | Dual-layer auth (edge + app level whitelist) |
| DB connectivity | Unix socket `/cloudsql/acda-os-sso:europe-west1:acda-prod/.s.PGSQL.5432` | Kernel-mediated, no proxy/sidecar/relay |
| Smoke `/api/health` (post-CF-Access JWT) | `{"ok":true,"db":"ok"}` HTTP 200 | DB reachable via Cloud SQL unix socket — verified 2026-04-23 |
| Smoke `/api/projects` | 1 proiect CloudServe + 9 indicators (O1/O2/O3, S1/S2/S3, T1/T2/T3) HTTP 200 | Date migrate de la DGX `acda_obs` (TE-UNIFIED-MIGRATE-001 FAZA 2) intacte |
| Smoke `/api/gdrive/status` | `{"configured":true,"hasRootFolder":false}` HTTP 200 | OAuth2 funcțional; **regression vs v0.1.0**: `hasRootFolder` era `true` (env `GOOGLE_DRIVE_ROOT_FOLDER_ID=root` lipsește pe `ctd-00015-mqp`). Funcțional (uploads merg în My Drive root by default) dar pierdere config. Vezi TODO. |
| Tag git | `v0.2.0-cloudsql` (push 2026-04-23 seara) | retro pe `3f99d3b` |

## Status final

| Artefact | Status | Valoare |
|---|---|---|
| Cloud Run service | LIVE | `ctd` europe-west1 (proiect `acda-os-sso`) |
| Cloud Run URL (canonical) | LIVE | `https://ctd-175951084865.europe-west1.run.app` |
| Cloud Run URL (legacy) | LIVE | `https://ctd-y3db3fpgsq-ew.a.run.app` |
| Domain custom | LIVE | `https://ctd.acda.cloud` via CF proxy ORANGE + CF Access wildcard |
| Revision ID | SERVING 100% | `ctd-00008-pgn` (commit `460581f`) |
| DNS `ctd.acda.cloud` | CNAME → `ghs.googlehosted.com` | Proxied ORANGE, Cloud Run domain mapping activ cu Google-managed cert |
| CF Access | Wildcard `*.acda.cloud` + middleware server | Dual-layer auth (edge + app level whitelist) |
| Smoke `/api/health` | `{"ok":true,"db":"ok"}` | DB reachable via socat HTTP CONNECT → Tailscale → DGX |
| Smoke `/api/projects` | 1 project + 9 indicators | CloudServe SRL seed returnat corect |
| Smoke `/api/gdrive/status` | `{"configured":true,"hasRootFolder":true}` | OAuth2 user-scope upload în My Drive `cristian@acda.ro` — **temporar, migrare Val 1.5 la Shared Drive** |
| Smoke fără CF header | HTTP 403 | Middleware cf-access.ts activ în prod |

## Decizii canonice aplicate (Q1-Q5)

> **Notă v0.2.0**: Q1 e DEPRECATED — DGX + Tailscale înlocuit cu Cloud SQL unix socket. Restul rămân valabile.

- **Q1** ~~PostgreSQL DGX via Tailscale sidecar userspace networking.~~ → **v0.2.0:** Cloud SQL `acda-os-sso:europe-west1:acda-prod` (Postgres 16) via unix socket `--add-cloudsql-instances`. Zero sidecars, zero proxy.
- **Q2** Rebrand tabele `ctd_*` snake_case (8 tabele, migrare SQLite → PG pură).
- **Q3** Inițial: skip LiteLLM + OpenAPI + Google Drive OAuth pentru deploy #1.
  **Revizuit 2026-04-23**: GDrive OAuth2 user-scope reactivat și LIVE în
  v0.1.0 (upload `CTD/{clientName}/` în My Drive `cristian@acda.ro`).
  Pattern explicit **temporar**, migrare Val 1.5 la Service Account +
  Shared Drive (vezi TE-20 roadmap mai jos). LiteLLM + OpenAPI rămân deferred.
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
4. **Încercare 4 (revision `ctd-00004-kmz`)**: socat `PROXY:` (HTTP CONNECT) → funcționează. Tailscale expune ambele (SOCKS5 + HTTP CONNECT) pe :1055. Pattern: pg conectează `127.0.0.1:15432` → socat bridge → HTTP CONNECT `localhost:1055` → tailnet → DGX `100.93.193.85:5432`.
5. **Încercările 5-7 (rev `ctd-00005` / `00006` / `00007`)**: iterații GDrive reactivare + log cleanup — #5 a mers (bazat pe #4 snapshot), #6 și #7 au eșuat la `initPostgres()` pentru că Tailscale peer sync nu era finalizat la momentul query. Root cause: cold-start race.
6. **Încercare 8 (revision `ctd-00008-pgn`) — FINAL LIVE**: `waitForPgReady()` cu 12 retry × 2s absoarbe race-ul Tailscale. Plus `connectionTimeoutMillis` redus 30s→5s pentru fail-fast per attempt. Commit `460581f` = source de adevăr pentru `v0.1.0-cloudrun-live`.

### Faza 6 — PG connectivity (pre-faza, unlock manual de Cristian)
PostgreSQL 16 pe DGX default listen_addresses = `localhost` + UFW blocking tailscale0.
Fix (2026-04-22 seara, manual):
- `postgresql.conf`: `listen_addresses = 'localhost,100.93.193.85'`
- `pg_hba.conf`: `host acda_obs paperclip 100.64.0.0/10 scram-sha-256`
- `ufw allow in on tailscale0 to any port 5432`
- `systemctl restart postgresql` (reload nu e suficient pentru listen_addresses)
Backup-uri create: `postgresql.conf.bak-20260422-232125`, `pg_hba.conf.bak-20260422-232125`.

## GDrive în v0.1.0 — temporar MyDrive, migrare Val 1.5 obligatorie

**Ce shipează în v0.1.0** (revizia `ctd-00008-pgn`, commit `460581f`):
- `POST /api/gdrive/upload` activ cu OAuth2 user-scope (`drive.file`)
- Upload automat în `My Drive/CTD/{clientName}/` al contului `cristian@acda.ro`
- Două fișiere per raport: `Raport_CTD_{date}.pdf` + `data_{date}.json`
- UI 11_PreviewRaport afișează butonul "☁ Uploadează în Drive" condițional pe
  `/api/gdrive/status.configured = true` (deja cazul în prod)
- Secrete Secret Manager: `ctd-gdrive-client-id` + `-client-secret` +
  `-refresh-token` (grant `ctd-runner@` secretAccessor pe toate 3)
- Env non-secret: `GOOGLE_DRIVE_ROOT_FOLDER_ID=root` (My Drive root)

**Notă explicită tech debt (v0.1.0 documented)**: pattern-ul user-refresh-token
în MyDrive personal este **acceptabil Val 1.0** pentru validare workflow
intern (Cristian + review) dar **obligatoriu de migrat înainte de team
onboarding** (Oana/Ana/Patricia/Sorin/Andrei/Gabriel).

**Cinci motive pentru migrare Val 1.5** (vezi TE-20 mai jos):
1. **Audit trail greșit** — uploads apar ca `cristian@acda.ro`, nu serviciu
   distinct. Dificil de urmărit pentru audit-uri client / GDPR.
2. **Ownership în cont personal** = risk catastrofic. Scenariul "user
   dispariție / schimbare rol / cont suspendat" pierde rapoarte client.
3. **Quota Drive personală consumată** — sub presiune la zeci clienți/lună.
4. **Acces team manual share-per-file** în loc de membership Shared Drive.
5. **Pattern non-replicabil** la CFE / DWP / LKW / Automark — un OAuth-user-
   refresh-token × 4 module = disaster operațional.

## TE-20 GDRIVE-SA-SHAREDDRIVE-001 — roadmap Val 1.5 (MANDATORY înainte team onboarding)

TE separat, estimare 45-60 min tehnic + ~30 min team onboarding:

- Create Service Account `ctd-uploader@acda-os-sso.iam.gserviceaccount.com`
  (fără roluri IAM project-level, doar Drive-specific prin Shared Drive
  membership)
- Create Shared Drive **"ACDA CTD Rapoarte"** în Workspace organization
  (necesită Workspace admin pe `acda.ro`)
- Add members Shared Drive: Cristian (Manager), team consultants (Content
  Manager), `ctd-uploader@...` (Manager)
- Update `server/gdrive.ts`:
  - Auth: `google.auth.GoogleAuth({ credentials: keyJson, scopes: [...] })`
  - `drive.files.create(..., supportsAllDrives: true, driveId: sharedDriveId)`
  - `findFolder/createFolder` cu `includeItemsFromAllDrives: true`
- Secrete Secret Manager:
  - `ctd-gdrive-sa-key` (JSON key Service Account, ~2KB)
  - `ctd-gdrive-shared-drive-id` (format `0A...`)
- Grant `ctd-runner@` Cloud Run SA secretAccessor pe ambele
- Frontend: zero schimbări (UI-ul deja conditional pe `status.configured`)
- Audit trail corect: uploads apar ca `ctd-uploader@...` service account
- Team onboarding: distribuție email cu link Shared Drive

Ownership: task pentru Sprint 2, nu blocant Val 1.0.

## Alte TODO post-deploy

- [ ] **URGENT — CF Access JWT validation** — middleware curent verifică doar
  prezența header-ului `Cf-Access-Authenticated-User-Email` (easy spoof dacă
  atacatorul află URL-ul `*.run.app`). Remediation: validare semnătură
  `Cf-Access-Jwt-Assertion` cu public key CF + check audience + expiry.
  Risc actual: mic (URL obscur, 7 users interni, 1 săpt. window), dar
  audit-worthy. **Re-confirmat în /cso v0.2.0 (2026-04-23)** ca singurul
  HIGH finding rămas. Recommend fix înainte de Sprint 2 / team onboarding.
- [ ] **TE-ROTATE-CREDS-001** (Val 1.5 hardening) — secrete orphan după swap
  Cloud SQL: `ctd-pg-password` (DGX PG password legacy) + `ctd-ts-authkey`
  (Tailscale auth key). Zero refs active în Cloud Run services (verificat
  2026-04-23). Nu sunt vuln-uri, doar hygiene cleanup. Defer batch revoke
  pentru când se face și rotație reală a `acda-cloudsql-password`.
- [ ] **Val 1.5** — Integrare LiteLLM pentru NarrativeService fallback (LLM
  optional, nu mandatory).
- [ ] **Observability** — log forwarding Cloud Run → GCP Logging sau DGX
  (nemotron-like stack). Current: stdout → Cloud Run logs UI, suficient pentru
  săptămâna 1.
- [x] **PG observability micro-fix** ✅ DONE 2026-04-23 (revision `ctd-00016-f5m`,
  commit `aaadd74`) — `application_name: 'ctd-cloudrun'` adăugat în
  `database/pg.ts:23-25` (override via `PG_APPLICATION_NAME` env). Verify:
  `SELECT application_name, count(*) FROM pg_stat_activity GROUP BY 1`
  pe Cloud SQL acda-prod.
- [x] **GDrive ROOT_FOLDER_ID regression** ✅ DONE 2026-04-23 (revision
  `ctd-00016-f5m`) — `--update-env-vars GOOGLE_DRIVE_ROOT_FOLDER_ID=root`
  aplicat la deploy. Smoke verify: `/api/gdrive/status` returnează
  `{"configured":true,"hasRootFolder":true}` HTTP 200.
- [ ] ~~Rotate Tailscale auth key — expiră după 90 zile~~ — **N/A v0.2.0+**:
  Tailscale eliminat din stack. Auth key rămâne orphan până la
  TE-ROTATE-CREDS-001.

## Pipeline retro v0.2.0 (2026-04-23 seara — addendum TE-14 v1.1 close-out)

`3f99d3b` a fost commit-uit local și deployed pe Cloud Run prin `gcloud run deploy --source` direct, fără să treacă prin pipeline-ul gstack pre-merge. Addendum-ul v1.1 al TE-14 a recuperat retro:

| Pas | Outcome |
|---|---|
| Push `3f99d3b` pe `origin/main` | DONE — sincronizare remote cu Cloud Run |
| Tag `v0.2.0-cloudsql` retro pe `3f99d3b` | DONE — pushed |
| Verify orphan secret `ctd-pg-password` | ZERO refs in any Cloud Run service — defer la TE-ROTATE-CREDS-001 |
| `/review` pe `3f99d3b` | PR Quality Score 9/10 — 4 INFORMATIONAL, 0 CRITICAL |
| `/cso` daily mode pe `3f99d3b` | 1 HIGH (CF Access JWT — pre-existing, deja în TODO), 0 NEW vulns; v0.2.0 a redus surface vs v0.1.0 |
| Smoke tests autenticate (3/3) | PASS — `/api/health` `{"ok":true,"db":"ok"}`, `/api/projects` 9 indicators, `/api/gdrive/status` configured |

## Referințe

- TE-14: `CLOUDRUN-CTD-001 v1.1` (delivered via prompt — nu în repo `docs/task-envelopes/`)
- TE-14 addendum v1.1 close-out: prompt session 2026-04-23 seara (Claude Opus 4.7)
- TE-UNIFIED-MIGRATE-001: sesiune paralelă care a executat data migration DGX → Cloud SQL
- SCHEMA-001 v1.1: `docs/task-envelopes/TE-CTD-FRONTIER-SCHEMA-001_v1_1.md`
- API-001 v1.1: `docs/task-envelopes/TE-CTD-FRONTIER-API-001_v1_1.md`
- CLAUDE.md §4.4 pipeline pre-land `/review → /cso → /qa → /canary → /ship`
- Security report v0.2.0: `docs/security-reports/2026-04-23-cso-v0.2.0-cloudsql.json` (archivat din `.gstack/` local-only)

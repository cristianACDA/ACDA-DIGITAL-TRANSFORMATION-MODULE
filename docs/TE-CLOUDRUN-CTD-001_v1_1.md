# TE-CLOUDRUN-CTD-001 v1.1 — Deploy Modul CTD pe Google Cloud Run

**Task Envelope · ACDA Consulting SRL · acda.ro**

*v1.1 | 21 Aprilie 2026 | Confidențial — uz intern ACDA*

**Autor:** Claude Opus 4.7 (arhitect tehnic, la cererea CEO)
**Aprobator:** Cristian Daniel Lungu, CEO ACDA
**Status:** APROBAT — execuție autonomă Claude Code
**Implementare:** Claude Code Opus 4.7 pe MacBook Air M5
**Deadline GO-LIVE:** pre-5 Mai 2026 (CTD GO-LIVE hard fix)

---

## 1. Context și motivație

### 1.1 Decizia arhitecturală care stă la bază

Pe 14 Aprilie 2026 s-a luat decizia strategică: **DGX Spark rămâne exclusiv zonă de AI compute**, toate aplicațiile business (UI-uri, dashboards, module client, platforme publice) se deploy-ează pe Google Cloud Run.

Modulul Eligibilitate a fost primul migrat (TE-CLOUDRUN-001). CTD e al doilea, pe pattern similar dar cu o divergență arhitecturală justificată (vezi §2).

### 1.2 Status actual CTD

- **Path Mac:** `~/ACDA-DIGITAL-TRANSFORMATION-MODULE/`
- **Stack:** Vite 6 + React 19 + TypeScript + Tailwind CSS 4 @theme
- **Branch curent:** `claude/sprint-0-claude-md-v2` (pending merge în master)
- **Commit UX unificat:** `125c01f` (cream Claude-style + logo ACDA + tokens.css aliniat cu Eligibility)
- **Arhitectură:** frontend Vite + backend `server/` (Node/Express presupus, Claude Code confirmă în Faza 0)
- **Funcționalități Etapa 1 GATA:** cockpit 12 pagini, 9 indicatori Setul A v1.1, export PDF, progress tracking

### 1.3 Prerequisite GCP (deja în loc)

- GCP project: `acda-os-sso` (project number 175951084865)
- Cloudflare account ID: `40f7b9346540e116f6b0d4afbd92e641`
- Zone ID acda.cloud: `7a4dab77405749725332ac0c2231e461`
- Regiune: `europe-west3` (Frankfurt)
- CF Tunnel DGX: `abbefc6f-8e05-4752-b3c6-7cdb0db6dd84` (pentru app.acda.cloud, elig.acda.cloud — NU folosit pentru CTD)

---

## 2. Arhitectură și divergența deliberată față de TE-CLOUDRUN-001

### 2.1 Arhitectura CTD (Opțiunea A — Tailscale sidecar + DGX PostgreSQL)

```
┌─────────────────────────────────────────────────────────┐
│  DGX Spark GB10 (AI compute + data core intern)         │
│                                                         │
│  PostgreSQL acda_obs (:5432)                            │
│    └─ schema: ctd_clients, ctd_indicators,              │
│       ctd_scores, ctd_projects                          │
│  LiteLLM Router (:11435)                                │
│  Palace Memory MCP (:8900)                              │
│                                                         │
│  Backup acda-backup.sh cron 02:00+14:00                 │
│  → gdrive-crypt AES-256                                 │
└─────────────────────────────────────────────────────────┘
              ↕ Tailscale mesh (100.93.193.85)
┌─────────────────────────────────────────────────────────┐
│  Cloud Run: ctd service (europe-west3)                  │
│                                                         │
│  Container:                                             │
│    ├─ Node runtime (serve static Vite + backend API)   │
│    └─ Tailscale sidecar (ephemeral node)                │
│                                                         │
│  --ingress=all, --allow-unauthenticated                 │
│  --service-account=ctd-runner@...                       │
│  --min-instances=0 --max-instances=3                    │
│  --memory=512Mi --cpu=1                                 │
│                                                         │
│  Middleware: Cf-Access-Authenticated-User-Email check   │
└─────────────────────────────────────────────────────────┘
              ↕ Cloudflare proxied CNAME
┌─────────────────────────────────────────────────────────┐
│  ctd.acda.cloud → CF Access (whitelist ACDA + TOTP MFA) │
└─────────────────────────────────────────────────────────┘
```

### 2.2 De ce Opțiunea A pentru CTD (divergență față de TE-CLOUDRUN-001 §1.3)

TE-CLOUDRUN-001 a respins Opțiunea A (Tailscale sidecar + PG pe DGX) pentru Eligibility cu 4 motive. Pentru CTD, aceleași 4 motive se inversează:

| Motiv respingere Eligibility | Situație CTD |
|---|---|
| Hop Tailscale per request (latență +20-40ms) | **Irelevant** — CTD e cockpit intern folosit 2-3h/zi de consultanți, nu API public |
| Tailscale-in-container complexity | **Acceptabil** — overhead one-time, pattern reutilizabil pentru module viitoare |
| Dependency uptime DGX pentru app publică | **FEATURE, nu bug** — CTD conține date strict confidențiale client, regula "zero date în afara perimetrului DGX" |
| Bottleneck bulk 3-30k CUI-uri | **N/A** — CTD n-are bulk processing, o consultanță per sesiune |

**Concluzia:** Opțiunea A pentru CTD respectă regula de GDPR by design (date client NU ies din DGX) și evită cost Cloud SQL dedicat (~40 EUR/lună economisiți).

### 2.3 CF Access pattern — divergență față de Eligibility

**Eligibility (elig.acda.cloud):** Cloud Run cu `gcloud run domain-mappings`.

**CTD (ctd.acda.cloud):** CF proxied CNAME direct la `*.run.app`, Cloud Run accept orice Host, verificare Cf-Access header în middleware server.

Motiv divergență: evită conflict potențial între cert Google-managed (domain mapping) și cert CF-edge. Pattern mai simplu, mai robust, mai rapid de rollback.

---

## 3. Scope

### 3.1 IN-scope

| Componentă | Livrabil |
|---|---|
| Faza 0 | Descoperă dependențe `server/` — raport apeluri externe |
| Dockerfile multi-stage | Build Vite + Node runtime + Tailscale sidecar |
| Secret Manager | 6-7 secrete (vezi §4 Faza 2.5), inclusiv `ctd-whitelist` |
| Service account | `ctd-runner@acda-os-sso.iam.gserviceaccount.com` least-privilege |
| PostgreSQL schema | Migrare ctd_* dacă lipsește (Faza 6) |
| Cloud Run service | `ctd` în europe-west3, toate flags configurate |
| DNS + CF Access | CNAME + policy whitelist 6 emails |
| Middleware CF Access | Server CTD verifică Cf-Access-Authenticated-User-Email |
| Validare end-to-end | Login + cockpit + indicatori + export PDF |
| Git merge + raport | Branch în master + raport Markdown |

### 3.2 OUT-of-scope

| Amânat | Motiv |
|---|---|
| Eligibility module | Already LIVE (TE-CLOUDRUN-001 DONE) |
| Dashboard ACDA OS | Val 2 (după CTD + Eligibility stabili) |
| Profil Client module | Val 2 |
| Min-instances >0 | Cost-aware, revizuit dacă UX suferă |
| Cloud SQL dedicat | Opțiunea A = PG pe DGX, vezi §2.2 |

---

## 4. Fazele de execuție

### FAZA 0 — Descoperă dependențe (~30 min)

**Obiectiv:** Înainte de orice cod nou, Claude Code mapează complet ce face backend-ul CTD și confirmă lista de secrete/dependențe.

1. `cd ~/ACDA-DIGITAL-TRANSFORMATION-MODULE/`
2. Citește `package.json` (root + server/)
3. Citește `vite.config.ts`, `tsconfig.json`
4. Scanează `server/` — listează:
   - Toate `process.env.*` referințe (→ lista secrete necesare)
   - Toate URL-urile hardcoded sau env (→ endpoint-uri externe: LiteLLM, Palace, PostgreSQL, OpenAPI, alte)
   - Tipul DB driver folosit (pg, postgres, prisma?)
   - Ce rute API expune backend-ul
5. **Raport în consolă:**
   - Listă dependențe externe (DGX services accesate)
   - Listă secrete necesare
   - Decizie container unic vs 2 services (așteptat: container unic)
6. **STOP dacă:** backend folosește tehnologie necunoscută (Go, Rust, Python) → raport + așteaptă input Cristian

**Output:** Raport structured în consolă + decizie arhitectură container.

### FAZA 1 — Dockerfile + build local (~45 min)

1. Creează `Dockerfile` multi-stage:
   - **Stage 1 (builder):** `node:22-alpine`, `npm ci`, `npm run build` → `dist/` static
   - **Stage 2 (runtime):** `node:22-alpine`, copy `dist/` + `server/`, install Tailscale sidecar binary (`tailscale/tailscale:stable` layer sau download direct ARM64/AMD64 conform arch Cloud Run = linux/amd64)
   - **Entrypoint script** (`entrypoint.sh`):
     ```bash
     #!/bin/sh
     set -e
     # Start Tailscale userspace daemon în background
     /app/tailscaled --tun=userspace-networking --socks5-server=localhost:1055 &
     /app/tailscale up --authkey=$TS_AUTHKEY --hostname=ctd-cloudrun --ephemeral
     # Port forward via Tailscale socks5 (ALL_PROXY=socks5://localhost:1055)
     export ALL_PROXY=socks5://localhost:1055
     export HTTP_PROXY=http://localhost:1055
     # Start Node app
     exec node server/index.js
     ```
   - Expune `PORT=8080` (Cloud Run standard)
2. Creează `.dockerignore`: `node_modules`, `.env*`, `dist`, `.git`, `.vscode`, `*.log`
3. Build local: `docker build --platform=linux/amd64 -t ctd:test .`
4. Test local (fără Tailscale funcțional local): `docker run --rm -p 8080:8080 -e PORT=8080 ctd:test` → verify static assets servite
5. Git add + commit: `feat(docker): Dockerfile + entrypoint cu Tailscale sidecar`

**DoD Faza 1:** Dockerfile + entrypoint + .dockerignore commit, build local PASS.

### FAZA 2 — GCP setup (~20 min)

1. `gcloud --version` (confirmă CLI instalat, altfel blocaj critic → raport)
2. `gcloud auth login` (dacă necesar)
3. `gcloud config set project acda-os-sso`
4. `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com`
5. `gcloud artifacts repositories list --location=europe-west3` — verifică dacă `acda-os` există; dacă nu:
   ```
   gcloud artifacts repositories create acda-os \
     --repository-format=docker \
     --location=europe-west3 \
     --description="ACDA OS container images"
   ```
6. `gcloud auth configure-docker europe-west3-docker.pkg.dev`

**DoD Faza 2:** API enabled, Artifact Registry OK, Docker auth OK.

### FAZA 2.5 — Secret Manager + Service Account (~30 min)

**Service account custom:**
```bash
gcloud iam service-accounts create ctd-runner \
  --display-name="CTD Cloud Run Runtime"

gcloud projects add-iam-policy-binding acda-os-sso \
  --member="serviceAccount:ctd-runner@acda-os-sso.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding acda-os-sso \
  --member="serviceAccount:ctd-runner@acda-os-sso.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

**Secret Manager entries** (lista finală confirmată după Faza 0):

| Secret name | Valoare | Notă |
|---|---|---|
| `ctd-litellm-base-url` | `http://100.93.193.85:11435` | Tailscale IP DGX |
| `ctd-litellm-api-key` | [valoare curentă din `~/.config/openclaw/env`] | |
| `ctd-database-url` | `postgresql://paperclip@100.93.193.85:5432/acda_obs` | User, NU parolă în URL |
| `ctd-pg-password` | [parolă paperclip curentă din `~/.openclaw/.env` — **test empiric obligatoriu**] | Rotire la hardening session, nu acum |
| `ctd-ts-authkey` | Generat Tailscale admin → ephemeral + reusable | Pattern: `tskey-auth-...` |
| `ctd-openapi-ro-key` | [dacă Faza 0 confirmă folosit] | Opțional |
| `ctd-whitelist` | `cristian@acda.ro,ana@acda.ro,oana@acda.ro,patricia@acda.ro,sorin@acda.ro,andrei@acda.ro,gabriel@acda.ro` | CSV emails autorizate middleware CF Access; sursă unică de adevăr server-side |

**Test empiric parolă paperclip (OBLIGATORIU înainte de `ctd-pg-password` secret create):**

Pe DGX există 2 fișiere cu parole paperclip:
- `~/.openclaw/.env` — ACDA_PG_PASSWORD runtime canonic (LIVE ACTIVĂ, parolă curentă `717b*`)
- `~/.config/openclaw/env` — pentru systemd daemon (poate fi sincronizat SAU diferit; posibil stale)
- `/etc/acda-secrets/PG_PASSWORD` — artefact posibil stale (neaplicat ALTER USER)

**Claude Code NU presupune care e corectă — verifică empiric:**

```bash
# Test 1: parola din ~/.openclaw/.env (sursa canonică runtime)
ssh sparkacda1 'source ~/.openclaw/.env && PGPASSWORD=$ACDA_PG_PASSWORD psql -U paperclip -h 127.0.0.1 -d acda_obs -c "SELECT 1"'
```

- PASS → folosește această parolă
- FAIL → încearcă fallback:
  ```bash
  ssh sparkacda1 'PGPASSWORD=$(grep ACDA_PG_PASSWORD ~/.config/openclaw/env | cut -d= -f2) psql -U paperclip -h 127.0.0.1 -d acda_obs -c "SELECT 1"'
  ```
- Ambele FAIL → **STOP + raport** (parola neconfirmată, nu încerca ghicire sau ALTER USER — rotire amânată explicit pentru security hardening session)

**Extragere parolă confirmată pentru Secret Manager:**
```bash
PG_PASS=$(ssh sparkacda1 'grep ACDA_PG_PASSWORD ~/.openclaw/.env | cut -d= -f2')
echo -n "$PG_PASS" | gcloud secrets create ctd-pg-password --data-file=- --replication-policy=automatic --project=acda-os-sso
# Curăță variabila local imediat
unset PG_PASS
```

**Notă:** NU scrie parola în logs, commits, sau raport final. Validare că secret a fost creat corect: `gcloud secrets versions access latest --secret=ctd-pg-password | wc -c` → confirmă length non-zero, fără afișare conținut.

**Generare Tailscale auth key:**
- Admin console Tailscale → Settings → Auth keys → Generate auth key
- **Reusable: YES** (Cloud Run poate deploy multiple revizii)
- **Ephemeral: YES** (nod auto-cleanup după disconnect)
- **Tags:** `tag:cloudrun-ctd` (pentru ACL separarea de noduri umane)
- Expirare: 90 zile (reminder renewal în TE-SEC-HARDENING-001 viitor)

**Creare secrete:**
```bash
echo -n "VALOARE" | gcloud secrets create SECRET_NAME --data-file=- --replication-policy=automatic
```

**Comandă specifică `ctd-whitelist`:**
```bash
echo -n "cristian@acda.ro,ana@acda.ro,oana@acda.ro,patricia@acda.ro,sorin@acda.ro,andrei@acda.ro,gabriel@acda.ro" | \
  gcloud secrets create ctd-whitelist --data-file=- --replication-policy=automatic --project=acda-os-sso

gcloud secrets add-iam-policy-binding ctd-whitelist \
  --member=serviceAccount:ctd-runner@acda-os-sso.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=acda-os-sso
```

**Notă design:** `ctd-whitelist` = sursă unică de adevăr server-side pentru autorizare. Adăugare coleg nou viitor = 2 operații (policy CF Access + `gcloud secrets versions add ctd-whitelist`), fără rebuild container. Pattern reutilizabil pentru module viitoare (Profil Client, Dashboard).

**DoD Faza 2.5:** Service account creat, 6-7 secrete create (inclusiv `ctd-whitelist` cu CSV 7 emails), IAM bindings OK, `ctd-runner` are `secretAccessor` pe `ctd-whitelist:latest`, **test empiric parolă paperclip PASS** înainte de `ctd-pg-password` secret create.

### FAZA 3 — Deploy Cloud Run (~20 min)

Folosește `--source .` pentru auto-build Cloud Build (mai simplu decât build+push manual).

```bash
gcloud run deploy ctd \
  --source . \
  --region europe-west3 \
  --platform managed \
  --ingress=all \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --service-account ctd-runner@acda-os-sso.iam.gserviceaccount.com \
  --set-secrets=LITELLM_BASE_URL=ctd-litellm-base-url:latest,LITELLM_API_KEY=ctd-litellm-api-key:latest,DATABASE_URL=ctd-database-url:latest,ACDA_PG_PASSWORD=ctd-pg-password:latest,TS_AUTHKEY=ctd-ts-authkey:latest,CTD_WHITELIST=ctd-whitelist:latest \
  --set-env-vars=NODE_ENV=production
```

Output: URL Cloud Run `https://ctd-XXXXXX-ew.a.run.app`.

Test direct (fără CF): `curl https://ctd-XXXXXX-ew.a.run.app` → 200 OK static frontend.

**DoD Faza 3:** Service live, primește 200 pe URL default.

### FAZA 3.5 — Verify Tailscale connectivity (~15 min)

1. Cloud Run logs (primele 60s): verifică că Tailscale daemon a pornit și nodul `ctd-cloudrun` e conectat
2. Tailscale admin console: verifică nodul `ctd-cloudrun` apare ca online, ephemeral, tag `cloudrun-ctd`
3. Test smoke din container (dacă backend expune `/health` endpoint):
   ```bash
   curl https://ctd-XXXXXX-ew.a.run.app/api/health
   ```
   Endpoint health ar trebui să ping-uie LiteLLM + PostgreSQL și să raporteze status.
4. Dacă Faza 0 n-a găsit endpoint `/health`: **Claude Code adaugă** un endpoint minimal în backend care testează:
   - `SELECT 1` pe PostgreSQL
   - `GET /health` pe LiteLLM (`http://100.93.193.85:11435/health`)
   - Raportează `{"db":"ok","llm":"ok"}` sau erori specifice

**DoD Faza 3.5:** Tailscale connected, DB + LLM reachable din Cloud Run.

### FAZA 4 — Deploy cu traffic splitting (înlocuiește /canary gstack)

Pattern Cloud Run native traffic splitting:

1. Primul deploy (Faza 3) creează revizia inițială cu 100% traffic — skip splitting la primul deploy.
2. Pentru deploy-uri ulterioare (după validare):
   ```bash
   # Deploy revizie nouă fără traffic
   gcloud run deploy ctd --source . --region europe-west3 --no-traffic [...alte flags]

   # Smoke test pe revision URL dedicat (obținut din output)
   curl https://ctd-REV-XXX-ew.a.run.app

   # Dacă OK: shift 100% la revizia nouă
   gcloud run services update-traffic ctd --to-latest --region europe-west3

   # Dacă FAIL: rollback la revizia anterioară
   gcloud run services update-traffic ctd --to-revisions=ctd-OLD-YYY=100 --region europe-west3
   ```

**Notă arhitecturală:** gstack `/canary` skip deliberat pentru clasa Cloud Run. Documentat în `~/.claude/CLAUDE.md` după deploy.

**DoD Faza 4:** Pattern documentat în raport final.

### FAZA 5 — DNS + CF Access (~30 min)

1. **CNAME în Cloudflare:**
   - Type: CNAME
   - Name: `ctd`
   - Target: `ctd-XXXXXX-ew.a.run.app` (fără schema)
   - Proxy status: **Proxied** (orange cloud ON)
   - TTL: Auto

2. **CF Access Application:**
   - Aplicație existentă wildcard `*.acda.cloud`? → extinde policy pentru path `ctd.acda.cloud`
   - Dacă NU: creează application nouă "CTD ACDA":
     - Application domain: `ctd.acda.cloud`
     - Session duration: 24h
     - Policy: "ACDA Team"
       - Include: emails `cristian@`, `ana@`, `oana@`, `patricia@`, `sorin@`, `andrei@`, `gabriel@acda.ro`
       - Require: TOTP MFA (global policy deja activ)

3. **Middleware server CTD** (adăugat în Faza 1 dacă nu există deja):
   ```javascript
   // server/middleware/cf-access.js
   const WHITELIST = (process.env.CTD_WHITELIST || '')
     .split(',')
     .map(e => e.trim().toLowerCase())
     .filter(Boolean);

   if (WHITELIST.length === 0) {
     console.error('FATAL: CTD_WHITELIST env var empty — refusing all requests');
   } else {
     console.log(`WHITELIST loaded: ${WHITELIST.length} emails`);
   }

   function cfAccessMiddleware(req, res, next) {
     // Fail-safe: dacă whitelist gol → 500 pe tot. Mai sigur DOS decât bypass.
     if (WHITELIST.length === 0) {
       return res.status(500).json({error: 'Service misconfigured'});
     }
     const email = req.headers['cf-access-authenticated-user-email'];
     if (!email) return res.status(403).json({error: 'CF Access required'});
     if (!WHITELIST.includes(email.toLowerCase())) {
       return res.status(403).json({error: 'Email not whitelisted'});
     }
     req.user = { email };
     next();
   }

   module.exports = { cfAccessMiddleware };
   ```
   Aplicat global pe toate rutele API (NU static assets — CF Access blochează la edge deja).

   **Zero emails hardcoded în cod.** Whitelist vine exclusiv din `process.env.CTD_WHITELIST` (secret `ctd-whitelist` bindat prin `--set-secrets` la deploy). Sursă unică de adevăr; adăugare coleg viitor nu necesită rebuild.

4. **Test curl:**
   ```bash
   curl -I https://ctd.acda.cloud
   # Așteptat: 302 redirect la CF Access login
   ```

**DoD Faza 5:** DNS propagat, CF Access funcționează, middleware server aplicat, middleware citește whitelist din `process.env.CTD_WHITELIST` (zero emails hardcoded în cod), log pornire container: `WHITELIST loaded: 7 emails`.

### FAZA 6 — Schema PostgreSQL ctd_* (~30 min)

1. SSH DGX: `ssh sparkacda1`
2. Verifică dacă schema există:
   ```bash
   psql -h 127.0.0.1 -U paperclip -d acda_obs -c "\dt ctd_*"
   ```
3. Dacă lipsește, Claude Code creează migrare în repo CTD:
   - `server/db/migrations/001_ctd_schema.sql`:
     ```sql
     CREATE TABLE IF NOT EXISTS ctd_clients (
       id SERIAL PRIMARY KEY,
       cui VARCHAR(20) UNIQUE NOT NULL,
       name TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       created_by TEXT NOT NULL
     );

     CREATE TABLE IF NOT EXISTS ctd_projects (
       id SERIAL PRIMARY KEY,
       client_id INT REFERENCES ctd_clients(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       status TEXT DEFAULT 'draft',
       created_at TIMESTAMPTZ DEFAULT NOW(),
       created_by TEXT NOT NULL
     );

     CREATE TABLE IF NOT EXISTS ctd_indicators (
       id SERIAL PRIMARY KEY,
       code VARCHAR(10) NOT NULL,
       name TEXT NOT NULL,
       pillar VARCHAR(50) NOT NULL,
       weight_pct INT NOT NULL,
       scale_min INT DEFAULT 0,
       scale_max INT DEFAULT 5
     );

     CREATE TABLE IF NOT EXISTS ctd_scores (
       id SERIAL PRIMARY KEY,
       project_id INT REFERENCES ctd_projects(id) ON DELETE CASCADE,
       indicator_id INT REFERENCES ctd_indicators(id),
       score INT NOT NULL CHECK (score >= 0 AND score <= 5),
       notes TEXT,
       scored_at TIMESTAMPTZ DEFAULT NOW(),
       scored_by TEXT NOT NULL
     );

     CREATE INDEX IF NOT EXISTS idx_ctd_scores_project ON ctd_scores(project_id);
     CREATE INDEX IF NOT EXISTS idx_ctd_projects_client ON ctd_projects(client_id);
     ```
4. Rulează migrare (local via Tailscale sau pe DGX direct):
   ```bash
   psql -h 100.93.193.85 -U paperclip -d acda_obs -f server/db/migrations/001_ctd_schema.sql
   ```
5. Seed 9 indicatori Setul A v1.1 (din `ACDA_CTD_METHODOLOGY.md`):
   - `server/db/seeds/001_indicators_seta_v1_1.sql`
6. Commit migrare + seed.

**DoD Faza 6:** Schema + seed OK, backend poate citi indicatorii.

### FAZA 7 — Validare end-to-end (~30 min)

1. Browser incognito: `https://ctd.acda.cloud`
2. Login CF Access (OTP email + TOTP MFA)
3. Cockpit CTD vizibil, paletă cream (#FAF9F5) + logo ACDA + accente brand (#1E40FF/#22C55E/#F59E0B/#DC2626)
4. Test flow complet:
   - Creare client test (CUI fictive pentru validare)
   - Parcurgere 12 pagini cockpit
   - Scoring 9 indicatori Setul A
   - Verifică calcul scor ponderat (piloni 40%/35%/25%)
   - Export PDF → descarcă → verify render
5. Verify în PostgreSQL că datele sunt salvate:
   ```sql
   SELECT * FROM ctd_projects ORDER BY created_at DESC LIMIT 5;
   SELECT COUNT(*) FROM ctd_scores;
   ```
6. Cleanup date test.

**DoD Faza 7:** Login + cockpit + scoring + export PDF + persistență DB — toate PASS.

### FAZA 8 — Git merge + raport (~15 min)

1. `git status` + `git diff HEAD~5..HEAD` — review final
2. Commit-uri structurate:
   - `feat(docker): Dockerfile + entrypoint Tailscale sidecar`
   - `feat(server): CF Access middleware + /health endpoint`
   - `feat(db): schema ctd_* + seed indicatori Setul A v1.1`
   - `docs(deploy): raport deploy Cloud Run + decizii arhitecturale`
3. Merge `claude/sprint-0-claude-md-v2` → `master` (sau `main`, verifică `git remote show origin`)
4. Push la remote
5. Tag: `git tag -a v0.1.0-cloudrun-live -m "CTD LIVE pe Cloud Run"`
6. Push tag

**Raport final Markdown** (`DEPLOY_REPORT.md` în repo):
- Commit hash final
- URL live: `https://ctd.acda.cloud`
- Cloud Run service name + regiune + revision ID
- Lista secrete create (nume, NU valori)
- Service account folosit
- Pattern CF Access aplicat (proxied CNAME, NU domain mapping)
- Decizii arhitecturale deviate de TE-CLOUDRUN-001 (Opțiunea A pentru CTD, justificare)
- Probleme întâlnite + rezolvări
- TODO post-deploy (dacă există)

**DoD Faza 8:** Master merged + push + tag + raport commit.

---

## 5. Definition of Done (toate obligatorii)

1. ✅ Faza 0 raport dependențe produs și validat
2. ✅ Dockerfile + entrypoint + .dockerignore commit
3. ✅ Build Docker local PASS (linux/amd64)
4. ✅ Secret Manager: 6-7 secrete create, valorile corecte, inclusiv `ctd-whitelist` (CSV 7 emails)
5. ✅ Service account `ctd-runner@` cu roluri minime (NU default compute SA); `secretAccessor` pe toate secretele `ctd-*`
6. ✅ Cloud Run service `ctd` LIVE în europe-west3 cu flag `--set-secrets` incluzând `CTD_WHITELIST`
7. ✅ Tailscale nod `ctd-cloudrun` conectat + reachable DGX (LiteLLM + PostgreSQL ping OK)
8. ✅ DNS CNAME `ctd.acda.cloud` → `*.run.app` proxied
9. ✅ CF Access policy activ (whitelist 7 emails ACDA + TOTP MFA global)
10. ✅ Middleware CF Access aplicat pe server — citește din `process.env.CTD_WHITELIST` (zero emails hardcoded), log startup `WHITELIST loaded: 7 emails`, 403 dacă header lipsă sau email neautorizat, 500 dacă WHITELIST gol (fail-safe)
11. ✅ `curl -I https://ctd.acda.cloud` → 302 CF Access redirect
12. ✅ Browser test: login → cockpit funcțional, paletă cream + logo + accente brand OK
13. ✅ Schema `ctd_*` creată + 9 indicatori seed-uiți
14. ✅ End-to-end test: creare client + scoring + export PDF + DB persist
15. ✅ gstack pipeline: `/review`, `/cso`, `/qa`, `/ship` PASS (`/canary` skip documentat)
16. ✅ Branch merged în master + push + tag `v0.1.0-cloudrun-live`
17. ✅ `DEPLOY_REPORT.md` complet în repo

---

## 6. EXECUTION MODE: AUTONOMOUS

- Fă toate deciziile tehnice singur conform acestui TE
- NU cere confirmare pentru fiecare pas
- gstack pipeline obligatoriu (cu excepția `/canary` — vezi §4 Faza 4)
- Continuă până TOATE criteriile DoD sunt bifate
- Erori → fix → retry automat (max 3 încercări per fază)
- Blocaj critic → raport cu context exact + STOP
- Default pe decizii: cel mai sigur, nu cel mai rapid
- Git commit la final fiecărei faze majore
- Raport final complet Markdown

### 6.1 Blocaje critice care necesită input Cristian (STOP + raport)

- Tehnologie backend necunoscută în Faza 0 (nu Node/Express)
- GCP permission denied pe orice operație (IAM setup necorespunzător)
- Tailscale auth key invalid sau tag neconfigurat
- **Parolă paperclip PostgreSQL nu validează pe ambele surse (`~/.openclaw/.env` + `~/.config/openclaw/env`)** — NU încerca ghicire sau ALTER USER, rotire amânată explicit
- PostgreSQL connection fail din Cloud Run (după 3 retry)
- CF Access middleware produce 403 fals pe emails whitelisted
- Domain DNS nu propagă în 1h (eventual CF edge cache issue)

Pentru oricare din acestea: raport exact cu comenzi rulate + output erori + ipoteză cauză, apoi STOP.

---

## 7. Constraints

- NU atinge modulele existente (Eligibility, Dashboard)
- NU modifica CF Tunnel existent pe DGX (UUID `abbefc6f-8e05-4752-b3c6-7cdb0db6dd84`)
- NU expune secrete în cod sau commits (use Secret Manager exclusiv)
- Toate resurse GCP prefix `ctd-` sau `acda-ctd-`
- Regiune: `europe-west3` fix
- Min instances: 0 (cold start acceptabil, revizuit post-deploy dacă UX suferă)
- Max instances: 3
- Platform Docker build: `linux/amd64` (Cloud Run = x86_64, Mac M5 = ARM64 → obligatoriu `--platform`)
- NU încerca rotire parolă paperclip acum — amânat pentru security hardening session
- Middleware CF Access: whitelist email = sursă unică de adevăr via `process.env.CTD_WHITELIST` din Secret Manager; **zero emails hardcoded în cod sau commits**

---

## 8. Rollback plan

### 8.1 Rollback în cursul fazelor (înainte de Faza 7 GREEN)

- Cloud Run service poate fi șters oricând fără impact: `gcloud run services delete ctd --region europe-west3 --quiet`
- Secret Manager: `gcloud secrets delete ctd-* --quiet` (bulk cleanup)
- Service account: `gcloud iam service-accounts delete ctd-runner@...`
- Cloudflare DNS: șterge record `ctd`
- Git: `git reset --hard <commit-anterior>` pe branch CTD
- PostgreSQL schema ctd_*: `DROP TABLE ctd_scores, ctd_projects, ctd_indicators, ctd_clients CASCADE;`

### 8.2 Rollback post-GO-LIVE

**Opțiunea A — traffic shift la revizia anterioară (2 min):**
```bash
gcloud run services update-traffic ctd --to-revisions=ctd-PREV-XXX=100 --region europe-west3
```

**Opțiunea B — disable CF Access (emergency, NU se folosește decât dacă CF Access e buggy):**
- Dezactivează application în CF dashboard → serviciul devine public
- **RISK ÎNALT** — doar dacă în paralel dezactivezi și middleware-ul server la whitelist strict

**Opțiunea C — revert complet:**
```bash
gcloud run services delete ctd --region europe-west3 --quiet
# Cloudflare: șterge DNS record ctd
git revert <commit-deploy>
```

---

## 9. Referințe

- `ACDA_OS_MASTER.md` §17 (reguli arhitecturale)
- `TE-CLOUDRUN-001 v1.0` (Platform Eligibility — precedent, Opțiunea A1-revizuit)
- `ACDA_CTD_METHODOLOGY.md` (9 indicatori Setul A v1.1, piloni 40/35/25)
- Commit `125c01f` (UX unificat cream + logo ACDA)
- Decizie 14 Apr 2026: DGX = AI only, apps = Cloud Run
- Pattern Tailscale sidecar Cloud Run: docs Tailscale oficial

---

## 10. Follow-ups post-deploy (tracked, NU blocker)

1. Monitoring Cloud Run 7 zile: cold start P95, erori, cost burn
2. Dacă cold start > 5s sustained → upgrade min-instances=1 (~$5/lună)
3. Renewal Tailscale auth key la 90 zile (reminder calendar)
4. Revizuire rol service account după primul incident (least-privilege tighten)
5. Pattern replicare pentru Profil Client module (Val 2) — `TE-CLOUDRUN-PROFIL-002`
6. Documentare pattern CF Access middleware în SOUL_Collection (reutilizare)

---

*ACDA Consulting SRL | acda.ro | TE-CLOUDRUN-CTD-001 v1.1 (final) | 21 Aprilie 2026 | Confidențial*

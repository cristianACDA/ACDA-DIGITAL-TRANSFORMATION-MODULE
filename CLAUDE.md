# CLAUDE.md — ACDA Digital Transformation Module (v2.0)

> Operativ pentru Claude Code (local Mac + Routines cloud). Sursa de adevăr pentru
> context, guardrails și workflow pe repo-ul ACDA-DTM.
>
> Versiune: 2.0 · Ultima revizuire: 2026-04-18 · Sprint 0
> Task list activ: vezi [TODO.md](./TODO.md)

## 1. Identitate proiect

**Company:** ACDA Consulting Group (acda.ro) — consultanță transformare digitală
(DWP, CFE, CTD, LKW / Automark.Agency).

**Produs:** **ACDA Digital Transformation Module** (ACDA-DTM) — aplicație web
internă care conține:
- **Cockpit CTD** (12 pagini) — unealta consultantului pentru diagnoză + strategie client
- **3 deliverables client-facing** — Diagnostic 90s, Strategie 10min, AI Readiness

**Rol în ACDA OS:** ACDA-DTM este **modulul de front-office** al stack-ului ACDA.
Consumă output de la agenții OpenClaw (CTD / Qual / PreAnaliză / Oferta) prin
contracte TypeScript în `src/contracts/`, dar **nu rulează agenții local** —
aceștia trăiesc pe DGX Spark (accesibil via Tailscale; IP-uri în CLAUDE.md
global, nu aici). Integrarea este one-way: DTM afișează, agenții produc.

**Agent responsabil:** Claude Code (Opus 4.7, 1M context) — **singurul writer
de cod** în acest repo. Cristian e CEO + reviewer, nu scrie cod direct.

**Status:** Sprint 0 (2026-04-18) — migrare CLAUDE.md v1 → v2, pregătire teren
pentru Sprint 1 (POST /api/ingest + tabele DB lipsă, vezi TODO.md).

## 2. Target audience și tone

**Primary reader (cine execută ce scrie aici):**
1. **Claude Code local** (Mac, Opus 4.7, sesiune interactivă) — scrie cod,
   rulează teste, pushează direct pe `main`.
2. **Claude Code Routines cloud** (launched 2026-04-14) — aceeași bază de cod,
   dar rulează headless cu timeout și limite proprii. Tot contextul de aici
   trebuie să fie self-contained; nu se poate întreba Cristian mid-run.

**Secondary reader:** viitori contributori umani (dacă proiectul iese din
faza single-dev) sau agenți terți care fac review.

**Tone:** tehnic-direct. Presupune cititor competent (cunoaște React, TS, SQL,
Express). Nu explică concepte de bază. NU are onboarding hand-holding. Dar e
structurat clar, cu anchor-uri explicite, ca să poată fi preluat de cineva nou
fără sesiune cu Cristian.

**Limba:** Română pentru narativ + explicații. Engleză pentru nume tehnice,
comenzi, identificatori. Path-uri și cod — as-is.

## 3. Stack tehnic

### Runtime și limbă
| Zonă | Tehnologie | Notă |
|---|---|---|
| Limbaj | TypeScript strict | `noUnusedLocals`, `noUnusedParameters` |
| Package manager | **npm** | `package-lock.json` committed. Nu `bun` aici (deși e preferat la nivel de home). |
| Node | LTS (>= 20) | platforma trebuie să meargă pe orice Node modern; nu pin la o versiune specifică |

### Frontend (`src/`)
- **React 19** + **Vite 6** — build + HMR
- **Tailwind CSS 4** — stil
- **react-router-dom 7** — navigație Cockpit + Deliverables
- **jsPDF + jspdf-autotable** — export PDF client-side (grafice: canvas → PNG)

### Backend (`server/`)
- **Express 5** — 10 endpoint-uri REST sub `/api/*`
- **better-sqlite3** — DB locală (`database/acda.db`), parameterized queries
  (`@name`), NIMIC interpolat
- **googleapis** — OAuth2 refresh token pentru `/api/gdrive/upload`
  (server-side only, nu se expune client)
- Port **3001**, proxy Vite `/api → :3001`

### Persistență (`database/`)
- **SQLite** locală: `database/acda.db` (gitignored)
- Schema live: 5 tabele (Client, Project, EBITBaseline, MaturityIndicator,
  MaturityScore)
- Tabele lipsă (Process / Problem / Opportunity / BusinessCase / Initiative /
  StrategyPillar / RoadmapPhase / ReportSection) — momentan în
  `src/mocks/mock-cloudserve.ts`. Migrare programată în Sprint 1.

### Structura curentă a codului
Pentru arborele complet, rulează:
```bash
tree src/ server/ database/ -L 3 -I 'node_modules|dist'
```
CLAUDE.md nu mai ține tree-ul hardcodat — în v1 a drift-at și a devenit
inutil. Anchor-urile cheie (ce e `context/`, ce e `services/`, etc.) vin în
secțiunea de arhitectură, mai jos.

### 3.5 Dev commands

| Comandă | Efect |
|---|---|
| `npm install` | Instalare dependențe (prima dată sau după modificare `package.json`) |
| `npm run db:init` | Creează `database/acda.db` + seed CloudServe SRL (idempotent) |
| `npm run dev` | `concurrently` server (3001) + client Vite (5173); proxy `/api` |
| `npm run build` | `tsc` build + `vite build` → `dist/` |
| `npm run typecheck` | `tsc --noEmit` (obligatoriu înainte de commit) |
| `npm run lint` | ESLint |

**Primul setup:** `npm install && npm run db:init && npm run dev`.

## 4. Guardrails absolute

Reguli non-negociabile. Violarea oricăreia = rollback + post-mortem, indiferent
de cât aparent-benign pare cazul.

### 4.1 Execuție agent
- **Cod care ajunge în repo ACDA nu vine din `claude -p` headless.**
  Modul non-interactiv bypasă review-ul lui Cristian și istoricul sesiunii.
  Pentru batch/automation pe ACDA-DTM se folosește **exclusiv Claude Code
  Routines** (cloud, cu timeout, cost tracking și output committed).
  `claude -p` rămâne OK pentru scripturi personale în afara repo-urilor ACDA.
- **Zero OAuth reutilizat între scope-uri.** Credențialul Google Drive
  (`server/.gdrive-credentials.json` + refresh token) servește EXCLUSIV
  `/api/gdrive/upload`. Nu îl împrumuta pentru Gmail, Calendar, Sheets sau
  alte API-uri Google. Scope expansion = credențial nou + aprobare Cristian.

### 4.2 Git și branch-uri
- **Zero `git push --force` pe `main`.** Pe feature branch e permis cu
  atenție, dar nu pe `main`. Dacă e nevoie de rescriere, se discută întâi.
- **Zero commit-uri directe cu secrete.** `.env`, `server/.gdrive-credentials.json`,
  `database/*.db` sunt gitignored. Înainte de `git add .` verifică `git status`.
- **Commit message cu cod task la început** (ex. `C3-T2: ...`,
  `SCHEMA-001: ...`, sau pe Sprint 0 `sprint0-claude-md: ...`).

### 4.3 Secrete
- **Zero hardcoding inline în Bash.** Tot ce intră în `session log` +
  `journalctl` rămâne permanent. Pattern corect (pe DGX):
  ```bash
  ssh sparkacda1@<dgx> 'source ~/.openclaw/.env && PGPASSWORD="$ACDA_PG_PASSWORD" psql ...'
  ```
- **Locații canonice secrete:**
  - Pe DGX: `~/.openclaw/.env` (env file systemd + apps), `/etc/acda-secrets/*`
    (chmod 600, secrete sistem).
  - Local Mac: `.env` în rădăcina repo-ului (gitignored).
- Dacă nu știi numele unei variabile, **caută-o** (`grep ACDA_ ~/.openclaw/.env`
  sau în unit-urile systemd). Nu hardcoda valoarea găsită.

### 4.4 Pipeline pre-land (obligatoriu Sprint 0+)
Înainte de orice merge logic în `main` (chiar și push direct, pe Cristian-solo),
pipeline-ul gstack este **obligatoriu, fără excepție**:

```
/review  →  /cso  →  /qa  →  /canary  →  /ship
```

- `/review` — diff review structural (SQL safety, LLM trust boundaries, edge cases)
- `/cso` — audit security (secrets, dependency supply chain, OWASP)
- `/qa` — test flow în browser (pentru UI), sau tests pentru pure-logic
- `/canary` — post-deploy monitoring (se rulează după merge, nu ca gate)
- `/ship` — bundlează commit + push + PR (pe solo-dev: direct push)

Nota v1 care spunea că pipeline-ul "se aplică abia în producție multi-contributor"
**este deprecated.** Pipeline se aplică de la Sprint 0 încoace, pe orice cod
care atinge `main`.

### 4.5 Triple Audit Protocol
Orice schimbare care atinge cod prod trece prin 3 gate-uri secvențiale.
**FAIL pe oricare = rollback automat, fără escalare.**

1. **PRE-ACTIVARE**
   - Code review (diff + context)
   - Test unitar local → PASS
2. **SECURITATE**
   - Scan secrete (`gitleaks` sau `trufflehog`)
   - `npm audit` clean (sau acceptat explicit în commit)
   - Diff pe fișiere sensibile (config, auth, DB) — review dedicat
3. **POST-ACTIVARE**
   - Smoke test pe staging
   - Monitor 15 min metrics (errors, latency) → fără regresie

Triple Audit e complementar cu 4.4: pipeline gstack acoperă pașii 1-2,
post-activare se face prin `/canary` + monitoring manual.

### 4.6 Boundaries repo
- NU instala pachete sistem sau `sudo`.
- NU face request-uri HTTP externe fără instrucțiune explicită (singura
  excepție: `googleapis` din `/api/gdrive/upload`).
- NU atinge `database/acda.db` direct — mereu prin SQL din `database/init.ts`
  sau endpoint-uri server.
- NU accesa alte repo-uri ACDA (OpenFang, Paperclip, SOUL.md) din acest modul.
  Dacă ai nevoie de date de acolo, primești TE explicit cu contract.

## 5. Metodologia Opus-first

### 5.1 Model default
**Opus 4.7 (1M context)** este modelul default pentru orice scriere de cod
în acest repo — local Mac interactiv sau Routine cloud. Motivul:

- **Single-pass correctness** — un Opus run corect > 5 Haiku rewrites.
  Overhead-ul de cost e compensat de lipsa iterațiilor.
- **Context 1M tokens** — încape tot repo-ul + contracte + mock-uri +
  envelope-uri de task simultan, fără compactare.
- **Audit trail coerent** — fiecare sesiune produce diff-uri explicabile;
  reviewer-ul (Cristian) nu trebuie să reconcilieze decizii de model diferit
  între fișiere.

### 5.2 Cost și audit
Fiecare sesiune Opus = **eveniment de audit**. Convenții:

- Mesaj de commit include codul task-ului (C3-T2, SCHEMA-001, etc.) →
  leagă diff-ul de TE-ul care l-a generat.
- Routine cloud logă automat sesiunea; pentru local, istoricul conversației
  rămâne în `~/.claude/projects/...`.
- **Nu lansăm Opus pentru task-uri triviale** (rename, reformat, typo fix) —
  acelea merg pe Haiku direct sau manual.

### 5.3 Când Opus frontier vs local DGX
| Task | Runtime | De ce |
|---|---|---|
| Cod TypeScript / SQL / schema migration | **Opus frontier** | correctness > cost; cod intră în prod |
| Code review adversarial | **Opus frontier** (`codex` second opinion) | detectează edge case-uri |
| Execuție TE complet | **Opus frontier** via Routines | context + autonomie + audit trail |
| Narative client (Strategie 10min, Diagnostic 90s) | **DGX local** (qwen3.5:35b-a3b / gemma4:26b) | volum mare, latență mică, fără date sensibile cross-client |
| Embeddings (semantic search, dedupe) | **DGX local** (bge-m3) | pur numeric, zero cost marginal |
| Sumare/tldr pe date interne | **DGX local** (qwen3.5:9b rezident) | rapid, suficient calitativ |
| Transcriere apeluri Zadarma | **DGX local** (Whisper Large-v3 Turbo, ~3GB, on-demand) | audio → text fără cloud third-party |

Regulă de aur: **dacă output-ul merge în repo (cod, schema, contract), merge
prin Opus frontier.** Dacă output-ul merge la client sau în UI ca text generat,
poate merge local.

### 5.4 Non-negociabil: zero modele cloud non-Anthropic
- Anthropic Claude (Opus / Sonnet / Haiku) e singurul cloud model folosit.
- **Zero OpenAI, Gemini, modele cloud chineze** (DeepSeek, Qwen cloud,
  Zhipu etc.). Pentru fallback non-Anthropic → DGX local. Niciodată cloud terț.

## 6. Arhitectura repo — anchor-uri cheie

Pentru tree-ul complet rulează `tree src/ server/ database/ -L 3`. Mai jos,
ce înseamnă fiecare folder — nu unde se află fișierele, ci **rolul lor în
sistem** și unde faci modificări când ai un tip anume de task.

### 6.1 `src/` — frontend React

| Anchor | Rol | Când atingi |
|---|---|---|
| `pages/Dashboard.tsx`, `pages/ClientIntake.tsx`, `pages/MaturityRisk.tsx` | Pagini top-level (nu-Cockpit) | Funcționalitate dashboard / intake flow |
| `pages/Cockpit/CockpitPage.tsx`, `PageShell.tsx`, `ValidationPage.tsx` | Shell-ul Cockpit | Navigație + frame comun celor 12 pagini |
| `pages/Cockpit/pages/01..12_*.tsx` | Cele 12 pagini ale consultantului (ClientOverview → ChestionarClient) | Schimbi ordinea / conținutul cockpit-ului |
| `pages/ClientDeliverables/` | 3 deliverable-uri client (Diagnostic90s, Strategy10min, AIReadiness) | Format/narativ livrabil final |
| `layouts/CockpitLayout.tsx` | Nav sticky + timer + ValidationGate | Reguli de trecere între pagini |
| `context/ProjectContext.tsx` | State global pe proiectul activ | Schimbi forma datelor proiect live |
| `contracts/agent-contracts.ts` | **Contract TypeScript** output agenți OpenClaw (CTD/Qual/PreAnaliză/Oferta), `PAGINI_COCKPIT`, `StatusProiect`, `StatusPagina` | Orice breaking change la formatul output agent; `contracts/README.md` explică semantica |
| `constants/acda.constants.ts` | 9 indicatori maturitate, ponderi arii, praguri nivel | Când metodologia ACDA se schimbă |
| `types/acda.types.ts`, `types/confidence.ts` | Tipuri DB + tipuri confidence scoring | După orice `schema.sql` change; `confidence.ts` = pattern confidence levels |
| `data/APIAdapter.ts` | Wrapper `fetch('/api/...')` — intrare/ieșire REST | Add endpoint nou; centralizează error handling |
| `data/DataIngestionLayer.ts` | Layer-ul de ingestie pentru surse externe (output agent → state) | `POST /api/ingest` (Sprint 1) iese prin aici |
| `services/export/` | `PDFExportService` (15 secțiuni), `Diagnostic90sPDF`, `Strategy10minPDF`, `AIReadinessPDF` | Format raport exportat |
| `services/gdrive/GDriveUploadService.ts` | Client wrapper peste `/api/gdrive/*` | Flow upload raport în Drive client |
| `services/narrative/NarrativeService.ts` | Template SCQAPS + fallback LLM | Integrarea narativ LLM (Palace/Ollama) |
| `components/charts/` | `pdfCharts` (radar, waterfall), `riskMapCanvas` | Grafice noi în PDF |
| `components/` (restul) | `CockpitNav`, `CockpitProgress`, `ConfidenceField`, `ConfidenceIndicator`, `ConfidenceSummary`, `ConsultantTimer`, `EBITWidget`, `NarrativePanel`, `ProjectSelector`, `ValidationGate` | Reusable UI building blocks |
| `utils/maturityCalculator.ts` | `scoreO1..S3`, agregare area/global, `getMaturityLevel` — **JSDoc obligatoriu** | Când ponderile se schimbă |
| `theme/levelStyles.ts` | Mapare nivel maturitate → Tailwind classes | UI tweak |
| `mocks/mock-cloudserve.ts` | Seed CloudServe SRL (probleme, oportunități, EBIT) — **sursa de adevăr pentru shape-ul output-urilor agent** până când DB acoperă tabelele lipsă | Orice schimbare de contract agent se reflectă aici ȘI în seed simultan |

### 6.2 `server/` — backend Express

| Anchor | Rol |
|---|---|
| `server/index.ts` | 10 endpoint-uri REST: clients, projects, EBIT, maturity, status. Parameterized queries (`@name`). Port 3001. |
| `server/gdrive.ts` | Router `/api/gdrive` — status + upload OAuth2. Folosește `.gdrive-credentials.json` (gitignored). |

### 6.3 `database/` — persistență

| Anchor | Rol |
|---|---|
| `database/schema.sql` | 5 tabele: Client, Project, EBITBaseline, MaturityIndicator, MaturityScore |
| `database/init.ts` | Creează DB dacă lipsește + seed CloudServe (status `CIORNA`). Idempotent. |
| `database/acda.db[-shm/-wal]` | SQLite runtime files — **gitignored, nu le atinge direct** |

### 6.4 Fluxul de date (resumé)
```
Agent OpenClaw (DGX)  →  POST /api/ingest (Sprint 1)  →  DataIngestionLayer
                                                              │
ProjectContext  ◄──  APIAdapter  ◄──  server/index.ts  ◄──  SQLite (acda.db)
      │
      ├─► Pagini Cockpit (01..12) — consultant interactiv
      ├─► ClientDeliverables (Diagnostic/Strategie/AIReadiness) — export PDF
      └─► services/gdrive → /api/gdrive/upload → Drive client (OAuth2)
```

### 6.5 Invarianți business

Limite hard pentru livrabilele client. Respectate de `services/export/*PDF.ts`
și validate manual de Cristian la aprobare. Orice schimbare trece prin TE
+ bump de `constants/acda.constants.ts` (versiune).

| Deliverable | Țintă durată | Buget pagini |
|---|---|---|
| **C1 — Diagnostic 90s** (`Diagnostic90sPDF`) | 90 secunde citire | **3-5 pagini** |
| **C2 — Strategie 10min** (`Strategy10minPDF`) | 10 minute citire | **8-12 pagini** |
| **C3 — AI Readiness** (`AIReadinessPDF`) | 15-20 minute parcurgere | **15-25 pagini** |

### 6.6 Status proiect — enum pe scurt

Statusuri canonice flow proiect (SCHEMA-001 v1.1 → v1.3, 8 statusuri + RESPINS):

| Status | Rol în flow |
|---|---|
| `CIORNĂ` | Start default; consultantul completează Cockpit-ul 01..12 |
| `RUTINĂ_FRONTIER` | Routine cloud rulează frontier job pe datele proiect (nou în v1.3) |
| `VALIDARE_CONSULTANT` | Consultant verifică output frontier înainte de a avansa (absoarbe vechiul `AȘTEAPTĂ_APROBARE`) |
| `OFERTĂ_GENERATĂ` | Oferta comercială produsă și atașată proiectului |
| `APROBAT` | Cristian / CEO a dat verdict pozitiv |
| `REVIEW_OPUS` | Round de review Opus final pe raport înainte de livrare |
| `FINALIZAT` | Raport livrat clientului, upload GDrive efectuat |
| `ARHIVAT` | Proiect închis, păstrat read-only în DB |
| `RESPINS` | Side-status: întoarce proiectul la `CIORNĂ` cu motiv consemnat |

> **Pentru tranzițiile complete, validări Zod și semantica business completă:**
> vezi `src/contracts/status-project.ts` (SCHEMA-001 v1.1+). CLAUDE.md
> păstrează doar rezumatul ca să evite single-source drift.

## 7. Task Envelope (TE) workflow

### 7.1 Ce e un TE
Un **Task Envelope** este specificația executabilă a unui task frontier-grade:
contract complet între Cristian (aprobator) și Claude Code (executor), astfel
încât o sesiune — locală sau Routine cloud — poate rula end-to-end fără
follow-up. Live la `docs/task-envelopes/TE-*.md`.

Exemple existente (Sprint 0 / Val 1 FRONTIER):
- `TE-CTD-FRONTIER-SCHEMA-001_v1_1.md` — migrare schema v1.2 → v1.3
- `TE-CTD-FRONTIER-API-001_v1_1.md` — handler-e frontier + adapter bridge

### 7.2 Anatomia unui TE (secțiuni canonice)
Ordinea și denumirile de mai jos sunt normative — urmează-le când
scrii/execuți TE-uri noi:

1. **Header** — cod TE, versiune, dată, urgență, deadline, **executor** (Claude Code + path repo), **aprobare** (Cristian)
2. **Changelog v{n-1} → v{n}** — ce s-a schimbat față de versiunea anterioară și de ce
3. **Sumar** — 3-6 bullet-uri: ce se livrează
4. **Decizii canonice aplicate** / **Dependențe externe** / **Out of scope** — ce presupuneri sunt fixate, ce trebuie să fie deja OK, ce NU rezolvă TE-ul ăsta
5. **Fișiere afectate** — listă explicită path-uri; orice file touched în afara listei = halt
6. **⚠️ PAS 0 — Validare pre-execuție** — comenzi diagnostic rulate *înainte* de orice modificare. Dacă realitatea diferă de ipoteza TE-ului → **STOP + addendum v{n+1}**, NU modificare silent
7. **FAZA 1..N** — execuție pe faze cu timp alocat per fază, fiecare cu acceptance criteria explicit
8. **Triplu Audit** — gate final (pre-activare / securitate / post-activare — vezi §4.5)
9. **Ordine execuție** — secvența strictă dependință între faze
10. **gstack pipeline (pre-merge)** — checklist `/review → /cso → /qa → /canary → /ship`
11. **Blast Radius** — ce se rupe dacă TE-ul eșuează la jumătate
12. **Reguli execuție Claude Code** — constrângeri specifice (ex. nu atinge fișiere X, cere confirmare la Y)
13. **Referințe** — linkuri la SCHEMA-001, contracte, ADR-uri relevante
14. **Livrabile finale (checklist consolidat)** — bifat manual de Cristian la aprobare

### 7.3 Reguli de execuție
- **Pas 0 = gate absolut.** Dacă un singur output din Pas 0 contrazice ipotezele TE, execuția se oprește și se produce un addendum v{n+1} înainte de orice cod nou.
- **Versioning:** TE-urile sunt imutabile odată ce au un număr de versiune validat. Modificările merg în v1.1, v1.2 etc., cu changelog explicit — nu rescriere silent.
- **Un TE = un commit series.** Commit-urile din execuție poartă în mesaj codul TE (`SCHEMA-001: faza 1 migration up`, `API-001: faza 3 handler cache`).
- **Blast Radius este citibil înainte de execuție** — dacă nu înțelegi ce se rupe când TE-ul cade la mijloc, nu lansa.
- **SCHEMA-001 e referința v1.1 canonică** pentru structura TE frontier — orice TE nou se modelează după el.

### 7.4 Relație cu pipeline-ul gstack
TE-ul specifică *ce* se face; gstack-ul (§4.4) specifică *cum se validează*.
Ele sunt ortogonale: un TE fără gstack pre-merge e incomplet, un run gstack
fără TE e doar quality gate pe cod ad-hoc.

## 8. Pattern-uri XML pentru prompt-uri standardizate

**Status:** prescriptiv. Repo-ul n-a folosit XML-structured prompts până acum;
secțiunea asta stabilește baseline-ul canonic pentru TE-uri, sesiuni Routine
și orice prompt important scris de Cristian sau Claude Code de aici încolo.
Patternurile fac promptul citibil pentru revizor (Cristian) și parsabil
pentru agent (mai ales Routines cloud, unde structura reduce ambiguitate).

### 8.1 Reguli de folosire
- Tag-urile sunt **case-sensitive, snake_case**, închise corect.
- Nu se amestecă markdown interior fără motiv — conținutul rămâne text plain sau listă.
- Un prompt important folosește minim `<task>` + `<context>` + `<success_criteria>`.
- Un TE de executat în Routine folosește minim `<task>` + `<context>` + `<constraints>` + `<success_criteria>` + `<blast_radius>`.

### 8.2 Catalog (15 patterns)

| Tag | Scop | Exemplu scurt |
|---|---|---|
| `<task>` | Ce se face, o propoziție imperativă. | `<task>Migrează schema v1.2 la v1.3 adăugând 10 coloane pe Project.</task>` |
| `<context>` | Ce știe agentul despre sistem/repo/istoric. | `<context>ACDA-DTM pe branch main. Schema curentă la v1.2. Agenții OpenClaw rulează pe DGX.</context>` |
| `<instructions>` | Pași concreți de urmat (ordonate). | `<instructions>1. Rulează Pas 0. 2. Scrie migration up. 3. Scrie rollback.</instructions>` |
| `<constraints>` | Ce NU se face; limite hard. | `<constraints>Zero ALTER pe tabele existente fără backup. Zero DROP.</constraints>` |
| `<thinking>` | Spațiu rezervat pentru reasoning intern înainte de output. | `<thinking>Verific întâi dacă coloana există deja ca să fac migration idempotent.</thinking>` |
| `<examples>` | Exemple input→output pentru shape-ul dorit. | `<examples>input: "CIORNA" → output: {status:"CIORNA",canEdit:true}</examples>` |
| `<output_format>` | Forma exactă a livrabilului. | `<output_format>Un fișier .sql + un changelog entry în CHANGELOG.md.</output_format>` |
| `<reasoning>` | Justificare vizibilă a deciziilor (distinct de `<thinking>` care e intern). | `<reasoning>Am ales TEXT CHECK în loc de CREATE TYPE pentru compat SQLite.</reasoning>` |
| `<input>` | Date concrete pe care agentul trebuie să le proceseze. | `<input>{"project_id":"abc","status":"CIORNA"}</input>` |
| `<sources>` | Fișiere / documente / linkuri de consultat obligatoriu. | `<sources>docs/task-envelopes/TE-CTD-FRONTIER-SCHEMA-001_v1_1.md</sources>` |
| `<self_check>` | Checklist pe care agentul îl verifică înainte de a livra (aliniat cu Pas 0 TE). | `<self_check>- Schema match? - Test pass? - Changelog updated?</self_check>` |
| `<success_criteria>` | Ce trebuie să fie adevărat ca task-ul să fie considerat completat. | `<success_criteria>npm run typecheck PASS && migration rollback reversibil.</success_criteria>` |
| `<anti_patterns>` | Erori tipice pe care agentul le evită activ. | `<anti_patterns>- Nu folosi git push --force. - Nu hardcoda parole inline.</anti_patterns>` |
| `<audit>` | Info pentru Triple Audit Protocol (§4.5). | `<audit>Pre: typecheck+tests. Sec: gitleaks+npm audit. Post: smoke 15min.</audit>` |
| `<blast_radius>` | Ce se rupe dacă task-ul eșuează la jumătate. | `<blast_radius>Migration up fără down → DB blocat la v1.25 → rollback manual obligatoriu.</blast_radius>` |

### 8.3 Scheme minime
- **Prompt ad-hoc Cristian → Claude local:** `<task>` + `<context>` + `<success_criteria>`.
- **TE cloud Routine:** toate cele 15 sau subset motivat, documentat în v1.x al TE-ului.
- **Review / audit:** `<task>` + `<sources>` + `<self_check>` + `<anti_patterns>`.

## 9. Slash commands — catalog operațional

10 comenzi active în flow-ul ACDA-DTM. Toate live în gstack skills
(`~/.claude/skills/<name>/`). `/review → /cso → /qa → /canary → /ship` este
pipeline-ul obligatoriu pre-land (§4.4); celelalte 5 sunt auxiliare, apelate
pe cerere.

### 9.1 Pipeline pre-land (5 — obligatorii)

| Comandă | Scop | Exemplu scurt |
|---|---|---|
| `/review` | Diff review structural (SQL safety, LLM trust boundaries, edge cases) pe branch-ul curent vs base. | `/review` — înainte de orice push care atinge server/ sau database/. |
| `/cso` | Audit security: secrete leaked, supply chain, OWASP, CI/CD pipeline. Mod daily (8/10) sau comprehensive. | `/cso` după adăugare de dependență sau OAuth scope nou. |
| `/qa` | Test flow real în browser (UI) sau unit tests — iterează și repară. Pentru raport fără fix: `/qa-only`. | `/qa` după schimbări în `pages/Cockpit/` sau ClientDeliverables. |
| `/canary` | Post-deploy monitoring (console errors, perf, screenshots) vs baseline pre-deploy. | `/canary` imediat după `/ship` pe task-uri care ating UI. |
| `/ship` | Bundle: merge base, tests, review diff, bump VERSION, CHANGELOG, commit, push, PR. | `/ship` la închiderea unui TE — pe solo-dev pushează direct pe main. |

### 9.2 Auxiliare (5 — pe cerere)

| Comandă | Scop | Exemplu scurt |
|---|---|---|
| `/investigate` | Debug sistematic 4-phase: investigate → analyze → hypothesize → implement. Iron Law: fără fix fără root cause. | `/investigate "Export PDF dă NaN pe raport pag. 11"` — pentru orice bug reprodus. |
| `/codex` | Second opinion independent via OpenAI Codex CLI. Trei moduri: `review` (diff), `challenge` (adversarial), `consult` (întrebare liberă). | `/codex review` pe TE-uri cu blast radius mare. |
| `/checkpoint` | Salvează stare + decizii + work rămas; resume cross-session (util între faze TE lungi sau între local și Routine cloud). | `/checkpoint` la finalul fazei 3/5 dintr-un TE, înainte de pauză. |
| `/careful` | Warnings înainte de comenzi destructive (rm -rf, DROP TABLE, force-push, git reset --hard). | `/careful` activ când lucrezi pe DGX sau atingi `database/`. |
| `/health` | Dashboard compozit quality score (typecheck + lint + tests + dead code + shell lint), cu trending în timp. | `/health` la finalul unui sprint, pentru a vedea evoluția. |

### 9.3 Ce NU folosim aici
- `/init` — n-are sens, CLAUDE.md există.
- `/land-and-deploy` — activ pe repo-uri cu deploy automat; ACDA-DTM n-are pipeline cloud de deploy la momentul v2.0.
- `/design-*` — relevante pentru proiecte UI-heavy greenfield; ACDA-DTM are layout stabil.
- Orice custom ACDA — la v2.0 nu există comenzi custom; dacă se creează, vor fi documentate aici cu bump de versiune CLAUDE.md.

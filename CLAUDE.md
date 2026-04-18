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

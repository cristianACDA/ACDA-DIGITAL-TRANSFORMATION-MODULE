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

# CLAUDE.md

Îndrumări pentru Claude Code când lucrează în acest repo.

## Project Identity
- Company: ACDA Consulting (acda.ro)
- Agent Role: Development agent — singurul writer de cod
- Product: ACDA Digital Transformation Module (Cockpit CTD + deliverables client)

## Stack

- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + react-router-dom 7
- **Backend:** Express 5 + better-sqlite3 (SQLite local) — rulează pe port 3001, proxy Vite `/api`
- **Export:** jsPDF + jspdf-autotable (grafice canvas→PNG)
- **GDrive:** googleapis (OAuth2 refresh token), server-side only
- **Package manager:** npm (preferat Bun la nivel de home, dar aici stay on npm — lock-file committed)

## Commands

- `npm run db:init` — crează SQLite + seed CloudServe SRL
- `npm run dev` — concurrently: server (3001) + client (5173)
- `npm run build` — tsc build + vite build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint

Primul setup: `npm install && npm run db:init && npm run dev`.

## Architecture

```
src/
├── pages/
│   ├── Dashboard.tsx · ClientIntake.tsx · MaturityRisk.tsx
│   ├── Cockpit/pages/01..12_*.tsx     — 12 pagini cockpit CTD
│   └── ClientDeliverables/            — 3 deliverables client-facing
│       ├── Diagnostic90s.tsx          — 3 întrebări vizuale, 90s
│       ├── Strategy10min.tsx          — 4 capitole narative, 10min
│       └── AIReadiness.tsx            — Use case scoring + Risk Map + Adoption Path
├── layouts/CockpitLayout.tsx          — nav 12 pagini + timer + validare
├── context/ProjectContext.tsx         — state global pe proiect activ
├── data/APIAdapter.ts                 — wrapper peste fetch('/api/...')
├── services/
│   ├── export/                        — PDFExportService (raport 15 secţiuni),
│   │                                    Diagnostic90sPDF, Strategy10minPDF, AIReadinessPDF
│   ├── gdrive/GDriveUploadService.ts  — client wrapper peste /api/gdrive/*
│   └── narrative/NarrativeService.ts  — template SCQAPS + fallback
├── components/
│   ├── charts/                        — pdfCharts (radar, waterfall) + riskMapCanvas
│   ├── CockpitNav, CockpitProgress, ConfidenceField, ConfidenceSummary,
│   │   ConsultantTimer, EBITWidget, NarrativePanel, ProjectSelector, ValidationGate
├── contracts/agent-contracts.ts       — 4 interfeţe output agenţi + PAGINI_COCKPIT +
│                                        StatusProiect + StatusPagina
├── constants/acda.constants.ts        — 9 indicatori, ponderi arii, praguri, versiune
├── types/acda.types.ts                — tipuri DB (Client, Project, EBITBaseline, …)
├── utils/maturityCalculator.ts        — scoreO1..S3 + area/global + getMaturityLevel
├── theme/levelStyles.ts               — mapare nivel → Tailwind classes
└── mocks/mock-cloudserve.ts           — CloudServe SRL seed (probleme, oportunitati, ebit)

server/
├── index.ts       — 10 endpoint-uri REST (clients, projects, ebit, maturity, status)
└── gdrive.ts      — router /api/gdrive — status + upload OAuth2 Drive

database/
├── schema.sql     — 5 tabele: Client, Project, EBITBaseline, MaturityIndicator, MaturityScore
└── init.ts        — crează DB dacă lipseşte + seed CloudServe (status CIORNA)
```

## Status proiect

Unificat cu `StatusProiect` din `contracts/agent-contracts.ts`:
`CIORNA → VALIDARE_CONSULTANT → ASTEAPTA_APROBARE → APROBAT → REVIEW_OPUS → FINALIZAT → ARHIVAT`
(plus `RESPINS` care întoarce la `CIORNA`). Default pentru proiect nou: `CIORNA`.

## TODO — lipseşte încă

- Tabele DB: `Process`, `Problem`, `Opportunity`, `BusinessCase`, `Initiative`,
  `StrategyPillar`, `RoadmapPhase`, `ReportSection` — deocamdată live doar în mocks.
- Endpoint `POST /api/ingest` — primeşte output agent (CTD/Qual/PreAnaliză/Oferta).
- CRUD server-side pentru procese / probleme / oportunităţi.
- Integrare reală cu Palace / Ollama pentru narrative LLM (fallback template e live).

## Conventions

- **SQL:** doar parameterized queries (`@name`), nimic interpolat. better-sqlite3.
- **TypeScript:** strict mode, `noUnusedLocals`, `noUnusedParameters`.
- **JSDoc:** funcţii publice din `utils/` — obligatoriu.
- **Confidenţialitate:** NU commita `.env`, `server/.gdrive-credentials.json`, `database/*.db`.
- **Mock data:** `mock-cloudserve.ts` este sursa de adevăr pentru schema outputurilor agenţilor —
  orice schimbare a contractului se reflectă în mock + seed simultan.
- **Deliverables client:** max budgets de cuvinte respectate (Diagnostic 150, Strategie 1500).

## Workflow

- **Push direct pe `main`** — Cristian e singurul developer pe faza de construcţie.
  Nu se deschid PR-uri draft. Commit mesaj scurt cu codul taskului la început (ex. `C3-T2: …`).
- Pipeline ACDA global (`/review → /cso → /qa → /ship`) se aplică abia când repo-ul intră
  în producţie cu multi-contributor setup.

## Boundaries

- NU instala pachete sistem sau `sudo`.
- NU face request-uri HTTP externe fără instrucţiune explicită (singura excepţie:
  `googleapis` din `/api/gdrive/upload`, cu credenţiale din env).
- NU atinge `database/acda.db` direct — mereu prin SQL din `init.ts` sau endpoint-uri server.
- NU accesa alte repo-uri ACDA (OpenFang, Paperclip, SOUL.md) din acest modul.

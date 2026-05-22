# CLAUDE.md — ACDA CTD Module (Cockpit Transformare Digitală)

> Convenții repo v2.1 — 22 Mai 2026 (EOD Sync — vezi CHANGELOG). Schema internă: v1.3.
> Surse de adevăr live: schema/status în `src/contracts/` (tipuri TypeScript), nu în acest fișier.

## Identitate
Modul CTD pentru ACDA Consulting SRL (acda.ro). CEO și singur aprobator livrabile: Cristian Daniel Lungu (Gate Cristian).
Filozofie: **Result as a Service** — cod determinist > micro-agent > AI generalist.

## Repo & Stack
- Repo: `cristianACDA/ACDA-DIGITAL-TRANSFORMATION-MODULE`
- Local: `~/ACDA-DIGITAL-TRANSFORMATION-MODULE/` (MacBook Air M5 până pe 5 Mai; apoi DGX port 5001 — config `.env`, nu refactor)
- Stack: React 19 + Vite 6 + TypeScript strict + Tailwind CSS 4 + Express 5 (port 3001) + PostgreSQL
- Pornire: `npm run db:init && npm run dev`
- DB: PostgreSQL — init prin `database/pg.ts` (`initPostgres()`); schema în `database/migrations/001_ctd_schema.sql`
- Contracte: `src/contracts/agent-contracts.ts` (tipuri + const TypeScript)

## Executor & Pipeline (NON-NEGOCIABIL)
1. **Claude Code = singurul writer de cod** — exclusiv pe host-ul de dev, NU pe DGX.
2. **gstack obligatoriu:** `/review → /cso → /qa → /canary → /ship`. Oprire la primul FAIL.
3. **Triplu Audit:** Pre-Activare → Securitate → Post-Activare. FAIL = ROLLBACK.
4. Niciun PR pe `main` fără: validare consultant + Gate Cristian + review Opus.

## Naming
- **Client-facing = AAA (AI Adoption Audit / Triple A).** Toate documentele client folosesc „AI Adoption Audit".
- **Intern/tehnic = CTD.** Nu se expune clientului.

## Schema (v1.3)
- Sursă de adevăr = tipurile TypeScript din `src/contracts/agent-contracts.ts`. SQL-ul nu se referă direct din handler; doar prin aceste tipuri.
- v1.3 = v1.2 + 10 coloane pe `Project` (7 tracking frontier + 3 bypass verdict).
- Trigger `Project_updated_at`: auto-refresh la orice UPDATE. **Handler-ele NU setează manual `updated_at`.**

## Status flow
- **Sursă unică = `agent-contracts.ts` → `StatusProiect` + `STATUS_PROIECT_META`.** NU duplica enum-ul aici (cauza desincronizării anterioare).
- 8 statusuri. Flux principal (`STATUS_PROIECT_META[...].urmator`): `CIORNA → VALIDARE_CONSULTANT → ASTEAPTA_APROBARE → APROBAT → REVIEW_OPUS → FINALIZAT → ARHIVAT` (terminal, `urmator: null`).
- `RESPINS` NU e terminal: `urmator: CIORNA` (revine la consultant pentru corecții).
- Enumerarea și tranzițiile exacte se citesc din cod, nu din acest fișier.

## Praguri clasificare (canonic — D3 / D-CTD-01)
| Scor global | Clasificare |
|---|---|
| 0.0 – 2.4 | NECONFORM |
| 2.5 – 3.4 | IN_PROGRES |
| 3.5 – 4.4 | CONFORM |
| 4.5 – 5.0 | LIDER |

## Indicatori Setul A ACDA v1.1 (9, scală 0–5)
- Piloni & ponderi: Strategie & ROI 0.40, Tehnologie & Date 0.35, Oameni & Adopție 0.25
- S1 Focusul EBIT · S2 Validarea Capstone · S3 Trustworthy AI
- T1 Data Products · T2 API-First · T3 Assetizare
- O1 Regula 1:1 · O2 Densitatea Talentului · O3 Riscul de Instruire

## Confidence (D-CTD-02)
- Float 0.0–1.0 per câmp. HIGH >=0.8 · MEDIUM 0.5–0.79 · LOW <0.5
- `data_source` obligatoriu: transcriere_whisper | anaf | openapi | manual | agent_ctd

## Cockpit
12 pagini + Validare finală (checklist + submit).

## Reguli de cod
1. JSDoc pe fiecare funcție.
2. Parameterized queries — zero string interpolation SQL.
3. Zero commit `.env` sau secrete. Credențiale exclusiv în env, `chmod 600`. Doar draft PR.
4. TypeScript strict — zero `any`, zero `@ts-ignore`.
5. Boundaries: NU accesa alte proiecte. NU `sudo`. NU request-uri HTTP externe fără instrucțiune. NU deploy direct.
6. Schimbări de schemă prin fișiere SQL în `database/migrations/` (PostgreSQL), nu ALTER ad-hoc din handler. Backup înainte.
7. Commit per fază, mesaj descriptiv. Limba RO în output.

## MCP — providere READ-ONLY (invariant)
- **Context7** și **GitHub MCP** sunt EXCLUSIV surse de context. NU scriu niciodată în repo.
- Toate scrierile trec prin Claude Code → gstack → `/ship`.
- GitHub MCP: token cu scope **read-only** (fără create-PR / write). În env, `chmod 600`.
- Context7: trimite spre exterior DOAR nume de librării/versiuni și întrebări generice de API. NICIODATĂ date client sau cod proprietar (Principiul #2 — zero data exit).

## Documente canonice de referință
- Manualul ACDA v2.0 — sursă unică metodologică
- TE-CTD-FRONTIER-SCHEMA-001 v1.1, TE-CTD-FRONTIER-API-001 v1.1 — schema + API
- (Arhivate: Doc Architecture v1.0, TE-CTD-INGEST-001, Bridge v2 — superseded)

## Stare implementare (verificat în cod 22 Mai)
- ✅ POST `/api/projects/:id/ingest` — implementat (`server/index.ts:449`); scrie EBIT, maturitate, procese, probleme, oportunități
- ✅ Persistență Process / Problem / Opportunity — GET/PUT dedicate (`server/index.ts:418-442`), nu state React local
- ✅ Status / EBIT / Maturitate — endpointuri PUT dedicate
- DE CONSTRUIT: persistare peisaj tech, strategie, plan implementare, chestionar (fără endpoint dedicat încă)

## Comunicare ACDA OS
- Webhook Agent_CTD (DGX) → ingest. Zero date client ies din perimetru — doar rezultate procesate.
- Modele DGX — sursa de adevăr = `ollama list` pe DGX (sparkacda1@100.93.193.85). Alocarea pe sarcini e fluidă, se verifică live.
- Exemple curente (pot drifta): qwen3.6:35b-a3b (raționament principal), deepseek-ocr:3b (OCR), gemma4-acda:31b custom, bge-m3 (embeddings).
- Bridge review strategic: Claude Opus (versiune din config rutină `acda-ctd-full`) asincron via Routines.

# ACDA Agent Contracts (cockpit ↔ ACDA OS)

**Sursă:** `agent-contracts.ts` v1.1.
**Scope:** definiții TypeScript pentru JSON-urile pe care cei 4 agenți ACDA OS le livrează cockpit-ului CTD React.

## Cei 4 agenți și outputurile lor

| Agent | Output | Rol |
|---|---|---|
| `Agent_Qual` | `AgentQualOutput` | Calificare client: verdict VERDE/GALBEN/ROȘU pe criterii eliminatorii + confidence |
| `Agent_PreAnaliza` | `AgentPreAnalizaOutput` | Mini-brief pre-vânzare: context, oportunități, riscuri |
| `Agent_CTD` | `AgentCTDOutput` | Raport maturitate complet: 9 indicatori (Setul A), 3 arii, scor global 0–5, roadmap, cuantificări |
| `Agent_Oferta` | `AgentOfertaOutput` | Pachet comercial: 4 niveluri (Mini-Diagnostic → Sprint → Pachet Transformare → Guvernanță) |

## Concepte cheie

- **Setul A (9 indicatori):** S1-S3 (Strategie & ROI, 40%), T1-T3 (Tehnologie & Date, 35%), O1-O3 (Oameni & Adopție, 25%).
- **Scor:** scală 0–5 per indicator; medii pe arie; medie ponderată globală.
- **Niveluri maturitate:** `NECONFORM` (<2), `IN_PROGRES` (2–3), `CONFORM` (3–4), `LIDER` (≥4).
- **Confidence:** float `0.0–1.0` + `confidence_level` derivat (`HIGH ≥ 0.8`, `MEDIUM 0.5–0.79`, `LOW < 0.5`) + `data_source` (ex. `openapi`, `anaf`, `conversatie_telegram`, `quick_scan`, sau `null`).
- **Refs ACDA:** `palace_ref`, `gdrive_ref`, `notion_ref` — pointeri către artefactele externe ale fiecărui output.
- **Cele 12 pagini cockpit:** pag 1-10 = fluxul operațional, pag 11 = Preview Raport, pag 12 = Chestionar Client (opțional).

## Cum folosești mock-urile

```ts
import { mockCTDOutput } from "../mocks/mock-cloudserve";

// scor_total pentru CloudServe SRL (CUI 44521837) este 1.67 (NECONFORM)
console.log(mockCTDOutput.scor_global.scor_total); // 1.67
console.log(mockCTDOutput.scor_global.nivel);      // "NECONFORM"
```

Mock-urile sunt utile pentru:
- Dezvoltare UI offline (cockpit fără ACDA OS pornit).
- Storybook / preview componente.
- Teste de integrare — fixture stabil.

## Reguli de adoptare

- **Nu introduce logică de calcul aici.** Contractele sunt pur declarative. Calculul mediilor / scorului global se face în ACDA OS sau în utilitarul din `src/utils/`.
- **La schimbare de contract, bumpează `agent_version` în `AgentMetadata`.**
- **Nu exportă helpers non-tip** din `agent-contracts.ts` decât constante statice (`PONDERI_ARII`, `INDICATOR_ARIE_MAP`, etc.).

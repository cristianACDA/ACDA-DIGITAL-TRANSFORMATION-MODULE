import { templateForPage } from './scqaps-templates'
import type { SCQAPSTemplate } from './scqaps-templates'
import type { Client, EBITBaseline, MaturityIndicator } from '../../types/acda.types'
import { mockCTDOutput } from '../../mocks/mock-cloudserve'
import {
  calculateAreaScore, calculateGlobalScore, getMaturityLevel,
} from '../../utils/maturityCalculator'
import { MATURITY_INDICATORS } from '../../constants/acda.constants'
import type { IndicatorCode } from '../../types/acda.types'

export interface NarrativeContext {
  pageNum:            number
  pageTitle:          string
  client:             Client | null
  ebitBaseline:       EBITBaseline | null
  maturityIndicators: MaturityIndicator[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtRON = (n: number | null | undefined) =>
  typeof n === 'number' ? n.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) : '—'

function companySizeLabel(n: number | null | undefined): string {
  if (typeof n !== 'number') return 'IMM'
  if (n < 10) return 'micro-întreprindere'
  if (n < 50) return 'IMM'
  if (n < 250) return 'companie medie'
  return 'companie mare'
}

// ─── Variable extraction per page ────────────────────────────────────────────

function buildVars(ctx: NarrativeContext): Record<string, string> {
  const c = ctx.client
  const e = ctx.ebitBaseline
  const base: Record<string, string> = {
    titlu:           ctx.pageTitle,
    company_name:    c?.company_name ?? 'compania',
    cui:             c?.cui ?? '—',
    industry:        c?.industry ?? 'serviciilor',
    employee_count:  String(c?.employee_count ?? '—'),
    annual_revenue:  fmtRON(c?.annual_revenue),
    contact_name:    c?.main_contact_name ?? '—',
    contact_role:    c?.main_contact_role ?? '—',
    company_size_label: companySizeLabel(c?.employee_count),
  }

  // ── Pagina 2 — EBIT
  if (ctx.pageNum === 2) {
    const cur = e?.ebit_current ?? 0
    const tgt = e?.ebit_target ?? 0
    const delta = tgt - cur
    Object.assign(base, {
      ebit_current:  fmtRON(cur),
      ebit_margin:   typeof e?.ebit_margin_current === 'number' ? e.ebit_margin_current.toFixed(2) : '—',
      ebit_target:   fmtRON(tgt),
      delta_pct:     typeof e?.ebit_target_delta_percent === 'number' ? e.ebit_target_delta_percent.toFixed(0) : '—',
      delta_ron:     fmtRON(delta),
      it_spend:      fmtRON(e?.it_spend_current),
    })
  }

  // ── Pagina 3 — Maturitate
  if (ctx.pageNum === 3) {
    const scoreByCode: Partial<Record<IndicatorCode, number>> = {}
    for (const ind of ctx.maturityIndicators) {
      if (typeof ind.score === 'number') scoreByCode[ind.indicator_code] = ind.score
    }
    const scoresFor = (aria: string) => MATURITY_INDICATORS
      .filter((i) => i.aria === aria)
      .map((i) => scoreByCode[i.id])
      .filter((s): s is number => typeof s === 'number')

    const oa = calculateAreaScore(scoresFor('Oameni & Adopție'))
    const td = calculateAreaScore(scoresFor('Tehnologie & Date'))
    const sr = calculateAreaScore(scoresFor('Strategie & ROI'))
    const total = calculateGlobalScore({ oameni: oa, tehnologie: td, strategie: sr })
    const subPrag = ctx.maturityIndicators
      .filter((ind) => typeof ind.score === 'number' && ind.score < 3)
      .map((ind) => ind.indicator_code)

    Object.assign(base, {
      scor_total:       total.toFixed(2),
      nivel:            getMaturityLevel(total),
      scor_oameni:      oa.toFixed(2),
      scor_tehnologie:  td.toFixed(2),
      scor_strategie:   sr.toFixed(2),
      count_sub_prag:   String(subPrag.length),
      sub_prag_list:    subPrag.length ? subPrag.join(', ') : 'niciunul',
    })
  }

  // ── Pagina 5 — Probleme (din mock pentru CloudServe)
  if (ctx.pageNum === 5) {
    const isCloudServe = c?.cui === '44521837'
    const probleme = isCloudServe ? mockCTDOutput.probleme : []
    const impactTotal = probleme.reduce((acc, p) => acc + (p.impact_financiar ?? 0), 0)
    const top = probleme.slice(0, 2).map((p) => `„${p.titlu}"`).join(' şi ')
    Object.assign(base, {
      count_probleme: String(probleme.length),
      impact_total:   fmtRON(impactTotal),
      top_probleme:   top || '—',
    })
  }

  // ── Pagina 7 — Oportunităţi (din mock pentru CloudServe)
  if (ctx.pageNum === 7) {
    const isCloudServe = c?.cui === '44521837'
    const ops = isCloudServe ? mockCTDOutput.oportunitati : []
    const impactTotal = ops.reduce((acc, o) => acc + (o.impact_ebit_estimat ?? 0), 0)
    const top = [...ops].sort((a, b) => (b.impact_ebit_estimat ?? 0) - (a.impact_ebit_estimat ?? 0))[0]
    Object.assign(base, {
      count_oportunitati: String(ops.length),
      impact_total:       fmtRON(impactTotal),
      top_oportunitate:   top ? `„${top.titlu}" (≈${fmtRON(top.impact_ebit_estimat)} RON impact)` : '—',
    })
  }

  // ── Pagina 4 — Value stream (etichetă liberă)
  if (ctx.pageNum === 4) {
    const isCloudServe = c?.cui === '44521837'
    const procese = isCloudServe ? mockCTDOutput.procese : []
    const impact = procese.reduce((acc, p) => acc + (p.impact_ebit ?? 0), 0)
    Object.assign(base, {
      impact_procese_label: impact > 0 ? `${fmtRON(impact)} RON anual` : 'pragul de relevanţă',
    })
  }

  return base
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`
  )
}

function renderTemplate(tpl: SCQAPSTemplate, vars: Record<string, string>): string {
  return [
    `## Situație`,     interpolate(tpl.situatie, vars),    '',
    `## Complicație`,  interpolate(tpl.complicatie, vars), '',
    `## Întrebare`,    interpolate(tpl.intrebare, vars),   '',
    `## Răspuns`,      interpolate(tpl.raspuns, vars),     '',
    `## Plan`,         interpolate(tpl.plan, vars),        '',
    `## Suport`,       interpolate(tpl.suport, vars),
  ].join('\n')
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type GenerationMode = 'template' | 'llm'

/**
 * Generează narativă SCQAPS pentru o pagină. Default: template-based fallback.
 * Mode 'llm' va apela un LLM (Gemini) — în Faza 1 returnează tot template
 * (stub), pentru a păstra contractul stabil când devine activ.
 */
export async function generateNarrative(
  ctx: NarrativeContext,
  mode: GenerationMode = 'template',
): Promise<{ text: string; mode: GenerationMode; generatedAt: string }> {
  const tpl = templateForPage(ctx.pageNum)
  const vars = buildVars(ctx)
  const text = renderTemplate(tpl, vars)

  if (mode === 'llm') {
    // TODO P3-T4+: înlocuieşte stub-ul cu apel real Gemini API când e configurat.
    // Pentru Faza 1, mode 'llm' se comportă identic cu 'template'.
    return { text, mode: 'llm', generatedAt: new Date().toISOString() }
  }
  return { text, mode: 'template', generatedAt: new Date().toISOString() }
}

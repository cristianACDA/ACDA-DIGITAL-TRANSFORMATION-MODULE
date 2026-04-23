import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCockpit } from '../layouts/CockpitLayout'
import { useProjectContext } from '../context/ProjectContext'
import { generateNarrative } from '../services/narrative/NarrativeService'
import { PAGINI_COCKPIT } from '../contracts/agent-contracts'

interface NarrativePanelProps {
  pageNum?: number
}

export default function NarrativePanel({ pageNum: pageNumProp }: NarrativePanelProps) {
  const { pageNum: pageNumParam } = useParams<{ pageNum?: string }>()
  const pageNum = pageNumProp ?? Number(pageNumParam ?? '1')
  const meta = PAGINI_COCKPIT.find((p) => p.numar === pageNum)

  const { narratives, setNarrative, clearNarrative } = useCockpit()
  const { client, ebitBaseline, maturityIndicators } = useProjectContext()

  const entry = narratives[pageNum]
  const [open, setOpen] = useState<boolean>(true)
  const [busy, setBusy] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  async function handleGenerate(force = false) {
    if (entry?.isManuallyEdited && !force) {
      const ok = window.confirm(
        'Narativa curentă a fost editată manual. Regenerarea o va înlocui. Continui?'
      )
      if (!ok) return
    }
    setBusy(true)
    try {
      const result = await generateNarrative({
        pageNum,
        pageTitle: meta?.titlu_ro ?? `Pagina ${pageNum}`,
        client,
        ebitBaseline,
        maturityIndicators,
      })
      setNarrative(pageNum, {
        text: result.text,
        source: result.mode,
        generatedAt: result.generatedAt,
        isManuallyEdited: false,
      })
    } finally {
      setBusy(false)
    }
  }

  function handleEdit(text: string) {
    setNarrative(pageNum, {
      text,
      source: entry?.source ?? 'manual',
      generatedAt: entry?.generatedAt ?? null,
      isManuallyEdited: true,
    })
  }

  function handleSave() {
    // Narativa e deja în context (live). Buton Save = feedback vizual + confirmare commit.
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const sourceLabel = entry
    ? entry.isManuallyEdited
      ? { txt: 'editat manual',    chip: 'bg-subtle border-border-subtle text-[color:var(--color-text-primary)]' }
      : entry.source === 'llm'
        ? { txt: 'generat AI',      chip: 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle text-accent-warning' }
        : { txt: 'generat automat', chip: 'bg-[color:rgba(34,197,94,0.08)] border-border-subtle text-accent-success' }
    : null

  return (
    <section className="border-t border-[color:var(--color-border-subtle)] bg-[#FAFBFD]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-[color:var(--color-page)] transition-colors"
      >
        <span className="text-xs font-semibold text-[color:var(--color-text-body)]/60 uppercase tracking-widest flex items-center gap-2">
          <span className="text-text-primary">◈</span> Narativă SCQAPS
          {sourceLabel && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sourceLabel.chip}`}>
              {sourceLabel.txt}
            </span>
          )}
        </span>
        <span className="text-[color:var(--color-text-body)]/40 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-6 pb-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleGenerate(false)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[color:var(--color-text-primary)] bg-[color:var(--color-text-primary)] text-white hover:bg-[color:var(--color-text-body)] disabled:opacity-50"
            >
              {busy ? 'Generez…' : entry ? '↻ Regenerează narativa' : '✨ Generează narativă'}
            </button>
            {entry && (
              <button
                type="button"
                onClick={() => clearNarrative(pageNum)}
                className="text-xs text-[color:var(--color-text-body)]/60 hover:text-accent-danger px-2 py-1.5"
              >
                Şterge
              </button>
            )}
            <span className="flex-1" />
            {entry && (
              <button
                type="button"
                onClick={handleSave}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[color:var(--color-border-subtle)] bg-white text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-primary)]"
              >
                {savedFlash ? '✓ Salvat' : '💾 Salvează'}
              </button>
            )}
          </div>

          {entry ? (
            <>
              <textarea
                value={entry.text}
                onChange={(e) => handleEdit(e.target.value)}
                rows={Math.min(24, Math.max(12, entry.text.split('\n').length))}
                className="w-full bg-white border border-[color:var(--color-border-subtle)] rounded-lg px-3 py-2.5 text-sm font-mono leading-relaxed text-[color:var(--color-text-body)] focus:outline-none focus:border-[color:var(--color-text-primary)] focus:ring-2 focus:ring-[color:var(--color-text-primary)]/10 resize-y"
              />
              {entry.generatedAt && (
                <p className="text-[10px] text-[color:var(--color-text-body)]/40 italic">
                  generat: {new Date(entry.generatedAt).toLocaleString('ro-RO')}
                  {entry.isManuallyEdited && ' · modificat ulterior de consultant'}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[color:var(--color-text-body)]/60 italic">
              Apasă <strong>„Generează narativă"</strong> pentru a obţine un draft SCQAPS din datele curente.
              Fallback template — fără apel LLM (Faza 1).
            </p>
          )}
        </div>
      )}
    </section>
  )
}

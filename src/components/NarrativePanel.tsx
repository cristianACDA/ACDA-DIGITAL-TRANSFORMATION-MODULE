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
      ? { txt: 'editat manual',    chip: 'bg-blue-50 border-blue-200 text-[#071F80]' }
      : entry.source === 'llm'
        ? { txt: 'generat AI',      chip: 'bg-amber-50 border-amber-200 text-amber-700' }
        : { txt: 'generat automat', chip: 'bg-green-50 border-green-200 text-green-700' }
    : null

  return (
    <section className="border-t border-[#E6E6E6] bg-[#FAFBFD]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-[#F6F9FC] transition-colors"
      >
        <span className="text-xs font-semibold text-[#0A2540]/60 uppercase tracking-widest flex items-center gap-2">
          <span style={{ color: '#071F80' }}>◈</span> Narativă SCQAPS
          {sourceLabel && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sourceLabel.chip}`}>
              {sourceLabel.txt}
            </span>
          )}
        </span>
        <span className="text-[#0A2540]/40 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-6 pb-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleGenerate(false)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#071F80] bg-[#071F80] text-white hover:bg-[#0A2540] disabled:opacity-50"
            >
              {busy ? 'Generez…' : entry ? '↻ Regenerează narativa' : '✨ Generează narativă'}
            </button>
            {entry && (
              <button
                type="button"
                onClick={() => clearNarrative(pageNum)}
                className="text-xs text-[#0A2540]/60 hover:text-red-700 px-2 py-1.5"
              >
                Şterge
              </button>
            )}
            <span className="flex-1" />
            {entry && (
              <button
                type="button"
                onClick={handleSave}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E6E6E6] bg-white text-[#071F80] hover:border-[#071F80]"
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
                className="w-full bg-white border border-[#E6E6E6] rounded-lg px-3 py-2.5 text-sm font-mono leading-relaxed text-[#0A2540] focus:outline-none focus:border-[#071F80] focus:ring-2 focus:ring-[#071F80]/10 resize-y"
              />
              {entry.generatedAt && (
                <p className="text-[10px] text-[#0A2540]/40 italic">
                  generat: {new Date(entry.generatedAt).toLocaleString('ro-RO')}
                  {entry.isManuallyEdited && ' · modificat ulterior de consultant'}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#0A2540]/60 italic">
              Apasă <strong>„Generează narativă"</strong> pentru a obţine un draft SCQAPS din datele curente.
              Fallback template — fără apel LLM (Faza 1).
            </p>
          )}
        </div>
      )}
    </section>
  )
}

import { useMemo, useState } from 'react'
import { useCockpit } from '../layouts/CockpitLayout'
import { useProjectContext } from '../context/ProjectContext'
import { PAGINI_COCKPIT } from '../contracts/agent-contracts'
import { apiAdapter } from '../data/APIAdapter'

interface Check {
  id: string
  label: string
  passed: boolean
  detail: string
}

const REQUIRED_NARRATIVES = [1, 2, 3, 5, 7]

export default function ValidationGate() {
  const { statuses, fieldsByPage, narratives, timerSeconds } = useCockpit()
  const { activeProjectId, project, setActiveProjectId } = useProjectContext()
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checks: Check[] = useMemo(() => {
    // Paginile obligatorii 1-11 (12 e opţională).
    const requiredPages = PAGINI_COCKPIT.filter((p) => !p.optionala).map((p) => p.numar)
    const pendingPages = requiredPages.filter((n) => {
      const s = statuses[n] ?? 'pre_populat'
      return s !== 'validat' && s !== 'skip'
    })

    // Câmpuri LOW needitate (rămase roşii) pe orice pagină.
    const lowFields: Array<{ page: number; label: string }> = []
    for (const [pageStr, fields] of Object.entries(fieldsByPage)) {
      for (const f of Object.values(fields)) {
        if (f.confidence_level === 'LOW') lowFields.push({ page: Number(pageStr), label: f.label })
      }
    }

    // Narative pe paginile critice 1, 2, 3, 5, 7.
    const missingNarratives = REQUIRED_NARRATIVES.filter((n) => {
      const entry = narratives[n]
      return !entry || entry.text.trim().length === 0
    })

    return [
      {
        id: 'pages_validated',
        label: 'Toate paginile obligatorii (1-11) sunt „validat" sau „skip"',
        passed: pendingPages.length === 0,
        detail: pendingPages.length === 0
          ? '11/11 pagini obligatorii marcate'
          : `Lipsesc: pag. ${pendingPages.join(', ')}`,
      },
      {
        id: 'no_low_fields',
        label: 'Zero câmpuri roşii (LOW) needitate',
        passed: lowFields.length === 0,
        detail: lowFields.length === 0
          ? 'Toate câmpurile au fost validate sau corectate'
          : `${lowFields.length} câmp(uri) LOW: ${lowFields.slice(0, 3).map((l) => `${l.label} (pag. ${l.page})`).join('; ')}${lowFields.length > 3 ? '…' : ''}`,
      },
      {
        id: 'narratives',
        label: `Narativă SCQAPS pe paginile critice (${REQUIRED_NARRATIVES.join(', ')})`,
        passed: missingNarratives.length === 0,
        detail: missingNarratives.length === 0
          ? `${REQUIRED_NARRATIVES.length}/${REQUIRED_NARRATIVES.length} narative generate`
          : `Lipsesc pe pag. ${missingNarratives.join(', ')}`,
      },
    ]
  }, [statuses, fieldsByPage, narratives])

  const allPassed = checks.every((c) => c.passed)

  async function handleValidate() {
    if (!activeProjectId || !allPassed) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await apiAdapter.updateProjectStatus(activeProjectId, {
        status: 'ASTEAPTA_APROBARE',
        validation_time_seconds: timerSeconds,
      })
      setConfirmation(`Proiectul „${updated.name ?? project?.name ?? activeProjectId}" a fost trimis pentru aprobare. Status: ASTEAPTA_APROBARE. Notificarea Telegram urmează în P4.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <section className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col gap-3">
        <p className="text-2xl">✓</p>
        <h2 className="text-lg font-black text-green-800">Trimis pentru aprobare</h2>
        <p className="text-sm text-green-900/80">{confirmation}</p>
        <button onClick={() => setActiveProjectId(null)}
          className="self-start text-xs font-semibold border border-green-300 hover:border-green-500 bg-white text-green-800 px-3 py-1.5 rounded-lg">
          ← Lista proiecte
        </button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-black text-[#071F80]">Validare finală</h2>
        <p className="text-sm text-[#0A2540]/60 mt-1">
          Trei condiţii trebuie îndeplinite înainte ca proiectul să poată fi trimis pentru aprobare.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
            c.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              c.passed ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {c.passed ? '✓' : '✗'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${c.passed ? 'text-green-800' : 'text-red-800'}`}>
                {c.label}
              </p>
              <p className={`text-xs mt-0.5 ${c.passed ? 'text-green-700/80' : 'text-red-700/80'}`}>
                {c.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
          Eroare: {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E6E6E6]">
        <p className="text-xs text-[#0A2540]/60">
          Timp sesiune curentă: <strong className="font-mono">
            {Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s
          </strong> — se va salva ca metadata.
        </p>
        <button
          type="button"
          disabled={!allPassed || submitting}
          onClick={handleValidate}
          className={`text-sm font-bold px-5 py-2.5 rounded-lg border transition-colors ${
            allPassed && !submitting
              ? 'border-[#071F80] bg-[#071F80] text-white hover:bg-[#0A2540]'
              : 'border-[#E6E6E6] bg-white text-[#0A2540]/30 cursor-not-allowed'
          }`}
          title={!allPassed ? 'Îndeplineşte toate condiţiile pentru a putea valida.' : ''}
        >
          {submitting ? 'Trimit…' : '🚀 Validare completă → trimite spre aprobare'}
        </button>
      </div>
    </section>
  )
}

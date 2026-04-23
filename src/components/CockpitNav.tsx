import { useNavigate } from 'react-router-dom'
import { PAGINI_COCKPIT } from '../contracts/agent-contracts'
import { useCockpit } from '../layouts/CockpitLayout'

interface CockpitNavProps {
  currentPage: number
}

export default function CockpitNav({ currentPage }: CockpitNavProps) {
  const navigate = useNavigate()
  const { totalPages } = useCockpit()

  const prevDisabled = currentPage <= 1
  const nextDisabled = currentPage >= totalPages

  const prevPage = PAGINI_COCKPIT.find((p) => p.numar === currentPage - 1)
  const nextPage = PAGINI_COCKPIT.find((p) => p.numar === currentPage + 1)

  return (
    <div className="border-t border-[color:var(--color-border-subtle)] px-6 py-4 flex items-center justify-between gap-3 bg-[color:var(--color-page)]">
      <button
        type="button"
        disabled={prevDisabled}
        onClick={() => navigate(`/cockpit/${currentPage - 1}`)}
        className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
          prevDisabled
            ? 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-body)]/30 cursor-not-allowed bg-white'
            : 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-primary)] bg-white hover:border-[color:var(--color-text-primary)] hover:bg-[color:var(--color-subtle)]'
        }`}
      >
        ← {prevPage ? prevPage.titlu_ro : 'Înapoi'}
      </button>

      <span className="text-xs text-[color:var(--color-text-body)]/50 tabular-nums">
        Pagina {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        disabled={nextDisabled}
        onClick={() => navigate(`/cockpit/${currentPage + 1}`)}
        className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
          nextDisabled
            ? 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-body)]/30 cursor-not-allowed bg-white'
            : 'border-[color:var(--color-text-primary)] text-white bg-[color:var(--color-text-primary)] hover:bg-[color:var(--color-text-body)]'
        }`}
      >
        {nextPage ? nextPage.titlu_ro : 'Următor'} →
      </button>
    </div>
  )
}

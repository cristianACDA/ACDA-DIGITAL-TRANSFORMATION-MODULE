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
    <div className="border-t border-[#E6E6E6] px-6 py-4 flex items-center justify-between gap-3 bg-[#F6F9FC]">
      <button
        type="button"
        disabled={prevDisabled}
        onClick={() => navigate(`/cockpit/${currentPage - 1}`)}
        className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
          prevDisabled
            ? 'border-[#E6E6E6] text-[#0A2540]/30 cursor-not-allowed bg-white'
            : 'border-[#E6E6E6] text-[#071F80] bg-white hover:border-[#071F80] hover:bg-[#EEF3FF]'
        }`}
      >
        ← {prevPage ? prevPage.titlu_ro : 'Înapoi'}
      </button>

      <span className="text-xs text-[#0A2540]/50 tabular-nums">
        Pagina {currentPage} / {totalPages}
      </span>

      <button
        type="button"
        disabled={nextDisabled}
        onClick={() => navigate(`/cockpit/${currentPage + 1}`)}
        className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
          nextDisabled
            ? 'border-[#E6E6E6] text-[#0A2540]/30 cursor-not-allowed bg-white'
            : 'border-[#071F80] text-white bg-[#071F80] hover:bg-[#0A2540]'
        }`}
      >
        {nextPage ? nextPage.titlu_ro : 'Următor'} →
      </button>
    </div>
  )
}

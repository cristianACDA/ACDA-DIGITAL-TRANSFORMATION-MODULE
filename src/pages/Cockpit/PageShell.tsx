import type { ReactNode } from 'react'
import { PAGINI_COCKPIT } from '../../contracts/agent-contracts'
import CockpitNav from '../../components/CockpitNav'
import NarrativePanel from '../../components/NarrativePanel'

interface PageShellProps {
  pageNum: number
  children: ReactNode
}

export default function PageShell({ pageNum, children }: PageShellProps) {
  const meta = PAGINI_COCKPIT.find((p) => p.numar === pageNum)
  return (
    <div className="flex flex-col h-full min-h-[60vh]">
      <div className="flex-1 px-6 py-6 flex flex-col gap-5">
        <div>
          <p className="text-xs text-[#0A2540]/40 uppercase tracking-widest mb-1">
            Pagina {pageNum} {meta?.optionala && '· opţional'}
          </p>
          <h1 className="text-2xl font-black text-[#071F80]">{meta?.titlu_ro ?? `Pagina ${pageNum}`}</h1>
          <p className="text-xs text-[#0A2540]/50 mt-1 italic">{meta?.titlu}</p>
        </div>
        {children}
      </div>
      <NarrativePanel pageNum={pageNum} />
      <CockpitNav currentPage={pageNum} />
    </div>
  )
}

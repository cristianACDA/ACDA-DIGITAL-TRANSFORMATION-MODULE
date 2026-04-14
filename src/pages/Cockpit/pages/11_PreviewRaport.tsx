import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectContext } from '../../../context/ProjectContext'
import { useCockpit } from '../../../layouts/CockpitLayout'
import { PDFExportService } from '../../../services/export/PDFExportService'

interface Section {
  cod: string
  titlu: string
  sursa_pagina: number
  complete: boolean
  detail: string
}

export default function PreviewRaport() {
  const { client, project, ebitBaseline, maturityIndicators } = useProjectContext()
  const { fieldsByPage, statuses, narratives } = useCockpit()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const fieldsOnPage = (n: number) => Object.values(fieldsByPage[n] ?? {}).length
  const validatedOf = (n: number) => statuses[n] === 'validat'

  const sections: Section[] = [
    { cod: 'S01', titlu: 'Sumar executiv',          sursa_pagina: 11, complete: !!client && !!project, detail: client?.company_name ?? '—' },
    { cod: 'S02', titlu: 'Prezentare client',       sursa_pagina: 1,  complete: !!client?.company_name, detail: `${client?.company_name ?? '—'} · CUI ${client?.cui ?? '—'}` },
    { cod: 'S03', titlu: 'EBIT baseline',           sursa_pagina: 2,  complete: !!ebitBaseline?.ebit_current, detail: `EBIT ${ebitBaseline?.ebit_current?.toLocaleString('ro-RO') ?? '—'} RON` },
    { cod: 'S04', titlu: 'Scor maturitate (9 ind.)', sursa_pagina: 3, complete: maturityIndicators.length === 9, detail: `${maturityIndicators.length}/9 indicatori` },
    { cod: 'S05', titlu: 'Value streams',           sursa_pagina: 4,  complete: fieldsOnPage(4) > 0, detail: `${fieldsOnPage(4)} câmp(uri)` },
    { cod: 'S06', titlu: 'Probleme identificate',   sursa_pagina: 5,  complete: fieldsOnPage(5) > 0, detail: `${fieldsOnPage(5)} câmp(uri)` },
    { cod: 'S07', titlu: 'Tech landscape',          sursa_pagina: 6,  complete: validatedOf(6),     detail: validatedOf(6) ? 'completat' : 'în lucru' },
    { cod: 'S08', titlu: 'Oportunităţi',            sursa_pagina: 7,  complete: fieldsOnPage(7) > 0, detail: `${fieldsOnPage(7)} câmp(uri)` },
    { cod: 'S09', titlu: 'Prioritizare & ROI',      sursa_pagina: 8,  complete: fieldsOnPage(7) > 0, detail: 'derivat din pag. 7' },
    { cod: 'S10', titlu: 'Strategie & piloni',      sursa_pagina: 9,  complete: validatedOf(9),     detail: validatedOf(9) ? 'completat' : 'în lucru' },
    { cod: 'S11', titlu: 'Roadmap 4 faze',          sursa_pagina: 10, complete: validatedOf(10),    detail: validatedOf(10) ? 'completat' : 'în lucru' },
    { cod: 'S12', titlu: 'Buget & investiţii',      sursa_pagina: 10, complete: validatedOf(10),    detail: 'derivat din roadmap' },
    { cod: 'S13', titlu: 'Guvernanţă & risc',       sursa_pagina: 10, complete: false, detail: 'TODO P6' },
    { cod: 'S14', titlu: 'Plan adopţie',            sursa_pagina: 10, complete: false, detail: 'TODO P6' },
    { cod: 'S15', titlu: 'Concluzii & next steps',  sursa_pagina: 11, complete: false, detail: 'TODO P6' },
  ]

  const completed = sections.filter((s) => s.complete).length

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await PDFExportService.download({
        client,
        project,
        ebitBaseline,
        maturityIndicators,
        narratives,
        fieldsByPage,
        statuses,
      })
    } catch (err) {
      console.error('[PreviewRaport] export PDF failed', err)
      setExportError(err instanceof Error ? err.message : 'Eroare necunoscută la generare PDF.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="bg-[#EEF3FF] border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#071F80]/70 uppercase tracking-widest font-semibold">Status raport</p>
          <p className="text-sm text-[#0A2540] mt-1">
            <strong>{completed}/15</strong> secţiuni complete.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-black tabular-nums text-[#071F80]">
            {Math.round((completed / 15) * 100)}%
          </div>
          <Link
            to="/deliverables/diagnostic"
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-[#071F80] text-[#071F80] hover:bg-[#EEF3FF] transition-colors inline-flex items-center gap-2"
            title="Diagnostic 90 secunde — 3 întrebări vizuale pentru client."
          >
            ⚡ Diagnostic 90s
          </Link>
          <Link
            to="/deliverables/strategy"
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-[#071F80] text-[#071F80] hover:bg-[#EEF3FF] transition-colors inline-flex items-center gap-2"
            title="Strategie de transformare în 4 capitole narative."
          >
            🎯 Strategie 10min
          </Link>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !client}
            className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors inline-flex items-center gap-2 ${
              exporting || !client
                ? 'border-[#E6E6E6] bg-[#F6F9FC] text-[#0A2540]/40 cursor-not-allowed'
                : 'border-[#071F80] bg-[#071F80] text-white hover:bg-[#0A2540]'
            }`}
            title={!client ? 'Selectează un client înainte de export.' : 'Generează PDF cu cele 15 secţiuni.'}
          >
            {exporting ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Se generează…
              </>
            ) : (
              <>📄 Exportă Raport PDF</>
            )}
          </button>
        </div>
      </div>

      {exportError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          {exportError}
        </div>
      )}

      <div className="overflow-x-auto border border-[#E6E6E6] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[#F6F9FC] text-[10px] uppercase tracking-wider text-[#0A2540]/50">
            <tr>
              <th className="px-3 py-2 text-left w-16">Cod</th>
              <th className="px-3 py-2 text-left">Secţiune</th>
              <th className="px-3 py-2 text-left">Detaliu</th>
              <th className="px-3 py-2 text-center w-20">Sursă</th>
              <th className="px-3 py-2 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s.cod} className="border-t border-[#E6E6E6]">
                <td className="px-3 py-2 font-mono text-xs text-[#0A2540]/50">{s.cod}</td>
                <td className="px-3 py-2 font-medium">{s.titlu}</td>
                <td className="px-3 py-2 text-xs text-[#0A2540]/70">{s.detail}</td>
                <td className="px-3 py-2 text-center text-xs">pag. {s.sursa_pagina}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    s.complete ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {s.complete ? '✓ complet' : '○ incomplet'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

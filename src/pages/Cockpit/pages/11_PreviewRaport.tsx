import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useProjectContext } from '../../../context/ProjectContext'
import { useCockpit } from '../../../layouts/CockpitLayout'
import { PDFExportService } from '../../../services/export/PDFExportService'
import { GDriveUploadService } from '../../../services/gdrive/GDriveUploadService'

// TE-24 UX-GDRIVE-ONLY-001: single "Descarcă din Drive" button, auto-upload
// pe mount când client + date sunt complete. Fallback local doar pe error.

interface Section {
  cod: string
  titlu: string
  sursa_pagina: number
  complete: boolean
  detail: string
}

type DriveStatus = 'idle' | 'uploading' | 'ready' | 'error'

export default function PreviewRaport() {
  const { client, project, ebitBaseline, maturityIndicators } = useProjectContext()
  const { fieldsByPage, statuses, narratives } = useCockpit()

  const [driveStatus, setDriveStatus] = useState<DriveStatus>('idle')
  const [driveUrl, setDriveUrl] = useState<string | null>(null)
  const [driveUploadedAt, setDriveUploadedAt] = useState<string | null>(null)
  const [driveError, setDriveError] = useState<string>('')
  const [gdriveConfigured, setGdriveConfigured] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const uploadTriggered = useRef(false)

  useEffect(() => {
    GDriveUploadService.status().then((s) => setGdriveConfigured(s.configured))
  }, [])

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

  const buildInput = () => ({
    client, project, ebitBaseline, maturityIndicators,
    narratives, fieldsByPage, statuses,
  })

  // Auto-upload Drive pe mount — single-shot, după ce client + gdrive config ready.
  useEffect(() => {
    if (!gdriveConfigured || !client || uploadTriggered.current) return
    uploadTriggered.current = true
    setDriveStatus('uploading')
    ;(async () => {
      try {
        const input = buildInput()
        const clientName = client?.company_name ?? 'Client'
        const date = new Date().toISOString().slice(0, 10)
        const pdfBlob = await PDFExportService.generate(input)
        const { pdf } = await GDriveUploadService.uploadReportBundle(
          clientName,
          pdfBlob,
          {
            exportedAt: new Date().toISOString(),
            client, project, ebitBaseline,
            maturityIndicators, narratives, fieldsByPage, statuses,
          },
          date,
        )
        setDriveUrl(pdf.link)
        setDriveUploadedAt(pdf.uploadedAt ?? new Date().toISOString())
        setDriveStatus('ready')
      } catch (err) {
        console.warn('[PreviewRaport] drive auto-upload fallback:', err)
        setDriveError(err instanceof Error ? err.message : 'Upload Drive eșuat')
        setDriveStatus('error')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 6000)
      }
    })()
  }, [gdriveConfigured, client])

  const handleLocalDownload = async () => {
    try {
      await PDFExportService.download(buildInput())
    } catch (err) {
      console.error('[PreviewRaport] local download failed', err)
    }
  }

  const formatTimestamp = (iso: string | null): string | null => {
    if (!iso) return null
    try {
      const d = new Date(iso)
      return d.toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return null }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="bg-[color:var(--color-subtle)] border border-border-subtle rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[color:var(--color-text-primary)]/70 uppercase tracking-widest font-semibold">Status raport</p>
          <p className="text-sm text-[color:var(--color-text-body)] mt-1">
            <strong>{completed}/15</strong> secţiuni complete.
          </p>
          {driveStatus === 'ready' && driveUploadedAt && (
            <p className="text-[11px] text-[color:var(--color-text-body)]/50 mt-1">
              Ultima versiune: {formatTimestamp(driveUploadedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-semibold tabular-nums text-[color:var(--color-text-primary)]">
            {Math.round((completed / 15) * 100)}%
          </div>
          <Link
            to="/deliverables/diagnostic"
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-[color:var(--color-text-primary)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-subtle)] transition-colors inline-flex items-center gap-2"
            title="Diagnostic 90 secunde — 3 întrebări vizuale pentru client."
          >
            ⚡ Diagnostic 90s
          </Link>
          <Link
            to="/deliverables/strategy"
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-[color:var(--color-text-primary)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-subtle)] transition-colors inline-flex items-center gap-2"
            title="Strategie de transformare în 4 capitole narative."
          >
            🎯 Strategie 10min
          </Link>
          <Link
            to="/deliverables/ai-readiness"
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-[color:var(--color-text-primary)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-subtle)] transition-colors inline-flex items-center gap-2"
            title="AI Readiness Score per use case — 4 criterii."
          >
            🤖 AI Readiness
          </Link>

          {/* Single button "Descarcă din Drive" — state machine TE-24 */}
          {driveStatus === 'ready' && driveUrl ? (
            <a
              href={driveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold px-4 py-2 rounded-lg border border-[#2E75B6] bg-[#2E75B6] text-white hover:bg-[#245f94] transition-colors inline-flex items-center gap-2"
              title="Deschide raportul în Google Drive (tab nou)"
            >
              🔵 Descarcă din Drive
            </a>
          ) : driveStatus === 'error' ? (
            <button
              type="button"
              onClick={handleLocalDownload}
              disabled={!client}
              className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors inline-flex items-center gap-2 ${
                !client
                  ? 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)] text-[color:var(--color-text-body)]/40 cursor-not-allowed'
                  : 'border-[color:var(--color-border-subtle)] bg-white text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-subtle)]'
              }`}
              title={driveError || 'Drive indisponibil — descarcă local'}
            >
              ⬇️ Descarcă PDF (local)
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="text-sm font-semibold px-4 py-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-page)] text-[color:var(--color-text-body)]/50 cursor-not-allowed inline-flex items-center gap-2"
              title="Raportul se pregătește — upload în Drive în curs"
            >
              <span className="inline-block w-3 h-3 border border-[color:var(--color-text-body)]/40 border-t-[color:var(--color-text-body)] rounded-full animate-spin" />
              ⏳ Se pregătește...
            </button>
          )}
        </div>
      </div>

      {/* Toast error fallback — auto-dismiss 6s */}
      {showToast && driveStatus === 'error' && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 max-w-sm bg-[color:rgba(220,38,38,0.05)] border border-[color:rgba(220,38,38,0.3)] rounded-lg shadow-lg px-4 py-3 text-sm text-[#7f1d1d] flex items-start gap-2 z-50"
        >
          <span className="text-lg leading-none">⚠</span>
          <div className="flex-1">
            <p className="font-semibold">Upload Drive eșuat</p>
            <p className="text-xs mt-0.5 opacity-80">{driveError}. Folosește download local.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="font-bold opacity-60 hover:opacity-100"
            aria-label="Închide"
          >
            ×
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-[color:var(--color-border-subtle)] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--color-page)] text-[10px] uppercase tracking-wider text-[color:var(--color-text-body)]/50">
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
              <tr key={s.cod} className="border-t border-[color:var(--color-border-subtle)]">
                <td className="px-3 py-2 font-mono text-xs text-[color:var(--color-text-body)]/50">{s.cod}</td>
                <td className="px-3 py-2 font-medium">{s.titlu}</td>
                <td className="px-3 py-2 text-xs text-[color:var(--color-text-body)]/70">{s.detail}</td>
                <td className="px-3 py-2 text-center text-xs">pag. {s.sursa_pagina}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    s.complete ? 'bg-[color:rgba(34,197,94,0.08)] border-border-subtle text-accent-success' : 'bg-[color:rgba(245,158,11,0.08)] border-border-subtle text-accent-warning'
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

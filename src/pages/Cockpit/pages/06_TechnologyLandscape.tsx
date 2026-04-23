import { useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'

const LOW = { confidence: 0.3, confidenceLevel: 'LOW' as const, dataSource: null }

export default function TechnologyLandscape() {
  const [form, setForm] = useState({
    sisteme_principale: '',
    cloud_onprem:       '',
    integratii:         '',
    api_uri:            '',
    note:               '',
  })
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <section className="flex flex-col gap-4">
      <p className="text-xs text-[color:var(--color-text-body)]/50 italic">
        Fără mock detaliat pentru tech landscape — câmpuri pre-populate cu confidence LOW (roşu),
        de completat manual de consultant pe baza Company Profile + transcriere.
      </p>
      <ConfidenceField label="Sisteme principale (CRM, ERP, etc.)" value={form.sisteme_principale} onChange={set('sisteme_principale')} type="textarea" {...LOW} fieldId="tech.sisteme" />
      <ConfidenceField label="Cloud / on-prem / hibrid" value={form.cloud_onprem} onChange={set('cloud_onprem')} {...LOW} fieldId="tech.cloud" />
      <ConfidenceField label="Integrări existente" value={form.integratii} onChange={set('integratii')} type="textarea" {...LOW} fieldId="tech.integratii" />
      <ConfidenceField label="API-uri / canale interop" value={form.api_uri} onChange={set('api_uri')} type="textarea" {...LOW} fieldId="tech.api" />
      <ConfidenceField label="Note tech" value={form.note} onChange={set('note')} type="textarea" {...LOW} fieldId="tech.note" />
    </section>
  )
}

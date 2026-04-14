import { useState } from 'react'
import ConfidenceField from '../../../components/ConfidenceField'
import { useProjectContext } from '../../../context/ProjectContext'

const HIGH_ANAF = { confidence: 0.95, confidenceLevel: 'HIGH' as const, dataSource: 'anaf' }
const MEDIUM_CALL = { confidence: 0.7, confidenceLevel: 'MEDIUM' as const, dataSource: 'transcriere_whisper' }

export default function ClientOverview() {
  const { client } = useProjectContext()
  const [form, setForm] = useState(() => ({
    company_name:       client?.company_name ?? '',
    cui:                client?.cui ?? '',
    industry:           client?.industry ?? '',
    employee_count:     String(client?.employee_count ?? ''),
    annual_revenue:     String(client?.annual_revenue ?? ''),
    main_contact_name:  client?.main_contact_name ?? '',
    main_contact_role:  client?.main_contact_role ?? '',
    main_contact_email: client?.main_contact_email ?? '',
  }))
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ConfidenceField label="Denumire companie" value={form.company_name} onChange={set('company_name')} {...HIGH_ANAF} fieldId="client.company_name" />
      <ConfidenceField label="CUI" value={form.cui} onChange={set('cui')} {...HIGH_ANAF} fieldId="client.cui" />
      <ConfidenceField label="Industrie" value={form.industry} onChange={set('industry')} {...MEDIUM_CALL} fieldId="client.industry" />
      <ConfidenceField label="Număr angajaţi" value={form.employee_count} onChange={set('employee_count')} type="number" {...HIGH_ANAF} fieldId="client.employee_count" />
      <ConfidenceField label="Cifră de afaceri anuală (RON)" value={form.annual_revenue} onChange={set('annual_revenue')} type="number" {...HIGH_ANAF} fieldId="client.annual_revenue" />
      <ConfidenceField label="Contact principal — nume" value={form.main_contact_name} onChange={set('main_contact_name')} {...MEDIUM_CALL} fieldId="client.contact_name" />
      <ConfidenceField label="Contact principal — rol" value={form.main_contact_role} onChange={set('main_contact_role')} {...MEDIUM_CALL} fieldId="client.contact_role" />
      <ConfidenceField label="Contact principal — email" value={form.main_contact_email} onChange={set('main_contact_email')} {...MEDIUM_CALL} fieldId="client.contact_email" />
    </section>
  )
}

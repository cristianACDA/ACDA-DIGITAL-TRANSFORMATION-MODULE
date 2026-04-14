import { useState } from 'react'
import { useProjectContext } from '../../../context/ProjectContext'
import { mockCTDOutput } from '../../../mocks/mock-cloudserve'

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#071F80]'

function defaultPiloni(cui: string | undefined): string {
  if (cui !== '44521837') return ''
  // Top 3 oportunităţi ca piloni iniţiali.
  return mockCTDOutput.oportunitati
    .slice()
    .sort((a, b) => (b.impact_ebit_estimat ?? 0) - (a.impact_ebit_estimat ?? 0))
    .slice(0, 3)
    .map((o, i) => `${i + 1}. ${o.titlu}`)
    .join('\n')
}

export default function StrategieTransformare() {
  const { client } = useProjectContext()
  const [form, setForm] = useState({
    viziune: client?.cui === '44521837'
      ? 'CloudServe — leader CRM AI-native pentru IMM-uri din CEE până în 2028. Reducere churn la <2%, +50% MRR.'
      : '',
    piloni: defaultPiloni(client?.cui),
    principii: 'Trustworthy AI · ROI-driven · Adopţie-first · Open APIs · Pilot rapid.',
  })
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <section className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-medium text-[#0A2540]/60 mb-1.5">Viziune (orizont 3-5 ani)</label>
        <textarea rows={3} value={form.viziune} onChange={(e) => set('viziune')(e.target.value)} className={`${cellCls} resize-none`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#0A2540]/60 mb-1.5">Piloni strategici (derivaţi din top oportunităţi)</label>
        <textarea rows={5} value={form.piloni} onChange={(e) => set('piloni')(e.target.value)} className={`${cellCls} resize-none font-mono text-xs`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#0A2540]/60 mb-1.5">Principii directoare</label>
        <textarea rows={3} value={form.principii} onChange={(e) => set('principii')(e.target.value)} className={`${cellCls} resize-none`} />
      </div>
    </section>
  )
}

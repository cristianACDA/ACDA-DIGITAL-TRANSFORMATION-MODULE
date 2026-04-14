import { useState } from 'react'

const cellCls = 'w-full bg-white border border-[#E6E6E6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#071F80] resize-none'

const SECTIUNI = [
  { key: 'context',     label: 'Context vizită' },
  { key: 'observatii',  label: 'Observaţii pe teren' },
  { key: 'citate',      label: 'Citate notabile (audio → Whisper)' },
  { key: 'follow_up',   label: 'Întrebări de follow-up' },
] as const

type Key = typeof SECTIUNI[number]['key']

export default function ChestionarClient() {
  const [notes, setNotes] = useState<Record<Key, string>>({
    context: '', observatii: '', citate: '', follow_up: '',
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="bg-[#F6F9FC] border border-[#E6E6E6] rounded-lg px-4 py-3">
        <p className="text-xs text-[#0A2540]/70">
          ℹ Pagină <strong>opţională</strong>. Pentru note de la vizita la client. În viitor: integrare audio → Whisper → interpretare automată.
        </p>
      </div>
      {SECTIUNI.map((s) => (
        <div key={s.key}>
          <label className="block text-xs font-medium text-[#0A2540]/60 mb-1.5">{s.label}</label>
          <textarea rows={4} value={notes[s.key]}
            onChange={(e) => setNotes((p) => ({ ...p, [s.key]: e.target.value }))}
            placeholder={`Note ${s.label.toLowerCase()}…`}
            className={cellCls} />
        </div>
      ))}
    </section>
  )
}

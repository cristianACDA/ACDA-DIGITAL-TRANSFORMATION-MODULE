import { useEffect, useId, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import ConfidenceIndicator, { CONFIDENCE_STYLE } from './ConfidenceIndicator'
import type { ConfidenceLevelExtended } from '../types/confidence'
import { useCockpit } from '../layouts/CockpitLayout'

type FieldType = 'text' | 'number' | 'textarea' | 'select'

interface SelectOption { value: string; label: string }

interface ConfidenceFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  confidence: number
  confidenceLevel: ConfidenceLevelExtended
  dataSource?: string | null
  type?: FieldType
  options?: SelectOption[]
  placeholder?: string
  /** ID stabil al câmpului în pagina cockpit. Default: useId(). */
  fieldId?: string
}

/**
 * Wrapper de input cu indicator de confidence şi promovare automată la MANUAL
 * la prima editare. Înregistrează câmpul în CockpitContext pentru sumar şi
 * regula de validare per pagină.
 */
export default function ConfidenceField({
  label, value, onChange, confidence, confidenceLevel, dataSource,
  type = 'text', options = [], placeholder, fieldId,
}: ConfidenceFieldProps) {
  const autoId = useId()
  const id = fieldId ?? autoId

  // Valoarea iniţială (pre-populată de AI sau seed) — păstrată pt audit trail
  // şi pt detecţia diferenţei la editare.
  const originalValueRef = useRef<string>(value)

  // Nivelul efectiv: dacă userul a editat şi valoarea nouă diferă de original,
  // marcăm MANUAL.
  const [effectiveLevel, setEffectiveLevel] = useState<ConfidenceLevelExtended>(confidenceLevel)
  useEffect(() => {
    if (value !== originalValueRef.current) {
      setEffectiveLevel('MANUAL')
    } else {
      setEffectiveLevel(confidenceLevel)
    }
  }, [value, confidenceLevel])

  const { pageNum: pageNumStr } = useParams<{ pageNum?: string }>()
  const pageNum = Number(pageNumStr ?? '1')
  const { registerField, unregisterField } = useCockpit()

  // Înregistrare în CockpitContext pentru ConfidenceSummary + validare.
  useEffect(() => {
    registerField(pageNum, id, {
      id,
      label,
      confidence,
      confidence_level: effectiveLevel,
      data_source: dataSource ?? null,
      original_value: originalValueRef.current,
      edited: value !== originalValueRef.current,
    })
    return () => unregisterField(pageNum, id)
  }, [pageNum, id, label, confidence, effectiveLevel, dataSource, value,
      registerField, unregisterField])

  const sty = CONFIDENCE_STYLE[effectiveLevel]

  const inputCls = `w-full bg-white border-2 rounded-lg px-3 py-2 text-sm text-[#0A2540] placeholder-[#0A2540]/30 focus:outline-none focus:ring-2 focus:ring-[#071F80]/10 transition-all ${sty.border}`

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea rows={3} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} resize-none`} id={id} />
      )
    }
    if (type === 'select') {
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className={inputCls} id={id}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }
    return (
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls} id={id} />
    )
  }

  const wasEdited = value !== originalValueRef.current

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-[#0A2540]/60">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {wasEdited && (
            <button type="button"
              onClick={() => onChange(originalValueRef.current)}
              className="text-[10px] text-[#0A2540]/50 hover:text-[#071F80] underline">
              ↶ resetare original
            </button>
          )}
          <ConfidenceIndicator
            confidence={confidence}
            confidenceLevel={effectiveLevel}
            dataSource={dataSource}
          />
        </div>
      </div>
      {renderInput()}
    </div>
  )
}

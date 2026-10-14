import { useEffect, useState, type FormEvent } from 'react'
import { postMessage } from '../hooks/use-vscode'
import { estimateScanCostUsd, formatCostUsd } from '../../../src/shared/format-cost'
import { defaultLimits } from '../../../src/utilities/limits'
import type { ScanTarget } from '../types/panel'

interface AreaPickerProps {
  target: ScanTarget
  suggestions?: string[]
  // Hidden once the report already has a "What I changed this week" area.
  canScanRecent?: boolean
}

// Type a screen or feature, or tap a chip, and Gizmo scans it straight away.
export const AreaPicker = ({ target, suggestions = [], canScanRecent = true }: AreaPickerProps) => {
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)

  // A double tap sends one scan; the lock lifts on its own if Gizmo was already busy.
  useEffect(() => {
    if (!isSending) return
    const timer = setTimeout(() => setIsSending(false), SEND_LOCK_MS)
    return () => clearTimeout(timer)
  }, [isSending])

  const send = (message: Parameters<typeof postMessage>[0]) => {
    if (isSending) return
    setIsSending(true)
    postMessage(message)
  }

  const scan = (text: string) => {
    if (!text.trim()) return
    send({ type: 'askProduct', question: text.trim(), target })
    setQuestion('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    scan(question)
  }

  return (
    <div className="area-picker">
      <form className="ask-form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor={`area-input-${target}`}>
          Which screen or feature should Gizmo check?
        </label>
        <input
          id={`area-input-${target}`}
          type="text"
          value={question}
          placeholder="Which screen or feature? e.g. the camera flow"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" className="primary-button" disabled={!question.trim() || isSending}>
          Scan
        </button>
      </form>
      <div className="chat-suggestions" aria-label="Suggestions">
        {canScanRecent && (
          <button
            type="button"
            className="suggestion"
            disabled={isSending}
            onClick={() => send({ type: 'scanRecent', target })}
          >
            What I changed this week
          </button>
        )}
        {suggestions.map((area) => (
          <button
            key={area}
            type="button"
            className="suggestion"
            aria-label={`Scan the ${area} area`}
            disabled={isSending}
            onClick={() => scan(`the ${area} screens`)}
          >
            {capitalize(area)}
          </button>
        ))}
      </div>
      <p className="area-picker-cost">
        Each area costs {formatCostUsd(estimateScanCostUsd(defaultLimits.maxTotalChars))} or less on
        your own key.{' '}
        <button
          type="button"
          className="details-link"
          onClick={() => postMessage({ type: 'chooseFile', target })}
        >
          Or choose files manually
        </button>
      </p>
    </div>
  )
}

const SEND_LOCK_MS = 1500

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ')
}

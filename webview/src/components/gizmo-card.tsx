import { GizmoPose } from './gizmo-pose'
import { useSpeech } from '../hooks/use-speech'
import type { GizmoMood } from '../lib/gizmo'

export interface GizmoChip {
  label: string
  onSelect: () => void
}

interface GizmoCardProps {
  mood: GizmoMood
  message: string
  chips: GizmoChip[]
  isCelebrating?: boolean
  costNote?: string
}

export const GizmoCard = ({
  mood,
  message,
  chips,
  isCelebrating = false,
  costNote,
}: GizmoCardProps) => {
  const { isSupported, isSpeaking, speak, stop } = useSpeech()

  const handleReadAloud = () => {
    if (isSpeaking) {
      stop()
      return
    }
    speak(message)
  }

  return (
    <section className="gizmo-card" aria-label="Gizmo">
      <div className="gizmo-card-row">
        <GizmoPose
          mood={isCelebrating ? 'happy' : mood}
          className={isCelebrating ? 'gizmo-celebrate' : undefined}
        />
        <div className="gizmo-bubble">
          <p className="gizmo-bubble-name">Gizmo</p>
          <p className="gizmo-bubble-text" aria-live="polite">
            {message}
          </p>
          {isSupported && (
            <button
              type="button"
              className="gizmo-read-button"
              aria-pressed={isSpeaking}
              onClick={handleReadAloud}
            >
              {isSpeaking ? 'Stop reading' : 'Read it to me'}
            </button>
          )}
        </div>
      </div>
      {chips.length > 0 && (
        <div className="gizmo-chips">
          {chips.map((chip) => (
            <button key={chip.label} type="button" className="suggestion" onClick={chip.onSelect}>
              {chip.label}
            </button>
          ))}
        </div>
      )}
      {costNote && <p className="gizmo-cost">{costNote}</p>}
    </section>
  )
}

import { useState, type FormEvent } from 'react'
import { postMessage } from '../hooks/use-vscode'
import { useSpeech } from '../hooks/use-speech'
import { GizmoIcon } from './gizmo-icon'
import type { ChatEntry } from '../types/panel'

interface FollowUpChatProps {
  chat: ChatEntry[]
  isAsking: boolean
  onCopy: (text: string) => void
  onEmail: (text: string) => void
}

const suggestions = [
  'What should I fix first?',
  "What's missing before launch?",
  'Explain this like I am new to it.',
]

export const FollowUpChat = ({ chat, isAsking, onCopy, onEmail }: FollowUpChatProps) => {
  const [question, setQuestion] = useState('')
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const { isSupported, isSpeaking, speak, stop } = useSpeech()

  const isReading = (index: number): boolean => isSpeaking && speakingIndex === index

  const handleReadAloud = (index: number, text: string) => {
    if (isReading(index)) {
      stop()
      return
    }
    setSpeakingIndex(index)
    speak(text)
  }

  const ask = (text: string) => {
    if (!text.trim() || isAsking) return
    postMessage({ type: 'ask', question: text.trim() })
    setQuestion('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    ask(question)
  }

  return (
    <section className="chat" id="ask-gizmo" aria-label="Ask Gizmo">
      <h2 className="section-heading chat-heading">Ask Gizmo</h2>
      {chat.length === 0 && (
        <div className="chat-suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="suggestion"
              disabled={isAsking}
              onClick={() => ask(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {chat.length > 0 && (
        <div className="chat-log" role="log" aria-live="polite">
          {chat.map((entry, index) => (
            <div key={index} className={`chat-entry chat-${entry.role}`}>
              <span className="chat-role">
                {entry.role === 'assistant' && (
                  <span className="chat-avatar" aria-hidden="true">
                    <GizmoIcon size={12} />
                  </span>
                )}
                {entry.role === 'user' ? 'You' : 'Gizmo'}
              </span>
              <div className="chat-text">{entry.text}</div>
              {entry.role === 'assistant' && (
                <div className="chat-entry-actions">
                  {isSupported && (
                    <button
                      type="button"
                      className="details-link"
                      aria-pressed={isReading(index)}
                      onClick={() => handleReadAloud(index, entry.text)}
                    >
                      {isReading(index) ? 'Stop reading' : 'Read it to me'}
                    </button>
                  )}
                  <button type="button" className="details-link" onClick={() => onCopy(entry.text)}>
                    Copy
                  </button>
                  <button
                    type="button"
                    className="details-link"
                    onClick={() => onEmail(entry.text)}
                  >
                    Open in email
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {isAsking && <p className="muted">Gizmo is thinking…</p>}
      <form className="chat-form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="chat-input">
          Ask Gizmo
        </label>
        <input
          id="chat-input"
          type="text"
          value={question}
          placeholder="Ask Gizmo anything about what you built…"
          disabled={isAsking}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" className="primary-button" disabled={isAsking || !question.trim()}>
          Ask
        </button>
      </form>
      <p className="chat-tip">
        Tip: on a Mac, click the box and press <kbd>Fn</kbd> twice (or the mic key) to talk instead
        of type.
      </p>
    </section>
  )
}

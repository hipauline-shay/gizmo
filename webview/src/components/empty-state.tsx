import { useState, type FormEvent } from 'react'
import { postMessage } from '../hooks/use-vscode'
import { MapStatusLine } from './map-status'
import { GizmoPose } from './gizmo-pose'
import { ApiKeySetup } from './api-key-setup'
import type { MapStatus } from '../types/panel'

const suggestions = [
  'Explain the camera flow',
  'How does onboarding work?',
  'What happens when this request fails?',
  'Where is user data saved?',
]

interface EmptyStateProps {
  mapStatus?: MapStatus
  hasApiKey?: boolean
}

export const EmptyState = ({ mapStatus, hasApiKey }: EmptyStateProps) => {
  const [question, setQuestion] = useState('')

  const ask = (text: string) => {
    if (!text.trim()) return
    postMessage({ type: 'askProduct', question: text.trim() })
    setQuestion('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    ask(question)
  }

  return (
    <div className="centered-state">
      <GizmoPose mood="sleeping" size={120} />
      <h1 className="empty-title">Hi, I'm Gizmo.</h1>
      <p className="empty-copy">
        Tell me which screen or feature to look at. I'll check what's built, what's missing, and sum
        it up so you can share it with your team.
      </p>
      <p className="empty-note">
        Works with JavaScript and TypeScript projects: React, Next.js, React Native, Node.
      </p>
      {hasApiKey === false ? (
        <ApiKeySetup />
      ) : (
        <>
          <form className="ask-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="ask-input">
              What would you like to understand?
            </label>
            <input
              id="ask-input"
              type="text"
              value={question}
              placeholder="What would you like to understand?"
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button type="submit" className="primary-button" disabled={!question.trim()}>
              Ask
            </button>
          </form>
          <div className="chat-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion"
                onClick={() => ask(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <MapStatusLine mapStatus={mapStatus} />
          <div className="empty-secondary">
            <button
              type="button"
              className="ghost-button"
              onClick={() => postMessage({ type: 'scanProduct' })}
            >
              Scan whole product
            </button>
            <button
              type="button"
              className="details-link"
              onClick={() => postMessage({ type: 'chooseFile' })}
            >
              Or choose files manually
            </button>
          </div>
        </>
      )}
      <p className="privacy-note">
        Gizmo maps file relationships locally. Only the files selected for analysis are sent to
        Anthropic, using your own API key.
      </p>
    </div>
  )
}

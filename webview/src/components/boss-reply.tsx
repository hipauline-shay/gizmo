import { useState, type FormEvent } from 'react'
import { BOSS_AUDIENCES, type BossAudience } from '../lib/gizmo'

interface BossReplyProps {
  isAsking: boolean
  onDraft: (message: string, audience: BossAudience) => void
  onClose: () => void
}

export const BossReply = ({ isAsking, onDraft, onClose }: BossReplyProps) => {
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<BossAudience>('manager')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!message.trim() || isAsking) return
    onDraft(message, audience)
    setMessage('')
  }

  return (
    <section className="boss-reply" id="boss-reply" aria-label="Help me answer my boss">
      <div className="boss-reply-header">
        <h2 className="section-heading">Help me answer my boss</h2>
        <button type="button" className="ghost-button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="muted">
        Paste the message from Slack or email. Gizmo drafts a reply from what's actually built, and
        you decide whether to send it.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="boss-audience" role="radiogroup" aria-label="Who is asking?">
          <span className="boss-audience-label">Who's asking?</span>
          {AUDIENCE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={audience === option}
              className="suggestion"
              onClick={() => setAudience(option)}
            >
              {BOSS_AUDIENCES[option]}
            </button>
          ))}
        </div>
        <label className="visually-hidden" htmlFor="boss-message">
          Message from your boss
        </label>
        <textarea
          id="boss-message"
          rows={4}
          value={message}
          placeholder={'e.g. "Where are we with the upload screen? Can we launch Friday?"'}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="boss-reply-actions">
          <button type="submit" className="primary-button" disabled={isAsking || !message.trim()}>
            Draft my reply
          </button>
        </div>
      </form>
    </section>
  )
}

const AUDIENCE_OPTIONS = Object.keys(BOSS_AUDIENCES) as BossAudience[] // Object.keys loses the literal key type

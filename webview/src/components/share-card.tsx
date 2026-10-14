import { useSpeech } from '../hooks/use-speech'

interface ShareCardProps {
  summary: string
  onCopy: () => void
  onEmail: () => void
}

export const ShareCard = ({ summary, onCopy, onEmail }: ShareCardProps) => {
  const { isSupported, isSpeaking, speak, stop } = useSpeech()

  const handleReadAloud = () => {
    if (isSpeaking) {
      stop()
      return
    }
    speak(summary)
  }

  return (
    <section className="share-card" id="share-update" aria-label="Share with your team">
      <div className="share-card-header">
        <h2 className="section-heading">Share with your team</h2>
        <div className="share-card-actions">
          {isSupported && (
            <button
              type="button"
              className="ghost-button"
              aria-pressed={isSpeaking}
              aria-label={
                isSpeaking ? 'Stop reading the team update' : 'Read the team update aloud'
              }
              onClick={handleReadAloud}
            >
              {isSpeaking ? 'Stop reading' : 'Read it to me'}
            </button>
          )}
          <button type="button" className="ghost-button" onClick={onEmail}>
            Open in email
          </button>
          <button type="button" className="primary-button" onClick={onCopy}>
            Copy update
          </button>
        </div>
      </div>
      <p className="muted">
        Paste it into Slack, email or your standup. It reads as your own update.
      </p>
      <pre className="share-card-preview">{summary}</pre>
    </section>
  )
}

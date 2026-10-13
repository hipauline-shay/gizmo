interface ShareCardProps {
  summary: string
  onCopy: () => void
  onEmail: () => void
}

export const ShareCard = ({ summary, onCopy, onEmail }: ShareCardProps) => (
  <section className="share-card" id="share-update" aria-label="Share with your team">
    <div className="share-card-header">
      <h2 className="section-heading">Share with your team</h2>
      <div className="share-card-actions">
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

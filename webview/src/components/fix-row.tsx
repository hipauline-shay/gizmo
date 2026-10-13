import { EvidenceGroup, EvidenceLink } from './evidence-link'
import { LEVEL_LABEL, SOURCE_LABEL, type FixItem, type FixStatus } from '../lib/build-fix-list'

const DISMISS_REASONS = ['Intentional', 'Out of scope', 'Handled elsewhere', 'Read the code wrong']

interface FixRowProps {
  item: FixItem
  status: FixStatus
  reason?: string
  expanded: boolean
  dismissing: boolean
  readOnly?: boolean
  onToggleDone?: () => void
  onLater: () => void
  onToggleEvidence: () => void
  onAskDismiss?: () => void
  onDismiss?: (reason: string) => void
}

export const FixRow = ({
  item,
  status,
  reason,
  expanded,
  dismissing,
  readOnly = false,
  onToggleDone,
  onLater,
  onToggleEvidence,
  onAskDismiss,
  onDismiss,
}: FixRowProps) => (
  <li className={`fix-row fix-row-${status} fix-row-level-${item.level}`}>
    <div className="fix-row-main">
      {!readOnly && (
        <input
          type="checkbox"
          className="fix-checkbox"
          aria-label={`Mark "${item.text}" as fixed`}
          checked={status === 'done'}
          onChange={onToggleDone}
        />
      )}
      <div className="fix-row-body">
        <div className="fix-badges">
          <span className={`badge fix-level-${item.level}`}>
            {LEVEL_LABEL[item.level]} · {item.kind}
          </span>
          {status === 'later' && <span className="badge">Deferred</span>}
          {status === 'dismissed' && <span className="badge">Dismissed as {reason}</span>}
          <span className="fix-source">
            Created by {SOURCE_LABEL[item.createdBy]}
            {item.requestedFor && item.requestedFor !== item.createdBy && (
              <> · For {SOURCE_LABEL[item.requestedFor]}</>
            )}
          </span>
        </div>
        <p className="fix-title">{item.text}</p>
        {item.description && <p className="fix-description">{item.description}</p>}
        {item.evidence[0] && (
          <div className="fix-file-ref">
            <EvidenceLink evidence={item.evidence[0]} />
          </div>
        )}
        <div className="fix-actions">
          {!readOnly && (
            <button type="button" className="fix-action-link" onClick={onToggleEvidence}>
              Evidence
            </button>
          )}
          <button type="button" className="fix-action-link" onClick={onLater}>
            {status === 'later' ? 'Undo later' : 'Later'}
          </button>
          {!readOnly && status !== 'dismissed' && status !== 'done' && (
            <button type="button" className="fix-action-link" onClick={onAskDismiss}>
              Not an issue
            </button>
          )}
        </div>

        {expanded && (
          <div className="evidence-drawer">
            <p className="evidence-label">Referenced in code</p>
            {item.evidence.length > 0 ? (
              <EvidenceGroup evidence={item.evidence} />
            ) : (
              <p className="muted">No specific lines were cited for this finding.</p>
            )}
          </div>
        )}

        {dismissing && (
          <div className="dismiss-drawer">
            <p className="dismiss-prompt">Why isn't this an issue?</p>
            <div className="dismiss-reasons">
              {DISMISS_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="dismiss-pill"
                  onClick={() => onDismiss?.(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </li>
)

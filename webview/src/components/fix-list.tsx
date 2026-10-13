import { useState, type ReactNode } from 'react'
import { FixRow } from './fix-row'
import type { FixItem, FixStatus } from '../lib/build-fix-list'

export interface ItemStateMap {
  [id: string]: { status: FixStatus; reason?: string }
}

interface FixListProps {
  title?: string
  headerAction?: ReactNode
  items: FixItem[]
  itemState: ItemStateMap
  expanded: Record<string, boolean>
  dismissing: string | null
  showDoneRows: boolean
  showDismissedRows: boolean
  onToggleShowDone: () => void
  onToggleShowDismissed: () => void
  onToggleDone: (id: string) => void
  onLater: (id: string) => void
  onToggleEvidence: (id: string) => void
  onAskDismiss: (id: string) => void
  onDismiss: (id: string, reason: string) => void
}

const RANK: Record<FixStatus, number> = { open: 0, later: 1, done: 2, dismissed: 3 }
const PAGE_SIZE = 5

export const FixList = ({
  title = 'Open items',
  headerAction,
  items,
  itemState,
  expanded,
  dismissing,
  showDoneRows,
  showDismissedRows,
  onToggleShowDone,
  onToggleShowDismissed,
  onToggleDone,
  onLater,
  onToggleEvidence,
  onAskDismiss,
  onDismiss,
}: FixListProps) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const statusOf = (id: string): FixStatus => itemState[id]?.status ?? 'open'

  const openCount = items.filter((item) => statusOf(item.id) === 'open').length
  const laterCount = items.filter((item) => statusOf(item.id) === 'later').length
  const doneCount = items.filter((item) => statusOf(item.id) === 'done').length
  const dismissedCount = items.filter((item) => statusOf(item.id) === 'dismissed').length

  const all = items
    .filter((item) => {
      const status = statusOf(item.id)
      return (
        status === 'open' ||
        status === 'later' ||
        (status === 'done' && showDoneRows) ||
        (status === 'dismissed' && showDismissedRows)
      )
    })
    .sort((a, b) => RANK[statusOf(a.id)] - RANK[statusOf(b.id)] || a.level - b.level)

  const shown = all.slice(0, visibleCount)
  const remaining = all.length - shown.length

  return (
    <section className="fix-list-card" id="open-items" aria-label={title}>
      <div className="fix-list-header">
        <div className="fix-list-header-title">
          <h2 className="section-heading">{title}</h2>
          <span className="muted">
            {openCount} open · {laterCount} later · {doneCount} fixed
          </span>
        </div>
        <div className="fix-list-toggles">
          <label className="fix-list-toggle">
            <input type="checkbox" checked={showDoneRows} onChange={onToggleShowDone} />
            Show fixed ({doneCount})
          </label>
          <label className="fix-list-toggle">
            <input type="checkbox" checked={showDismissedRows} onChange={onToggleShowDismissed} />
            Show dismissed ({dismissedCount})
          </label>
          {headerAction}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="fix-list-empty">
          Nothing open. Toggle "show fixed" or "show dismissed" above to see the rest.
        </p>
      ) : (
        <ul className="fix-list-rows">
          {shown.map((item) => (
            <FixRow
              key={item.id}
              item={item}
              status={statusOf(item.id)}
              reason={itemState[item.id]?.reason}
              expanded={!!expanded[item.id]}
              dismissing={dismissing === item.id}
              onToggleDone={() => onToggleDone(item.id)}
              onLater={() => onLater(item.id)}
              onToggleEvidence={() => onToggleEvidence(item.id)}
              onAskDismiss={() => onAskDismiss(item.id)}
              onDismiss={(reason) => onDismiss(item.id, reason)}
            />
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <button
          type="button"
          className="fix-list-show-more"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Show {Math.min(remaining, PAGE_SIZE)} more
        </button>
      )}
    </section>
  )
}

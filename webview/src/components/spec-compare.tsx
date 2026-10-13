import { useState, type KeyboardEvent } from 'react'
import { postMessage } from '../hooks/use-vscode'
import { EvidenceGroup } from './evidence-link'
import type { ChangeItem, ReqItem, ReqStatus } from '../hooks/use-requirements'

interface SpecCompareProps {
  reqs: ReqItem[]
  changes: ChangeItem[]
  isComparing: boolean
  onAddRequirement: (text: string) => void
  onToggleLater: (id: string) => void
  onRemoveRequirement: (id: string) => void
}

const STATUS_MARK: Record<ReqStatus, { icon: string; className: string }> = {
  Built: { icon: '✓', className: 'req-mark-built' },
  Partial: { icon: '◐', className: 'req-mark-partial' },
  Missing: { icon: '✕', className: 'req-mark-missing' },
  Unchecked: { icon: '–', className: 'req-mark-unspecified' },
}

function parsePastedLines(text: string): string[] {
  const lines = text
    .split('\n')
    .map((l) =>
      l
        .trim()
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+[.)]\s*/, ''),
    )
    .filter(Boolean)
  return [...new Set(lines)]
}

const CHANGES_PAGE = 8

export const SpecCompare = ({
  reqs,
  changes,
  isComparing,
  onAddRequirement,
  onToggleLater,
  onRemoveRequirement,
}: SpecCompareProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [draftReq, setDraftReq] = useState('')
  const [pending, setPending] = useState<string[]>([])
  const [showAllChanges, setShowAllChanges] = useState(false)

  const handleAddDraft = () => {
    onAddRequirement(draftReq)
    setDraftReq('')
  }

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddDraft()
  }

  const handlePaste = (text: string) => {
    const lines = parsePastedLines(text)
    if (lines.length < 2) return
    const existing = new Set(reqs.map((r) => r.text.toLowerCase()))
    setPending(lines.filter((line) => !existing.has(line.toLowerCase())))
  }

  const importPending = () => {
    pending.forEach(onAddRequirement)
    setPending([])
  }

  const runCompare = () => {
    const activeReqs = reqs.filter((r) => !r.deferred)
    if (activeReqs.length === 0 || isComparing) return
    postMessage({ type: 'compareSpec', spec: activeReqs.map((r) => r.text).join('\n') })
  }

  const visibleChanges = showAllChanges ? changes : changes.slice(0, CHANGES_PAGE)

  return (
    <section className="section-card spec-compare" aria-label="What this is checked against">
      <h2 className="section-heading">
        <button
          type="button"
          className="section-toggle"
          aria-expanded={isOpen || reqs.length > 0}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="chevron" aria-hidden="true">
            {isOpen || reqs.length > 0 ? '▾' : '▸'}
          </span>
          <span className="section-toggle-title">What this is checked against</span>
          {reqs.length > 0 && (
            <span className="section-toggle-meta">
              {reqs.length} requirement{reqs.length === 1 ? '' : 's'}
            </span>
          )}
        </button>
      </h2>
      {(isOpen || reqs.length > 0) && (
        <div className="section-body">
          <div className="req-intro-row">
            <p className="muted">
              Add or remove these as scope changes — paste a whole list to import several at once.
              Every edit is dated.
            </p>
            <button
              type="button"
              className="ghost-button"
              disabled={isComparing || reqs.filter((r) => !r.deferred).length === 0}
              onClick={runCompare}
            >
              {isComparing ? 'Comparing…' : 'Re-compare'}
            </button>
          </div>

          {reqs.length === 0 ? (
            <p className="muted">Nothing added yet.</p>
          ) : (
            <ul className="req-list">
              {reqs.map((req) => {
                const presentation = STATUS_MARK[req.status]
                return (
                  <li key={req.id} className={`req-row${req.deferred ? ' req-row-deferred' : ''}`}>
                    <span className={`req-mark ${presentation.className}`} aria-hidden="true">
                      {presentation.icon}
                    </span>
                    <div className="req-body">
                      <span className="req-text">{req.text}</span>
                      <span className="req-meta">
                        added {req.addedDate} · {req.status.toLowerCase()}
                        {req.explanation ? ` — ${req.explanation}` : ''}
                        {req.evidence.length > 0 && <EvidenceGroup evidence={req.evidence} />}
                      </span>
                    </div>
                    <div className="req-actions">
                      <button
                        type="button"
                        className="fix-action-link"
                        onClick={() => onToggleLater(req.id)}
                      >
                        {req.deferred ? 'Undo later' : 'Later'}
                      </button>
                      <button
                        type="button"
                        className="fix-action-link"
                        onClick={() => onRemoveRequirement(req.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="req-add-row">
            <input
              type="text"
              className="req-input"
              placeholder="Add a requirement — or paste a whole list…"
              aria-label="Add a requirement"
              value={draftReq}
              onChange={(e) => setDraftReq(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text')
                if (parsePastedLines(text).length >= 2) {
                  e.preventDefault()
                  handlePaste(text)
                }
              }}
            />
            <button type="button" className="ghost-button" onClick={handleAddDraft}>
              Add
            </button>
          </div>

          {pending.length > 0 && (
            <div className="req-pending">
              <p className="muted">
                {pending.length} new requirement{pending.length === 1 ? '' : 's'} found:
              </p>
              <ul className="pt-plain-list finding-list">
                {pending.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <button type="button" className="primary-button" onClick={importPending}>
                Import {pending.length}
              </button>
            </div>
          )}

          {changes.length > 0 && (
            <div className="changes-log">
              <p className="changes-title">Recent scope changes</p>
              <ul className="changes-list">
                {visibleChanges.map((change, index) => (
                  <li key={index} className="changes-row">
                    <span className="changes-date">{change.date}</span>
                    <span className={`badge changes-tag-${change.kind.toLowerCase()}`}>
                      {change.kind}
                    </span>
                    <span className="changes-text">{change.text}</span>
                  </li>
                ))}
              </ul>
              {changes.length > CHANGES_PAGE && (
                <button
                  type="button"
                  className="fix-action-link"
                  onClick={() => setShowAllChanges((v) => !v)}
                >
                  {showAllChanges ? 'Show fewer' : 'Show earlier'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

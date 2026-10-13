import { useState } from 'react'
import { postMessage } from '../hooks/use-vscode'
import { MapStatusLine } from './map-status'
import type { MapStatus, ScopeProposal } from '../types/panel'

interface ScopeReviewProps {
  scope: ScopeProposal
  mapStatus?: MapStatus
}

export const ScopeReview = ({ scope, mapStatus }: ScopeReviewProps) => {
  const [reviewing, setReviewing] = useState(false)
  const [remember, setRemember] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(scope.strong.map((file) => file.path)),
  )

  const toggle = (path: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const analyze = (files: string[]) => {
    if (files.length === 0) return
    postMessage({ type: 'confirmScope', files, autoScope: remember })
  }

  const total = scope.strong.length + scope.possible.length

  if (scope.broad) {
    return (
      <div className="centered-state scope-screen">
        <h1 className="empty-title">“{scope.question}”</h1>
        <p className="empty-copy">
          This question touches {scope.broad.total} files. Gizmo can analyze it in smaller sections
          for better accuracy.
        </p>
        <div className="section-choices">
          {scope.broad.sections.map((section) => (
            <button
              key={section.name}
              type="button"
              className="section-choice"
              onClick={() => analyze(section.files)}
            >
              <strong>{section.name}</strong>
              <span>{section.count} files</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() => analyze(scope.strong.map((file) => file.path))}
        >
          Analyze the {scope.strong.length} strongest matches instead
        </button>
        <button
          type="button"
          className="details-link"
          onClick={() => postMessage({ type: 'cancelScope' })}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="scope-screen scope-panel">
      <h1 className="scope-heading">
        I found {total} file{total === 1 ? '' : 's'} connected to this question.
      </h1>
      <p className="scope-question">“{scope.question}”</p>

      <div className="scope-group">
        <h2 className="scope-group-title">Strongly related</h2>
        <ul className="scope-list">
          {scope.strong.map((file) => (
            <li key={file.path} className="scope-item">
              {reviewing && (
                <input
                  type="checkbox"
                  id={`scope-${file.path}`}
                  checked={selected.has(file.path)}
                  onChange={() => toggle(file.path)}
                />
              )}
              <label htmlFor={reviewing ? `scope-${file.path}` : undefined}>
                <span className="scope-reason">{file.reason}</span>
                <span className="scope-path">{file.path}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {scope.possible.length > 0 && (
        <div className="scope-group">
          <h2 className="scope-group-title">Possibly related</h2>
          <ul className="scope-list scope-list-possible">
            {scope.possible.map((file) => (
              <li key={file.path} className="scope-item">
                {reviewing ? (
                  <input
                    type="checkbox"
                    id={`scope-${file.path}`}
                    checked={selected.has(file.path)}
                    onChange={() => toggle(file.path)}
                  />
                ) : (
                  <span className="scope-not-included" aria-hidden="true">
                    ·
                  </span>
                )}
                <label htmlFor={reviewing ? `scope-${file.path}` : undefined}>
                  <span className="scope-reason">{file.reason}</span>
                  <span className="scope-path">{file.path}</span>
                </label>
              </li>
            ))}
          </ul>
          {!reviewing && (
            <p className="muted">Possibly related files are not included unless you review.</p>
          )}
        </div>
      )}

      <div className="scope-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => analyze(reviewing ? [...selected] : scope.strong.map((file) => file.path))}
        >
          Analyze this flow
        </button>
        {!reviewing && (
          <button type="button" className="ghost-button" onClick={() => setReviewing(true)}>
            Review files
          </button>
        )}
        <button
          type="button"
          className="details-link"
          onClick={() => postMessage({ type: 'cancelScope' })}
        >
          Cancel
        </button>
      </div>

      <label className="scope-remember">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        Analyze automatically without asking next time
      </label>

      <MapStatusLine mapStatus={mapStatus} />
      <p className="privacy-note">
        Gizmo maps file relationships locally. Only the files selected for analysis are sent to
        Anthropic, using your own API key.
      </p>
    </div>
  )
}

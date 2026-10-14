import { useState } from 'react'
import { postMessage } from '../hooks/use-vscode'
import { MapStatusLine } from './map-status'
import { estimateScanCostUsd, formatCostUsd } from '../../../src/shared/format-cost'
import { defaultLimits } from '../../../src/utilities/limits'
import type { MapStatus, ScanTarget, ScopeProposal } from '../types/panel'

interface ScopeReviewProps {
  scope: ScopeProposal
  mapStatus?: MapStatus
  target?: ScanTarget
}

export const ScopeReview = ({ scope, mapStatus, target = 'new' }: ScopeReviewProps) => {
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
    if (files.length === 0 || files.length > defaultLimits.maxFiles) return
    postMessage({ type: 'confirmScope', files, autoScope: remember, target })
  }

  const cancel = () => postMessage({ type: 'cancelScope', target })
  const total = scope.strong.length + scope.possible.length
  const strongPaths = scope.strong.map((file) => file.path)
  const pickedPaths = reviewing ? [...selected] : strongPaths
  const isTooMany = pickedPaths.length > defaultLimits.maxFiles
  const costLabel = (paths: string[]): string =>
    formatCostUsd(estimateScanCostUsd(Math.min(sizeOf(scope, paths), defaultLimits.maxTotalChars)))

  if (scope.broad) {
    return (
      <div
        className={
          target === 'add'
            ? 'centered-state scope-screen scope-inline'
            : 'centered-state scope-screen'
        }
      >
        <h1 className="empty-title">“{scope.question}”</h1>
        <p className="empty-copy">
          This touches {scope.broad.total} files, too many for one scan.{' '}
          {target === 'add'
            ? 'Pick one area to add now. You can add another one right after.'
            : 'Pick one area to start. You can add the others afterwards with “+ Add area”, and they are combined in your Summary.'}
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
        <button type="button" className="ghost-button" onClick={() => analyze(strongPaths)}>
          Scan the {scope.strong.length} best matches instead · {costLabel(strongPaths)}
        </button>
        <button type="button" className="details-link" onClick={cancel}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div
      className={
        target === 'add' ? 'scope-screen scope-panel scope-inline' : 'scope-screen scope-panel'
      }
    >
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

      {isTooMany && (
        <p className="scope-limit" role="alert">
          Pick up to {defaultLimits.maxFiles} files for one scan. Untick{' '}
          {pickedPaths.length - defaultLimits.maxFiles}, or add the rest later as another area.
        </p>
      )}
      <div className="scope-actions">
        <button
          type="button"
          className="primary-button"
          disabled={isTooMany || pickedPaths.length === 0}
          onClick={() => analyze(pickedPaths)}
        >
          Scan this area · {costLabel(pickedPaths)}
        </button>
        {!reviewing && (
          <button type="button" className="ghost-button" onClick={() => setReviewing(true)}>
            Review files
          </button>
        )}
        <button type="button" className="details-link" onClick={cancel}>
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

function sizeOf(scope: ScopeProposal, paths: string[]): number {
  const sizes = new Map([...scope.strong, ...scope.possible].map((file) => [file.path, file.size]))
  return paths.reduce((total, path) => total + (sizes.get(path) ?? 0), 0)
}

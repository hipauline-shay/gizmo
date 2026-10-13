import { useState } from 'react'
import { postMessage } from '../hooks/use-vscode'
import type { RelatedSuggestionView } from '../types/panel'

export const RelatedCode = ({ suggestions }: { suggestions: RelatedSuggestionView[] }) => {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestions.map((item) => item.path)),
  )
  if (suggestions.length === 0) return null

  const toggle = (path: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <section className="related-code" aria-label="Related code found">
      <h2 className="attention-title">Gizmo found related code that may answer this question.</h2>
      <ul className="scope-list">
        {suggestions.map((item) => (
          <li key={item.path} className="scope-item">
            <input
              type="checkbox"
              id={`related-${item.path}`}
              checked={selected.has(item.path)}
              onChange={() => toggle(item.path)}
            />
            <label htmlFor={`related-${item.path}`}>
              <span className="scope-reason">{item.reason}</span>
              <span className="scope-path">{item.path}</span>
            </label>
            <button
              type="button"
              className="details-link"
              onClick={() =>
                postMessage({
                  type: 'openEvidence',
                  evidence: { file: item.path, startLine: 1, endLine: 1 },
                })
              }
            >
              Open file
            </button>
          </li>
        ))}
      </ul>
      <div className="scope-actions">
        <button
          type="button"
          className="primary-button"
          disabled={selected.size === 0}
          onClick={() => postMessage({ type: 'addRelated', files: [...selected] })}
        >
          Add and continue analysis
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            postMessage({ type: 'addRelated', files: suggestions.map((item) => item.path) })
          }
        >
          Add all related files
        </button>
        <button
          type="button"
          className="details-link"
          onClick={() => postMessage({ type: 'dismissRelated' })}
        >
          Ignore
        </button>
      </div>
    </section>
  )
}

import { useState, type FormEvent } from 'react'
import { postMessage } from '../hooks/use-vscode'
import { ScopeReview } from './scope-review'
import { LoadingState } from './loading-state'
import { ErrorState } from './error-state'
import { maxReportAreas } from '../../../src/utilities/limits'
import type { AddAreaState, MapStatus } from '../types/panel'

interface AddAreaTabProps {
  addArea?: AddAreaState
  areaCount: number
  estimateUsd?: number
  mapStatus?: MapStatus
}

export const AddAreaTab = ({ addArea, areaCount, estimateUsd, mapStatus }: AddAreaTabProps) => {
  const [question, setQuestion] = useState('')
  const remaining = maxReportAreas - areaCount

  if (addArea?.status === 'scope' && addArea.scope)
    return <ScopeReview scope={addArea.scope} mapStatus={mapStatus} target="add" />
  if (addArea?.status === 'loading' && !addArea.areaId)
    return <LoadingState step={addArea.loadingStep ?? 1} estimateUsd={estimateUsd} isInline />
  if (addArea?.status === 'error' && addArea.error)
    return <ErrorState error={addArea.error} target="add" />

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!question.trim()) return
    postMessage({ type: 'askProduct', question: question.trim(), target: 'add' })
    setQuestion('')
  }

  return (
    <section className="section-card add-area" aria-labelledby="add-area-heading">
      <h2 id="add-area-heading" className="section-heading">
        Add another area
      </h2>
      <p className="muted">
        Gizmo scans it on its own, gives it its own tab, and{' '}
        <strong>combines it into your current Summary</strong>. Small scans stay fast, cheap and
        reliable.
      </p>
      <form className="ask-form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="add-area-input">
          Which screen or feature should Gizmo add?
        </label>
        <input
          id="add-area-input"
          type="text"
          value={question}
          placeholder="e.g. the settings screen"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" className="primary-button" disabled={!question.trim()}>
          Find it
        </button>
      </form>
      <button
        type="button"
        className="details-link"
        onClick={() => postMessage({ type: 'chooseFile', target: 'add' })}
      >
        Or choose files manually
      </button>
      <p className="add-area-count">
        {remaining === 1
          ? 'You can add 1 more area to this report.'
          : `You can add ${remaining} more areas to this report.`}
      </p>
    </section>
  )
}

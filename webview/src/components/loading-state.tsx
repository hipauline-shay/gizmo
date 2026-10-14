import { GizmoPose } from './gizmo-pose'
import { formatCostUsd } from '../../../src/shared/format-cost'

const steps = [
  'Reading your files',
  'Following the code they use',
  'Checking what is built and what is missing',
  'Writing my notes for you',
]

interface LoadingStateProps {
  step: number
  estimateUsd?: number
  isInline?: boolean
}

export const LoadingState = ({ step, estimateUsd, isInline = false }: LoadingStateProps) => (
  <div
    className={isInline ? 'centered-state centered-state-inline' : 'centered-state'}
    role="status"
    aria-live="polite"
  >
    <GizmoPose mood="thinking" size={isInline ? 88 : 120} className="gizmo-thinking-bob" />
    <h1 className="empty-title">Gizmo is on it…</h1>
    <ol className="loading-steps">
      {steps.map((label, index) => {
        const stepNumber = index + 1
        const state = stepNumber < step ? 'done' : stepNumber === step ? 'active' : 'pending'
        return (
          <li key={label} className={`loading-step loading-${state}`}>
            <span aria-hidden="true">
              {state === 'done' ? '✓' : state === 'active' ? '…' : '·'}
            </span>{' '}
            {label}
            {state === 'active' && <span className="visually-hidden"> (in progress)</span>}
            {state === 'done' && <span className="visually-hidden"> (done)</span>}
          </li>
        )
      })}
    </ol>
    {estimateUsd !== undefined && (
      <p className="muted">This scan costs {formatCostUsd(estimateUsd)} on your own key.</p>
    )}
  </div>
)

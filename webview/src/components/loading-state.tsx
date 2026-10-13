import { GizmoPose } from './gizmo-pose'

const steps = [
  'Reading your files',
  'Following the code they use',
  'Checking what is built and what is missing',
  'Writing my notes for you',
]

export const LoadingState = ({ step }: { step: number }) => (
  <div className="centered-state" role="status" aria-live="polite">
    <GizmoPose mood="thinking" size={120} className="gizmo-thinking-bob" />
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
  </div>
)

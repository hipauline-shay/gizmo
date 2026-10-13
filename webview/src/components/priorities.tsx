import type { NextStep } from '../types/panel'

const IMPACT_RANK: Record<NextStep['userImpact'], number> = { high: 0, medium: 1, low: 2 }

export const Priorities = ({ steps }: { steps: NextStep[] }) => {
  const ordered = [...steps]
    .sort(
      (a, b) =>
        Number(b.required) - Number(a.required) ||
        IMPACT_RANK[a.userImpact] - IMPACT_RANK[b.userImpact],
    )
    .slice(0, 3)

  if (ordered.length === 0) return <p className="muted">Nothing left to prioritize.</p>

  return (
    <ol className="priority-list">
      {ordered.map((step, index) => (
        <li key={index} className="priority-row">
          <span className="priority-number">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <p className="priority-title">{step.title}</p>
            {step.detail && <p className="muted">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

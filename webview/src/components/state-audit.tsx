import { EvidenceGroup } from './evidence-link'
import type { UxState } from '../types/panel'

interface StateAuditProps {
  states: UxState[]
  showEvidence: boolean
}

const statusPresentation: Record<UxState['status'], { className: string; label: string }> = {
  implemented: { className: 'state-dot-built', label: 'Built' },
  partial: { className: 'state-dot-partial', label: 'Partial' },
  missing: { className: 'state-dot-missing', label: 'Missing' },
  unclear: { className: 'state-dot-unclear', label: 'Unclear' },
}

export const StateAudit = ({ states, showEvidence }: StateAuditProps) => {
  if (states.length === 0)
    return <p className="muted">No UX state information could be determined.</p>
  return (
    <ul className="state-audit" aria-label="UX state audit">
      {states.map((state, index) => {
        const presentation = statusPresentation[state.status]
        return (
          <li key={`${state.name}-${index}`} className="state-row">
            <span className="state-name">{state.name}</span>
            <span className={`state-status ${presentation.className}`}>
              <span className="state-dot" aria-hidden="true" />
              {presentation.label}
            </span>
            <span className="state-desc">
              {state.description}
              {showEvidence && <EvidenceGroup evidence={state.evidence} />}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

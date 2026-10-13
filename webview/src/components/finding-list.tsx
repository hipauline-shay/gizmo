import { EvidenceGroup } from './evidence-link'
import type { Finding } from '../types/panel'

interface FindingListProps {
  findings: Finding[]
  showEvidence: boolean
  checklist?: boolean
}

export const FindingList = ({ findings, showEvidence, checklist = false }: FindingListProps) => {
  if (findings.length === 0) return <p className="muted">Nothing found in the reviewed files.</p>

  if (checklist) {
    return (
      <ul className="finding-checklist">
        {findings.map((finding, index) => (
          <li key={index} className="finding-checklist-item">
            <span className="finding-checkmark" aria-hidden="true">
              ✓
            </span>
            <span>
              {finding.text}
              {showEvidence && <EvidenceGroup evidence={finding.evidence} />}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="finding-list">
      {findings.map((finding, index) => (
        <li key={index} className="finding-item">
          <span>{finding.text}</span> <ConfidenceBadge confidence={finding.confidence} />
          {showEvidence && <EvidenceGroup evidence={finding.evidence} />}
        </li>
      ))}
    </ul>
  )
}

export const ConfidenceBadge = ({ confidence }: { confidence: Finding['confidence'] }) => {
  const labels = {
    confirmed: 'Confirmed',
    likely: 'Likely',
    unclear: 'Unclear',
    team: 'Team-provided',
  } as const
  return <span className={`badge badge-${confidence}`}>{labels[confidence]}</span>
}

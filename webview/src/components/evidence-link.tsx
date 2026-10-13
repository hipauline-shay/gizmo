import { postMessage } from '../hooks/use-vscode'
import type { Evidence } from '../types/panel'

export const EvidenceLink = ({ evidence }: { evidence: Evidence }) => (
  <button
    type="button"
    className="evidence-link"
    aria-label={`Open ${evidence.file} at lines ${evidence.startLine} to ${evidence.endLine}`}
    onClick={() => postMessage({ type: 'openEvidence', evidence })}
  >
    {evidence.file} · lines {evidence.startLine}–{evidence.endLine}
  </button>
)

export const EvidenceGroup = ({ evidence }: { evidence: Evidence[] }) => {
  if (evidence.length === 0) return null
  return (
    <span className="evidence-group">
      {evidence.map((item, index) => (
        <EvidenceLink key={`${item.file}-${item.startLine}-${index}`} evidence={item} />
      ))}
    </span>
  )
}

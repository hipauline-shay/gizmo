import type { FixItem, FixStatus } from '../lib/build-fix-list'
import type { ProductAnalysis } from '../types/panel'
import type { ItemStateMap } from './fix-list'

interface VerdictCardProps {
  analysis: ProductAnalysis
  items: FixItem[]
  itemState: ItemStateMap
}

export const VerdictCard = ({ analysis, items, itemState }: VerdictCardProps) => {
  const statusOf = (id: string): FixStatus => itemState[id]?.status ?? 'open'
  const open = items.filter((item) => statusOf(item.id) === 'open')
  const blocking = open.filter((item) => item.level === 1).length
  const alsoToFix = open.length - blocking
  const verified =
    items.length - open.length - items.filter((i) => statusOf(i.id) === 'later').length

  const headline =
    blocking === 0
      ? open.length === 0
        ? 'Nothing left on the list'
        : `Nothing blocking — ${open.length} item${open.length === 1 ? '' : 's'} left to fix`
      : blocking === 1
        ? 'One thing blocks a good ship'
        : `${blocking} things block a good ship`

  const files = uniqueFileNames(items)

  return (
    <section className="verdict-card" aria-label="Verdict">
      <p className="verdict-eyebrow">
        <span className="verdict-eyebrow-label">Feature</span>
        {files.length > 0 ? files.join(' · ') : analysis.featureName}
      </p>
      <h1 className="verdict-headline">{headline}</h1>

      <div className="verdict-grid">
        <div className="verdict-count">
          <span className="verdict-count-label">Blocking</span>
          <span className="verdict-count-value fix-level-1">{blocking}</span>
        </div>
        <div className="verdict-count">
          <span className="verdict-count-label">Also to fix</span>
          <span className="verdict-count-value">{alsoToFix}</span>
        </div>
        <div className="verdict-count">
          <span className="verdict-count-label">Verified working</span>
          <span className="verdict-count-value verdict-count-verified">{verified}</span>
        </div>
      </div>

      <p className="summary-text">{analysis.summary}</p>
    </section>
  )
}

function uniqueFileNames(items: FixItem[]): string[] {
  const names = new Set<string>()
  for (const item of items) {
    for (const evidence of item.evidence) {
      const base = evidence.file
        .split('/')
        .pop()
        ?.replace(/\.[^./]+$/, '')
      if (base) names.add(base)
    }
  }
  return [...names].slice(0, 5)
}

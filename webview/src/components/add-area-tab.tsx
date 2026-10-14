import { LoadingState } from './loading-state'
import { ErrorState } from './error-state'
import { AreaPicker } from './area-picker'
import { maxReportAreas } from '../../../src/utilities/limits'
import type { AddAreaState } from '../types/panel'

interface AddAreaTabProps {
  addArea?: AddAreaState
  areaCount: number
  estimateUsd?: number
  suggestions?: string[]
  canScanRecent: boolean
}

export const AddAreaTab = ({
  addArea,
  areaCount,
  estimateUsd,
  suggestions,
  canScanRecent,
}: AddAreaTabProps) => {
  const remaining = maxReportAreas - areaCount

  if (addArea?.status === 'loading' && !addArea.areaId)
    return <LoadingState step={addArea.loadingStep ?? 1} estimateUsd={estimateUsd} isInline />
  if (addArea?.status === 'error' && addArea.error)
    return <ErrorState error={addArea.error} target="add" />

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
      <AreaPicker target="add" suggestions={suggestions} canScanRecent={canScanRecent} />
      <p className="add-area-count">
        {remaining === 1
          ? 'You can add 1 more area to this report.'
          : `You can add ${remaining} more areas to this report.`}
      </p>
    </section>
  )
}

import { postMessage } from '../hooks/use-vscode'
import type { MapStatus } from '../types/panel'

export const MapStatusLine = ({ mapStatus }: { mapStatus?: MapStatus }) => {
  if (!mapStatus) return null

  const label = statusLabel(mapStatus)
  return (
    <p className="map-status" role="status">
      <span className={`map-status-dot map-status-${mapStatus.state}`} aria-hidden="true" />
      {label}
      {(mapStatus.state === 'stale' || mapStatus.state === 'ready') && (
        <button
          type="button"
          className="details-link"
          onClick={() => postMessage({ type: 'refreshMap' })}
        >
          Refresh project map
        </button>
      )}
    </p>
  )
}

function statusLabel(mapStatus: MapStatus): string {
  switch (mapStatus.state) {
    case 'mapping':
      return 'Mapping project…'
    case 'ready':
      return `Project map ready · ${mapStatus.fileCount} files mapped`
    case 'stale':
      return `Project changed — refresh recommended · ${mapStatus.fileCount} files mapped`
    case 'unavailable':
      return 'Project map unavailable'
  }
}

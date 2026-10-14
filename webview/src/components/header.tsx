import { postMessage } from '../hooks/use-vscode'
import { GizmoIcon } from './gizmo-icon'

interface HeaderProps {
  title?: string
  status: string
  // The area the Rescan button re-runs; absent on the Summary and "+ Add area" tabs.
  rescanAreaId?: string
  onShare: () => void
}

export const Header = ({ title, status, rescanAreaId, onShare }: HeaderProps) => (
  <header className="header">
    <div className="header-titles">
      <span className="brand">
        <span className="brand-mark" aria-hidden="true">
          <GizmoIcon />
        </span>
        Gizmo
      </span>
      {title && (
        <>
          <span className="header-divider" aria-hidden="true" />
          <span className="header-file">{title}</span>
        </>
      )}
      <span className="header-divider" aria-hidden="true" />
      <span className="header-status">
        <span className="header-status-dot" aria-hidden="true" />
        {status}
      </span>
    </div>
    <div className="header-actions">
      {rescanAreaId && (
        <button
          type="button"
          className="ghost-button"
          aria-label="Scan this area again"
          onClick={() => postMessage({ type: 'refresh', areaId: rescanAreaId })}
        >
          Rescan
        </button>
      )}
      <button
        type="button"
        className="primary-button"
        aria-label="Copy a plain-language update to share with your team"
        onClick={onShare}
      >
        Share
      </button>
    </div>
  </header>
)

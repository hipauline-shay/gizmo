import { postMessage } from '../hooks/use-vscode'
import { GizmoIcon } from './gizmo-icon'
import type { AnalysisMeta } from '../types/panel'

interface HeaderProps {
  meta?: AnalysisMeta
  status: string
  onShare: () => void
}

export const Header = ({ meta, status, onShare }: HeaderProps) => (
  <header className="header">
    <div className="header-titles">
      <span className="brand">
        <span className="brand-mark" aria-hidden="true">
          <GizmoIcon />
        </span>
        Gizmo
      </span>
      {meta && (
        <>
          <span className="header-divider" aria-hidden="true" />
          <span className="header-file">{meta.selectionLabel}</span>
        </>
      )}
      <span className="header-divider" aria-hidden="true" />
      <span className="header-status">
        <span className="header-status-dot" aria-hidden="true" />
        {status}
      </span>
    </div>
    <div className="header-actions">
      <button
        type="button"
        className="ghost-button"
        aria-label="Re-run analysis"
        onClick={() => postMessage({ type: 'refresh' })}
      >
        Rescan
      </button>
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

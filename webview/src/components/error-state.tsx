import { postMessage } from '../hooks/use-vscode'
import { GizmoPose } from './gizmo-pose'
import { ApiKeySetup } from './api-key-setup'
import type { ErrorInfo } from '../../../src/utilities/errors'
import type { ScanTarget } from '../types/panel'

interface ErrorStateProps {
  error: ErrorInfo
  target?: ScanTarget
}

export const ErrorState = ({ error, target = 'new' }: ErrorStateProps) => {
  const isAdding = target === 'add'
  const className = isAdding ? 'centered-state centered-state-inline' : 'centered-state'

  if (KEY_ERRORS.includes(error.code))
    return (
      <div className={className} role="alert">
        <GizmoPose mood="alert" size={isAdding ? 88 : 120} />
        <p className="error-message">{error.message}</p>
        <ApiKeySetup />
        <button
          type="button"
          className="details-link"
          onClick={() => postMessage(isAdding ? { type: 'resetAddArea' } : { type: 'retry' })}
        >
          I added it, try again
        </button>
      </div>
    )

  return (
    <div className={className} role="alert">
      <GizmoPose mood="alert" size={isAdding ? 88 : 120} />
      <h1 className="empty-title">Something needs attention</h1>
      <p className="error-message">{error.message}</p>
      <p className="empty-copy">{error.action}</p>
      <div className="error-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => postMessage(isAdding ? { type: 'resetAddArea' } : { type: 'retry' })}
        >
          {isAdding ? 'Pick another area' : 'Try again'}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() => postMessage({ type: 'chooseFile', target })}
        >
          Choose files manually
        </button>
      </div>
    </div>
  )
}

const KEY_ERRORS: ErrorInfo['code'][] = ['api-key-missing', 'auth-failed']

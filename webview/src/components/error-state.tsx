import { postMessage } from '../hooks/use-vscode'
import { GizmoPose } from './gizmo-pose'
import { ApiKeySetup } from './api-key-setup'
import type { ErrorInfo } from '../../../src/utilities/errors'

export const ErrorState = ({ error }: { error: ErrorInfo }) => {
  if (KEY_ERRORS.includes(error.code))
    return (
      <div className="centered-state" role="alert">
        <GizmoPose mood="alert" size={120} />
        <p className="error-message">{error.message}</p>
        <ApiKeySetup />
        <button
          type="button"
          className="details-link"
          onClick={() => postMessage({ type: 'refresh' })}
        >
          I added it, try again
        </button>
      </div>
    )

  return (
    <div className="centered-state" role="alert">
      <GizmoPose mood="alert" size={120} />
      <h1 className="empty-title">Something needs attention</h1>
      <p className="error-message">{error.message}</p>
      <p className="empty-copy">{error.action}</p>
      <div className="error-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => postMessage({ type: 'refresh' })}
        >
          Try again
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() => postMessage({ type: 'chooseFile' })}
        >
          Choose a different file
        </button>
      </div>
    </div>
  )
}

const KEY_ERRORS: ErrorInfo['code'][] = ['api-key-missing', 'auth-failed']

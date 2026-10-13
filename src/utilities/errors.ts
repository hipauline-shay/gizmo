export type GizmoErrorCode =
  | 'no-workspace'
  | 'no-selection'
  | 'unsupported-file'
  | 'empty-file'
  | 'api-key-missing'
  | 'auth-failed'
  | 'rate-limited'
  | 'context-too-large'
  | 'invalid-response'
  | 'network'
  | 'file-changed'
  | 'refused'
  | 'no-credit'
  | 'busy'
  | 'unknown'

export interface ErrorInfo {
  code: GizmoErrorCode
  message: string
  action: string
}

export class GizmoError extends Error {
  readonly code: GizmoErrorCode
  readonly action: string

  constructor({ code, message, action }: ErrorInfo) {
    super(message)
    this.name = 'GizmoError'
    this.code = code
    this.action = action
  }
}

const errorCatalog: Record<GizmoErrorCode, ErrorInfo> = {
  'no-workspace': {
    code: 'no-workspace',
    message: 'No folder is open in this window.',
    action: 'Open a project folder, then run Gizmo again.',
  },
  'no-selection': {
    code: 'no-selection',
    message: 'No file or folder was selected.',
    action: 'Right-click a file or folder in the Explorer and choose "Gizmo: Explain as Product".',
  },
  'unsupported-file': {
    code: 'unsupported-file',
    message: 'This file type is not supported yet.',
    action:
      'Gizmo currently understands JavaScript and TypeScript projects (.js, .jsx, .ts, .tsx). Pick a source file or a folder containing them.',
  },
  'empty-file': {
    code: 'empty-file',
    message: 'The selected file is empty.',
    action: 'Pick a file that contains code.',
  },
  'api-key-missing': {
    code: 'api-key-missing',
    message: 'No Anthropic API key is configured.',
    action: 'Run "Gizmo: Configure AI Provider" to add your key. It is stored securely.',
  },
  'auth-failed': {
    code: 'auth-failed',
    message: 'The AI provider rejected the API key.',
    action: 'Run "Gizmo: Configure AI Provider" and enter a valid Anthropic API key.',
  },
  'rate-limited': {
    code: 'rate-limited',
    message: 'The AI provider is rate limiting requests right now.',
    action: 'Wait a minute and try again.',
  },
  'context-too-large': {
    code: 'context-too-large',
    message: 'The selection is too large to analyze in one pass.',
    action:
      'Select a smaller folder or a single feature area, or raise "Gizmo: Max Context Size" in settings.',
  },
  'invalid-response': {
    code: 'invalid-response',
    message: 'The AI response could not be understood.',
    action: 'This is usually temporary. Try the analysis again.',
  },
  network: {
    code: 'network',
    message: 'Could not reach the AI provider.',
    action: 'Check your internet connection and try again.',
  },
  'file-changed': {
    code: 'file-changed',
    message: 'The selected file changed while it was being analyzed.',
    action: 'Run the analysis again to pick up the latest version.',
  },
  'no-credit': {
    code: 'no-credit',
    message: 'Your Anthropic account has no API credit left.',
    action:
      'Add a little credit at console.anthropic.com (Billing), then try again. Gizmo runs on your own key.',
  },
  busy: {
    code: 'busy',
    message: 'Claude is busy right now.',
    action: 'Wait a minute and try again.',
  },
  refused: {
    code: 'refused',
    message: 'Claude declined to answer this request.',
    action: 'Try a smaller selection or rephrase the question.',
  },
  unknown: {
    code: 'unknown',
    message: 'Something unexpected went wrong.',
    action: 'Try again. If it keeps happening, check the Gizmo output log.',
  },
}

export function knownError(code: GizmoErrorCode, detail?: string): GizmoError {
  const info = errorCatalog[code]
  return new GizmoError({
    ...info,
    message: detail ? `${info.message} ${detail}` : info.message,
  })
}

export function toErrorInfo(error: unknown): ErrorInfo {
  if (error instanceof GizmoError)
    return { code: error.code, message: error.message, action: error.action }
  const fallback = errorCatalog.unknown
  const detail = error instanceof Error ? error.message : String(error)
  return { ...fallback, message: `${fallback.message} (${detail})` }
}

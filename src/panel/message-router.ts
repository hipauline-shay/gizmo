import type { WebviewToExtensionMessage } from '../shared/messages'
import type { Evidence } from '../analysis/schemas'

export interface MessageHandlers {
  onReady(): void
  onChooseFile(): void
  onRefresh(): void
  onClear(): void
  onExport(): void
  onExportTickets(): void
  onAsk(question: string, label?: string): void
  onAskProduct(question: string): void
  onConfirmScope(files: string[], autoScope: boolean): void
  onCancelScope(): void
  onRefreshMap(): void
  onAddRelated(files: string[]): void
  onDismissRelated(): void
  onScanProduct(): void
  onCompareSpec(spec: string): void
  onOpenEvidence(evidence: Evidence): void
  onCopy(text: string): void
  onOpenEmail(subject: string, body: string): void
  onAddApiKey(): void
  onOpenAnthropicConsole(): void
}

export function routeMessage(message: unknown, handlers: MessageHandlers): void {
  if (!isWebviewMessage(message)) return
  switch (message.type) {
    case 'ready':
      handlers.onReady()
      return
    case 'chooseFile':
      handlers.onChooseFile()
      return
    case 'refresh':
      handlers.onRefresh()
      return
    case 'clear':
      handlers.onClear()
      return
    case 'export':
      handlers.onExport()
      return
    case 'exportTickets':
      handlers.onExportTickets()
      return
    case 'ask':
      if (message.question.trim().length > 0) handlers.onAsk(message.question.trim(), message.label)
      return
    case 'askProduct':
      if (message.question.trim().length > 0) handlers.onAskProduct(message.question.trim())
      return
    case 'confirmScope':
      if (message.files.length > 0) handlers.onConfirmScope(message.files, message.autoScope)
      return
    case 'cancelScope':
      handlers.onCancelScope()
      return
    case 'refreshMap':
      handlers.onRefreshMap()
      return
    case 'addRelated':
      if (message.files.length > 0) handlers.onAddRelated(message.files)
      return
    case 'dismissRelated':
      handlers.onDismissRelated()
      return
    case 'scanProduct':
      handlers.onScanProduct()
      return
    case 'compareSpec':
      if (message.spec.trim().length > 0) handlers.onCompareSpec(message.spec.trim())
      return
    case 'openEvidence':
      handlers.onOpenEvidence(message.evidence)
      return
    case 'copy':
      if (message.text.trim().length > 0) handlers.onCopy(message.text)
      return
    case 'openEmail':
      if (message.body.trim().length > 0) handlers.onOpenEmail(message.subject, message.body)
      return
    case 'addApiKey':
      handlers.onAddApiKey()
      return
    case 'openAnthropicConsole':
      handlers.onOpenAnthropicConsole()
      return
  }
}

function isWebviewMessage(value: unknown): value is WebviewToExtensionMessage {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (typeof record.type !== 'string') return false
  if (record.type === 'ask')
    return (
      typeof record.question === 'string' &&
      (record.label === undefined || typeof record.label === 'string')
    )
  if (record.type === 'askProduct') return typeof record.question === 'string'
  if (record.type === 'compareSpec') return typeof record.spec === 'string'
  if (record.type === 'confirmScope')
    return isStringArray(record.files) && typeof record.autoScope === 'boolean'
  if (record.type === 'addRelated') return isStringArray(record.files)
  if (record.type === 'openEvidence') return isEvidence(record.evidence)
  if (record.type === 'copy') return typeof record.text === 'string'
  if (record.type === 'openEmail')
    return typeof record.subject === 'string' && typeof record.body === 'string'
  return [
    'ready',
    'chooseFile',
    'refresh',
    'clear',
    'export',
    'exportTickets',
    'cancelScope',
    'refreshMap',
    'dismissRelated',
    'scanProduct',
    'addApiKey',
    'openAnthropicConsole',
  ].includes(record.type)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isEvidence(value: unknown): value is Evidence {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.file === 'string' &&
    typeof record.startLine === 'number' &&
    typeof record.endLine === 'number'
  )
}

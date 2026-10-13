import { describe, expect, it, vi } from 'vitest'
import { routeMessage, type MessageHandlers } from '../src/panel/message-router'

function createHandlers(): MessageHandlers {
  return {
    onReady: vi.fn(),
    onChooseFile: vi.fn(),
    onRefresh: vi.fn(),
    onClear: vi.fn(),
    onExport: vi.fn(),
    onExportTickets: vi.fn(),
    onAsk: vi.fn(),
    onAskProduct: vi.fn(),
    onConfirmScope: vi.fn(),
    onCancelScope: vi.fn(),
    onRefreshMap: vi.fn(),
    onAddRelated: vi.fn(),
    onDismissRelated: vi.fn(),
    onScanProduct: vi.fn(),
    onCompareSpec: vi.fn(),
    onOpenEvidence: vi.fn(),
    onCopy: vi.fn(),
    onOpenEmail: vi.fn(),
    onAddApiKey: vi.fn(),
    onOpenAnthropicConsole: vi.fn(),
  }
}

describe('routeMessage', () => {
  it('routes simple messages', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'ready' }, handlers)
    routeMessage({ type: 'export' }, handlers)
    expect(handlers.onReady).toHaveBeenCalledOnce()
    expect(handlers.onExport).toHaveBeenCalledOnce()
  })

  it('routes copy and email messages, ignoring empty or malformed ones', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'copy', text: 'Gizmo update' }, handlers)
    routeMessage({ type: 'copy', text: '   ' }, handlers)
    routeMessage({ type: 'copy', text: 42 }, handlers)
    routeMessage({ type: 'openEmail', subject: 'Update', body: 'All good' }, handlers)
    routeMessage({ type: 'openEmail', subject: 'Update', body: '' }, handlers)
    routeMessage({ type: 'openEmail', body: 'missing subject' }, handlers)
    expect(handlers.onCopy).toHaveBeenCalledOnce()
    expect(handlers.onCopy).toHaveBeenCalledWith('Gizmo update')
    expect(handlers.onOpenEmail).toHaveBeenCalledOnce()
    expect(handlers.onOpenEmail).toHaveBeenCalledWith('Update', 'All good')
  })

  it('routes the API key setup actions', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'addApiKey' }, handlers)
    routeMessage({ type: 'openAnthropicConsole' }, handlers)
    expect(handlers.onAddApiKey).toHaveBeenCalledOnce()
    expect(handlers.onOpenAnthropicConsole).toHaveBeenCalledOnce()
  })

  it('routes ask messages with trimmed questions', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'ask', question: '  what breaks?  ' }, handlers)
    expect(handlers.onAsk).toHaveBeenCalledWith('what breaks?', undefined)
  })

  it('passes along the short chat label for a question', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'ask', question: 'long prompt', label: 'Help me reply' }, handlers)
    expect(handlers.onAsk).toHaveBeenCalledWith('long prompt', 'Help me reply')
  })

  it('rejects an ask message whose label is not text', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'ask', question: 'hi', label: 42 }, handlers)
    expect(handlers.onAsk).not.toHaveBeenCalled()
  })

  it('ignores empty questions', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'ask', question: '   ' }, handlers)
    expect(handlers.onAsk).not.toHaveBeenCalled()
  })

  it('routes spec comparison messages with trimmed specs', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'compareSpec', spec: ' Users can log in. ' }, handlers)
    expect(handlers.onCompareSpec).toHaveBeenCalledWith('Users can log in.')
  })

  it('routes ticket export messages', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'exportTickets' }, handlers)
    expect(handlers.onExportTickets).toHaveBeenCalledOnce()
  })

  it('routes product questions and scope confirmations', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'askProduct', question: ' What is the camera flow? ' }, handlers)
    expect(handlers.onAskProduct).toHaveBeenCalledWith('What is the camera flow?')
    routeMessage({ type: 'confirmScope', files: ['a.tsx'], autoScope: true }, handlers)
    expect(handlers.onConfirmScope).toHaveBeenCalledWith(['a.tsx'], true)
    routeMessage({ type: 'addRelated', files: ['b.tsx'] }, handlers)
    expect(handlers.onAddRelated).toHaveBeenCalledWith(['b.tsx'])
  })

  it('rejects malformed scope payloads', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'confirmScope', files: [1], autoScope: false }, handlers)
    routeMessage({ type: 'confirmScope', files: [], autoScope: false }, handlers)
    expect(handlers.onConfirmScope).not.toHaveBeenCalled()
  })

  it('routes evidence messages with valid payloads', () => {
    const handlers = createHandlers()
    const evidence = { file: 'src/a.ts', startLine: 1, endLine: 5 }
    routeMessage({ type: 'openEvidence', evidence }, handlers)
    expect(handlers.onOpenEvidence).toHaveBeenCalledWith(evidence)
  })

  it('ignores malformed messages', () => {
    const handlers = createHandlers()
    routeMessage(null, handlers)
    routeMessage('ready', handlers)
    routeMessage({ type: 'openEvidence', evidence: { file: 1 } }, handlers)
    routeMessage({ type: 'unknown' }, handlers)
    for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled()
  })
})

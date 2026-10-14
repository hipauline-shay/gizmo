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
    onScanRecent: vi.fn(),
    onResetAddArea: vi.fn(),
    onRetry: vi.fn(),
    onRefreshMap: vi.fn(),
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
    expect(handlers.onCompareSpec).toHaveBeenCalledWith('Users can log in.', undefined)
    routeMessage({ type: 'compareSpec', spec: 'x', areaId: 'area-2' }, handlers)
    expect(handlers.onCompareSpec).toHaveBeenLastCalledWith('x', 'area-2')
  })

  it('routes ticket export messages', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'exportTickets' }, handlers)
    expect(handlers.onExportTickets).toHaveBeenCalledOnce()
  })

  it('routes product questions', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'askProduct', question: ' What is the camera flow? ' }, handlers)
    expect(handlers.onAskProduct).toHaveBeenCalledWith('What is the camera flow?', 'new')
  })

  it('routes "+ Add area" messages to the add target', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'askProduct', question: 'settings', target: 'add' }, handlers)
    expect(handlers.onAskProduct).toHaveBeenCalledWith('settings', 'add')
    routeMessage({ type: 'scanRecent', target: 'add' }, handlers)
    expect(handlers.onScanRecent).toHaveBeenCalledWith('add')
    routeMessage({ type: 'chooseFile', target: 'add' }, handlers)
    expect(handlers.onChooseFile).toHaveBeenCalledWith('add')
    routeMessage({ type: 'resetAddArea' }, handlers)
    expect(handlers.onResetAddArea).toHaveBeenCalledOnce()
    routeMessage({ type: 'refresh', areaId: 'area-1' }, handlers)
    expect(handlers.onRefresh).toHaveBeenCalledWith('area-1')
  })

  it('routes "Try again" to repeat the failed scan', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'retry' }, handlers)
    expect(handlers.onRetry).toHaveBeenCalledOnce()
    expect(handlers.onRefresh).not.toHaveBeenCalled()
  })

  it('starts a new report from "What I changed this week" by default', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'scanRecent' }, handlers)
    expect(handlers.onScanRecent).toHaveBeenCalledWith('new')
  })

  it('rejects an unknown scan target', () => {
    const handlers = createHandlers()
    routeMessage({ type: 'askProduct', question: 'x', target: 'replace' }, handlers)
    routeMessage({ type: 'chooseFile', target: 3 }, handlers)
    routeMessage({ type: 'scanRecent', target: 'everything' }, handlers)
    expect(handlers.onAskProduct).not.toHaveBeenCalled()
    expect(handlers.onChooseFile).not.toHaveBeenCalled()
    expect(handlers.onScanRecent).not.toHaveBeenCalled()
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

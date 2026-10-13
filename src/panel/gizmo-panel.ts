import * as vscode from 'vscode'
import { emptyPanelState, type PanelState } from '../shared/messages'
import { routeMessage, type MessageHandlers } from './message-router'

export class GizmoPanel {
  private static current: GizmoPanel | undefined

  private panel: vscode.WebviewPanel | undefined
  private state: PanelState = { ...emptyPanelState }

  private constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly handlers: MessageHandlers,
  ) {}

  static getOrCreate(extensionUri: vscode.Uri, handlers: MessageHandlers): GizmoPanel {
    GizmoPanel.current ??= new GizmoPanel(extensionUri, handlers)
    return GizmoPanel.current
  }

  static get instance(): GizmoPanel | undefined {
    return GizmoPanel.current
  }

  reveal(): void {
    if (this.panel) {
      this.panel.reveal(this.panel.viewColumn, true)
      return
    }
    this.panel = vscode.window.createWebviewPanel(
      'gizmo.panel',
      'Gizmo',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
      },
    )
    this.panel.webview.html = this.renderHtml(this.panel.webview)
    this.panel.webview.onDidReceiveMessage((message: unknown) =>
      routeMessage(message, this.handlers),
    )
    this.panel.onDidDispose(() => {
      this.panel = undefined
    })
  }

  getState(): PanelState {
    return this.state
  }

  update(patch: Partial<PanelState>): void {
    this.state = { ...this.state, ...patch }
    this.postState()
  }

  replaceState(state: PanelState): void {
    this.state = {
      ...state,
      mapStatus: state.mapStatus ?? this.state.mapStatus,
      cost: state.cost ?? this.state.cost,
      hasApiKey: state.hasApiKey ?? this.state.hasApiKey,
    }
    this.postState()
  }

  postState(): void {
    void this.panel?.webview.postMessage({ type: 'state', state: this.state })
  }

  private renderHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'webview.js'),
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'webview.css'),
    )
    const nonce = createNonce()
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
    ].join('; ')
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri.toString()}" />
  <title>Gizmo</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`
  }
}

function createNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let nonce = ''
  for (let index = 0; index < 32; index += 1)
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  return nonce
}

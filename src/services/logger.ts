import * as vscode from 'vscode'

export interface Logger {
  info(message: string): void
  error(message: string): void
}

// Logs must never contain source code, prompts, API keys, or user questions.
export function createLogger(): Logger & vscode.Disposable {
  const channel = vscode.window.createOutputChannel('Gizmo')
  return {
    info(message: string) {
      channel.appendLine(`[info] ${new Date().toISOString()} ${message}`)
    },
    error(message: string) {
      channel.appendLine(`[error] ${new Date().toISOString()} ${message}`)
    },
    dispose() {
      channel.dispose()
    },
  }
}

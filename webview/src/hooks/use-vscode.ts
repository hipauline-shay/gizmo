import type { WebviewToExtensionMessage } from '../../../src/shared/messages'

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void
}

declare function acquireVsCodeApi(): VsCodeApi

const vscode = acquireVsCodeApi()

export function postMessage(message: WebviewToExtensionMessage): void {
  vscode.postMessage(message)
}

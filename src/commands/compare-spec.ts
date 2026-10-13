import * as vscode from 'vscode'
import { toErrorInfo } from '../utilities/errors'
import type { AppServices } from '../app-services'

export async function runCompareSpec(services: AppServices, spec?: string): Promise<void> {
  const panel = services.getPanel()
  panel.reveal()

  const current = services.current.result
  if (!current) {
    void vscode.window.showInformationMessage(
      'Run "Gizmo: Explain as Product" first, then compare the result to a spec.',
    )
    return
  }

  const specText =
    spec ??
    (await vscode.window.showInputBox({
      prompt: 'Paste the product description or requirements to compare against',
      ignoreFocusOut: true,
    }))
  if (!specText || specText.trim().length === 0) return

  panel.update({ isComparing: true })
  try {
    const comparison = await services.provider.compareToSpec(
      current.context,
      current.analysis,
      specText.trim(),
    )
    services.current.specComparison = comparison
    panel.update({ specComparison: comparison, isComparing: false })
    services.logger.info(`spec comparison complete: items=${comparison.items.length}`)
  } catch (error) {
    const info = toErrorInfo(error)
    services.logger.error(`spec comparison failed: ${info.code}`)
    panel.update({ isComparing: false })
    void vscode.window.showWarningMessage(`${info.message} ${info.action}`)
  }
}

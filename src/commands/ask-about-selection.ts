import * as vscode from 'vscode'
import { toErrorInfo } from '../utilities/errors'
import type { AppServices } from '../app-services'

export async function runAskAboutSelection(
  services: AppServices,
  question?: string,
  label?: string,
): Promise<void> {
  const panel = services.getPanel()
  panel.reveal()

  const current = services.current.result
  if (!current) {
    void vscode.window.showInformationMessage(
      'Run "Gizmo: Explain as Product" on a file or folder first, then ask questions about it.',
    )
    return
  }

  const asked =
    question ??
    (await vscode.window.showInputBox({
      prompt: `Ask about "${current.meta.selectionLabel}"`,
      placeHolder: 'e.g. What happens when this request fails?',
    }))
  if (!asked || asked.trim().length === 0) return

  const chat = [
    ...panel.getState().chat,
    { role: 'user' as const, text: label?.trim() || asked.trim() },
  ]
  panel.update({ chat, isAsking: true })

  try {
    const { answer } = await services.provider.askFollowUp(
      current.context,
      current.analysis,
      asked.trim(),
    )
    panel.update({
      chat: [...chat, { role: 'assistant' as const, text: answer }],
      isAsking: false,
    })
  } catch (error) {
    const info = toErrorInfo(error)
    services.logger.error(`follow-up failed: ${info.code}`)
    panel.update({
      chat: [...chat, { role: 'assistant' as const, text: `**${info.message}** ${info.action}` }],
      isAsking: false,
    })
  }
}

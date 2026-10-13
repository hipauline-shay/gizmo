import * as vscode from 'vscode'
import type { AppServices } from '../app-services'

export async function runConfigureProvider(services: AppServices): Promise<void> {
  const existing = await services.secretService.getApiKey()
  const options: string[] = existing
    ? ['Replace API key', 'Remove API key', 'Open Gizmo settings']
    : ['Add Anthropic API key', 'Open Gizmo settings']

  const choice = await vscode.window.showQuickPick(options, {
    title: existing
      ? 'Gizmo — an Anthropic API key is configured'
      : 'Gizmo — no API key configured yet',
  })
  if (!choice) return

  if (choice === 'Open Gizmo settings') {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'gizmo')
    return
  }

  if (choice === 'Remove API key') {
    await services.secretService.clearApiKey()
    services.getPanel().update({ hasApiKey: false })
    void vscode.window.showInformationMessage('Gizmo: API key removed.')
    return
  }

  await promptForApiKey(services)
}

export async function promptForApiKey(services: AppServices): Promise<void> {
  const value = await vscode.window.showInputBox({
    title: 'Anthropic API key',
    prompt:
      'Paste the key from console.anthropic.com. It stays on this computer in secure storage and is never shared.',
    password: true,
    ignoreFocusOut: true,
    validateInput: (input) =>
      input.trim().length < 10 ? 'That does not look like a valid API key.' : undefined,
  })
  if (!value) return

  await services.secretService.setApiKey(value)
  services.getPanel().update({ hasApiKey: true })
  void vscode.window.showInformationMessage('Gizmo: API key saved securely.')
}

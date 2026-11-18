import * as vscode from 'vscode'
import type { AppServices } from '../app-services'
import { readSettings, setProvider } from '../services/settings-service'
import {
  detectProviderFromKey,
  providerIds,
  providerInfo,
  type ProviderId,
} from '../shared/ai-providers'

export async function runConfigureProvider(services: AppServices): Promise<void> {
  const active = readSettings().provider
  const savedKeys = await listSavedKeys(services)
  const actions: ConfigureAction[] = [
    {
      label: 'Add or replace an API key',
      description: 'Anthropic or OpenAI, Gizmo detects which',
      run: () => promptForApiKey(services),
    },
    ...savedKeys
      .filter((provider) => provider !== active)
      .map((provider) => ({
        label: `Use ${providerInfo[provider].company}`,
        description: 'Switch to the key you already saved',
        run: () => switchProvider(services, provider),
      })),
    ...savedKeys.map((provider) => ({
      label: `Remove the ${providerInfo[provider].company} key`,
      run: () => removeKey(services, provider),
    })),
    {
      label: 'Open Gizmo settings',
      run: () => vscode.commands.executeCommand('workbench.action.openSettings', 'gizmo'),
    },
  ]

  const choice = await vscode.window.showQuickPick(actions, {
    title: savedKeys.includes(active)
      ? `Gizmo — using ${providerInfo[active].company}`
      : 'Gizmo — no API key configured yet',
  })
  await choice?.run()
}

export async function promptForApiKey(services: AppServices): Promise<void> {
  const value = await vscode.window.showInputBox({
    title: 'Anthropic or OpenAI API key',
    prompt:
      'Paste a key from console.anthropic.com or platform.openai.com. It stays on this computer in secure storage and is never shared.',
    password: true,
    ignoreFocusOut: true,
    validateInput: (input) =>
      input.trim().length < 10 ? 'That does not look like a valid API key.' : undefined,
  })
  if (!value) return

  const provider = detectProviderFromKey(value) ?? (await askWhichProvider())
  if (!provider) return

  await services.secretService.setApiKey(provider, value)
  if (!(await setProvider(provider))) return
  await refreshKeyState(services)
  void vscode.window.showInformationMessage(
    `Gizmo: ${providerInfo[provider].company} key saved securely. Gizmo now uses ${providerInfo[provider].company}.`,
  )
}

export async function refreshKeyState(services: AppServices): Promise<void> {
  const provider = readSettings().provider
  const key = await services.secretService.getApiKey(provider)
  services.getPanel().update({ provider, hasApiKey: key !== undefined })
}

const switchProvider = async (services: AppServices, provider: ProviderId): Promise<void> => {
  if (!(await setProvider(provider))) return
  await refreshKeyState(services)
  void vscode.window.showInformationMessage(`Gizmo: now using ${providerInfo[provider].company}.`)
}

const removeKey = async (services: AppServices, provider: ProviderId): Promise<void> => {
  await services.secretService.clearApiKey(provider)
  const remaining = await listSavedKeys(services)
  const [fallback] = remaining
  if (readSettings().provider === provider && fallback) await setProvider(fallback)
  await refreshKeyState(services)
  void vscode.window.showInformationMessage(`Gizmo: ${providerInfo[provider].company} key removed.`)
}

async function listSavedKeys(services: AppServices): Promise<ProviderId[]> {
  const saved = await Promise.all(
    providerIds.map(async (provider) =>
      (await services.secretService.getApiKey(provider)) ? provider : undefined,
    ),
  )
  return saved.filter((provider): provider is ProviderId => provider !== undefined)
}

async function askWhichProvider(): Promise<ProviderId | undefined> {
  const choice = await vscode.window.showQuickPick(
    providerIds.map((provider) => ({ label: providerInfo[provider].company, provider })),
    { title: 'Which company is this key from?' },
  )
  return choice?.provider
}

interface ConfigureAction extends vscode.QuickPickItem {
  run: () => Thenable<unknown>
}

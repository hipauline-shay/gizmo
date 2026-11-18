import * as vscode from 'vscode'
import { defaultLimits, type ContextLimits } from '../utilities/limits'
import { isProviderId, type ProviderId } from '../shared/ai-providers'

export interface Settings {
  provider: ProviderId
  model: string
  openaiModel: string
  limits: ContextLimits
  includeRelatedImports: boolean
  showPrivacyDisclosure: boolean
}

export function readSettings(): Settings {
  const config = vscode.workspace.getConfiguration('gizmo')
  const provider = config.get<string>('provider', 'anthropic')
  return {
    provider: isProviderId(provider) ? provider : 'anthropic',
    model: config.get<string>('model', 'claude-opus-5-5'),
    openaiModel: config.get<string>('openaiModel', 'gpt-6.1-sol'),
    limits: {
      maxFiles: config.get<number>('maxFiles', defaultLimits.maxFiles),
      maxTotalChars: config.get<number>('maxContextSize', defaultLimits.maxTotalChars),
      maxCharsPerFile: defaultLimits.maxCharsPerFile,
      maxImportDepth: config.get<number>('importDepth', defaultLimits.maxImportDepth),
    },
    includeRelatedImports: config.get<boolean>('includeRelatedImports', true),
    showPrivacyDisclosure: config.get<boolean>('showPrivacyDisclosure', true),
  }
}

// Right after an update the editor can still hold the old settings list and refuse the write
// until it restarts (seen in Cursor 11/18), so say that plainly instead of a raw error.
export async function setProvider(provider: ProviderId): Promise<boolean> {
  try {
    await vscode.workspace
      .getConfiguration('gizmo')
      .update('provider', provider, vscode.ConfigurationTarget.Global)
    return true
  } catch {
    void vscode.window.showWarningMessage(
      'Gizmo was just updated and needs a restart. Quit the editor completely (Cmd+Q on Mac), open it again, then run "Gizmo: Configure AI Provider". Your key is already saved.',
    )
    return false
  }
}

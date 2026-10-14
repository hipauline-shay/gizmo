import * as vscode from 'vscode'
import { defaultLimits, type ContextLimits } from '../utilities/limits'

export interface Settings {
  model: string
  limits: ContextLimits
  includeRelatedImports: boolean
  showPrivacyDisclosure: boolean
}

export function readSettings(): Settings {
  const config = vscode.workspace.getConfiguration('gizmo')
  return {
    model: config.get<string>('model', 'claude-opus-5-5'),
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

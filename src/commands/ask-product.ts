import * as vscode from 'vscode'
import { resolveInsideRoot } from '../utilities/paths'
import { findRelevantFiles } from '../discovery/file-retrieval'
import { discoveryLimits } from '../utilities/limits'
import { readSettings } from '../services/settings-service'
import { runAnalysis } from './explain-selection'
import type { AppServices } from '../app-services'
import type { ScopeProposal } from '../shared/messages'

export async function runAskProduct(services: AppServices, question?: string): Promise<void> {
  const panel = services.getPanel()
  panel.reveal()

  const asked =
    question ??
    (await vscode.window.showInputBox({
      title: 'Ask about this product',
      prompt: 'Ask about a screen, feature, behavior, or user journey',
      placeHolder: 'e.g. What is the camera flow?',
      ignoreFocusOut: true,
    }))
  if (!asked || asked.trim().length === 0) return
  const trimmedQuestion = asked.trim()

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    panel.replaceState({
      status: 'error',
      error: {
        code: 'no-workspace',
        message: 'No folder is open in this window.',
        action: 'Open a project folder, then ask again.',
      },
      chat: [],
      isAsking: false,
    })
    return
  }

  const map = await services.mapService.ensureMap()
  if (!map || map.files.length === 0) {
    panel.replaceState({
      status: 'error',
      error: {
        code: 'unknown',
        message: 'Gizmo could not map this project.',
        action:
          'Make sure the project contains JavaScript or TypeScript source files, then try "Refresh project map".',
      },
      chat: [],
      isAsking: false,
    })
    return
  }

  const result = findRelevantFiles(map, trimmedQuestion)
  if (result.strong.length === 0 && result.possible.length === 0) {
    panel.replaceState({
      status: 'error',
      error: {
        code: 'no-selection',
        message: `No files in this project seem to match "${trimmedQuestion}".`,
        action:
          'Try different words (e.g. the screen or feature name as it appears in the app), refresh the project map, or pick files manually with "Explain as Product".',
      },
      chat: [],
      isAsking: false,
    })
    return
  }

  const proposal: ScopeProposal = {
    question: trimmedQuestion,
    strong: result.strong.map(({ path: filePath, reason, tier }) => ({
      path: filePath,
      reason,
      tier,
    })),
    possible: result.possible.map(({ path: filePath, reason, tier }) => ({
      path: filePath,
      reason,
      tier,
    })),
    totalMatches: result.totalMatches,
  }

  if (result.totalMatches > discoveryLimits.broadThreshold)
    proposal.broad = { total: result.totalMatches, sections: result.sections }

  const autoScope = readSettings().autoScope
  if (autoScope && !proposal.broad && proposal.strong.length > 0) {
    await confirmScope(
      services,
      trimmedQuestion,
      proposal.strong.map((file) => file.path),
    )
    return
  }

  panel.replaceState({
    status: 'scope',
    question: trimmedQuestion,
    scope: proposal,
    chat: [],
    isAsking: false,
  })
}

export async function confirmScope(
  services: AppServices,
  question: string,
  relativePaths: string[],
  rememberAutoScope?: boolean,
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) return
  if (rememberAutoScope)
    await vscode.workspace
      .getConfiguration('gizmo')
      .update('autoScope', true, vscode.ConfigurationTarget.Global)

  const absolutePaths = relativePaths.flatMap((relativePath) => {
    const absolute = resolveInsideRoot(workspaceFolder.uri.fsPath, relativePath)
    return absolute ? [absolute] : []
  })
  if (absolutePaths.length === 0) return
  await runAnalysis(services, absolutePaths, question)
}

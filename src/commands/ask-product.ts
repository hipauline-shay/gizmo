import fs from 'fs/promises'
import path from 'path'
import * as vscode from 'vscode'
import { resolveInsideRoot } from '../utilities/paths'
import { findRelevantFiles } from '../discovery/file-retrieval'
import { discoveryLimits } from '../utilities/limits'
import { knownError, type ErrorInfo } from '../utilities/errors'
import { readSettings } from '../services/settings-service'
import { runAnalysis } from './explain-selection'
import type { AppServices } from '../app-services'
import type { ProposedFile, ScanTarget, ScopeProposal } from '../shared/messages'

export async function runAskProduct(
  services: AppServices,
  question?: string,
  target: ScanTarget = 'new',
): Promise<void> {
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

  const showError = (error: ErrorInfo): void => {
    if (target === 'add') panel.update({ addArea: { status: 'error', error } })
    else panel.replaceState({ status: 'error', error, chat: [], isAsking: false })
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    const { code, message, action } = knownError('no-workspace')
    showError({ code, message, action })
    return
  }

  const map = await services.mapService.ensureMap()
  if (!map || map.files.length === 0) {
    showError({
      code: 'unknown',
      message: 'Gizmo could not map this project.',
      action:
        'Make sure the project contains JavaScript or TypeScript source files, then try "Refresh project map".',
    })
    return
  }

  const result = findRelevantFiles(map, trimmedQuestion)
  if (result.strong.length === 0 && result.possible.length === 0) {
    showError({
      code: 'no-selection',
      message: `No files in this project seem to match "${trimmedQuestion}".`,
      action:
        'Try different words (e.g. the screen or feature name as it appears in the app), refresh the project map, or pick files manually.',
    })
    return
  }

  const rootPath = workspaceFolder.uri.fsPath
  const proposal: ScopeProposal = {
    question: trimmedQuestion,
    strong: await withSizes(rootPath, result.strong),
    possible: await withSizes(rootPath, result.possible),
    totalMatches: result.totalMatches,
  }

  if (result.totalMatches > discoveryLimits.broadThreshold)
    proposal.broad = { total: result.totalMatches, sections: result.sections }

  const autoScope = readSettings().autoScope
  if (autoScope && !proposal.broad && proposal.strong.length > 0) {
    await confirmScope({
      services,
      question: trimmedQuestion,
      relativePaths: proposal.strong.map((file) => file.path),
      target,
    })
    return
  }

  if (target === 'add') {
    panel.update({ addArea: { status: 'scope', scope: proposal }, question: trimmedQuestion })
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

export async function confirmScope({
  services,
  question,
  relativePaths,
  rememberAutoScope,
  target,
}: {
  services: AppServices
  question: string
  relativePaths: string[]
  rememberAutoScope?: boolean
  target: ScanTarget
}): Promise<void> {
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
  await runAnalysis(services, absolutePaths, question, { target })
}

// File sizes let the panel show the scan's estimated cost before anything is sent.
async function withSizes(
  rootPath: string,
  files: { path: string; reason: string; tier: 'strong' | 'possible' }[],
): Promise<ProposedFile[]> {
  return Promise.all(
    files.map(async ({ path: relativePath, reason, tier }) => {
      const stat = await fs.stat(path.resolve(rootPath, relativePath)).catch(() => undefined)
      return { path: relativePath, reason, tier, size: stat?.size ?? 0 }
    }),
  )
}

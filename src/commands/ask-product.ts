import path from 'path'
import * as vscode from 'vscode'
import { findRelevantFiles } from '../discovery/file-retrieval'
import { fitToScan } from '../analysis/fit-to-scan'
import { readSettings } from '../services/settings-service'
import { runAnalysis, showScanError } from './explain-selection'
import type { AppServices } from '../app-services'
import type { ScanTarget } from '../shared/messages'

// A question scans straight away: its best-matching files, up to one area's worth.
export async function runAskProduct(
  services: AppServices,
  question?: string,
  target: ScanTarget = 'new',
): Promise<void> {
  services.getPanel().reveal()
  // Forget the previous scan, so "Try again" after a failed search never repeats an older one.
  services.scan.lastRequest = undefined

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
    showScanError(services, target, {
      code: 'no-workspace',
      message: 'No folder is open in this window.',
      action: 'Open a project folder, then ask again.',
    })
    return
  }

  const map = await services.mapService.ensureMap()
  if (!map || map.files.length === 0) {
    showScanError(services, target, {
      code: 'unknown',
      message: 'Gizmo could not map this project.',
      action:
        'Make sure the project contains JavaScript or TypeScript source files, then try "Refresh project map".',
    })
    return
  }

  const result = findRelevantFiles(map, trimmedQuestion)
  const best = await fitToScan({
    rootPath: workspaceFolder.uri.fsPath,
    relativePaths: (result.strong.length > 0 ? result.strong : result.possible).map(
      (file) => file.path,
    ),
    limits: readSettings().limits,
  })
  if (best.length === 0) {
    showScanError(services, target, {
      code: 'no-selection',
      message: `No files in this project seem to match "${trimmedQuestion}".`,
      action:
        'Try the screen or feature name as it appears in the app, tap one of the suggestions, or choose files manually.',
    })
    return
  }

  const absolutePaths = best.map((file) => path.resolve(workspaceFolder.uri.fsPath, file))
  await runAnalysis(services, absolutePaths, trimmedQuestion, { target })
}

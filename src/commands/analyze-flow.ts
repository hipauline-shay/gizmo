import * as vscode from 'vscode'
import { resolveSelectionPaths, runAnalysis } from './explain-selection'
import type { AppServices } from '../app-services'

export async function runAnalyzeFlow(
  services: AppServices,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<void> {
  const paths = await resolveSelectionPaths(uri, uris)
  if (paths.length === 0) return

  const flowQuestion = await vscode.window.showInputBox({
    title: 'Analyze a user flow',
    prompt: 'Which flow should Gizmo explain across the selected files?',
    placeHolder:
      'e.g. The animal identification flow, from opening the camera to saving the animal',
    ignoreFocusOut: true,
  })
  if (!flowQuestion || flowQuestion.trim().length === 0) return

  await runAnalysis(services, paths, flowQuestion.trim())
}

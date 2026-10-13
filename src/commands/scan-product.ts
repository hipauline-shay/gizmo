import path from 'path'
import * as vscode from 'vscode'
import { buildProductInventory, pickProductScanFiles } from '../discovery/product-inventory'
import { readSettings } from '../services/settings-service'
import { runAnalysis } from './explain-selection'
import type { AppServices } from '../app-services'

const scanQuestion =
  'Full product scan: review the overall product like a design lead preparing a release review. Cover overall product health, design consistency, missing or incomplete flows, navigation problems, accessibility, the highest-priority improvements, and an honest release-readiness verdict.'

export async function runScanProduct(services: AppServices): Promise<void> {
  const panel = services.getPanel()
  panel.reveal()

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    void vscode.window.showInformationMessage('Open a project folder first.')
    return
  }

  const map = await services.mapService.ensureMap()
  if (!map || map.files.length === 0) {
    void vscode.window.showWarningMessage(
      'Gizmo could not map this project. Try "Refresh Project Map".',
    )
    return
  }

  const settings = readSettings()
  const relativePaths = pickProductScanFiles(map, settings.limits.maxFiles)
  const absolutePaths = relativePaths.map((relativePath) =>
    path.resolve(workspaceFolder.uri.fsPath, relativePath),
  )

  await runAnalysis(services, absolutePaths, scanQuestion, {
    productInventory: buildProductInventory(map),
  })
}

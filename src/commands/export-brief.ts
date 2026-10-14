import * as vscode from 'vscode'
import { exportToMarkdown } from '../export/markdown-exporter'
import { exportReport, slugify } from './export-tickets'
import type { AppServices } from '../app-services'

export async function runExportBrief(services: AppServices): Promise<void> {
  const [firstArea] = services.current.areas
  if (!firstArea) {
    void vscode.window.showInformationMessage(
      'Nothing to export yet. Run "Gizmo: Explain as Product" first.',
    )
    return
  }

  const markdown = exportToMarkdown(exportReport(services))
  const suggestedName = `${slugify(services.current.areas.length === 1 ? firstArea.analysis.featureName : 'gizmo-report')}-product-brief.md`
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  const defaultUri = workspaceFolder
    ? vscode.Uri.joinPath(workspaceFolder.uri, suggestedName)
    : undefined

  const target = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { Markdown: ['md'] },
    saveLabel: 'Export Product Brief',
  })
  if (!target) return

  await vscode.workspace.fs.writeFile(target, Buffer.from(markdown, 'utf8'))
  const choice = await vscode.window.showInformationMessage('Product brief exported.', 'Open File')
  if (choice === 'Open File') await vscode.window.showTextDocument(target)
}

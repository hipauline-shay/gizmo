import * as vscode from 'vscode'
import { exportToMarkdown } from '../export/markdown-exporter'
import type { AppServices } from '../app-services'

export async function runExportBrief(services: AppServices): Promise<void> {
  const current = services.current.result
  if (!current) {
    void vscode.window.showInformationMessage(
      'Nothing to export yet. Run "Gizmo: Explain as Product" first.',
    )
    return
  }

  const markdown = exportToMarkdown(current.analysis, current.meta, services.current.specComparison)
  const suggestedName = `${slugify(current.analysis.featureName)}-product-brief.md`
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

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'gizmo'
}

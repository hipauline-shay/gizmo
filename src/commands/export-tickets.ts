import * as vscode from 'vscode'
import { exportTicketsToMarkdown, type ExportReport } from '../export/markdown-exporter'
import type { AppServices } from '../app-services'

export async function runExportTickets(services: AppServices): Promise<void> {
  const [firstArea] = services.current.areas
  if (!firstArea) {
    void vscode.window.showInformationMessage(
      'Nothing to export yet. Run "Gizmo: Explain as Product" first.',
    )
    return
  }

  const markdown = exportTicketsToMarkdown(exportReport(services))
  const suggestedName = `${slugify(services.current.areas.length === 1 ? firstArea.analysis.featureName : 'gizmo-report')}-tickets.md`
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  const defaultUri = workspaceFolder
    ? vscode.Uri.joinPath(workspaceFolder.uri, suggestedName)
    : undefined

  const target = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { Markdown: ['md'] },
    saveLabel: 'Export Tickets',
  })
  if (!target) return

  await vscode.workspace.fs.writeFile(target, Buffer.from(markdown, 'utf8'))
  const choice = await vscode.window.showInformationMessage(
    'Jira-ready tickets exported. Paste each block into your tracker.',
    'Open File',
  )
  if (choice === 'Open File') await vscode.window.showTextDocument(target)
}

export function exportReport(services: AppServices): ExportReport {
  const { areas, combined, specComparisons } = services.current
  return {
    areas: areas.map(({ id, label, analysis, meta }) => ({
      label,
      analysis,
      meta,
      specComparison: specComparisons[id],
    })),
    combined,
  }
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'gizmo'
}

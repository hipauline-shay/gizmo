import fs from 'fs/promises'
import * as vscode from 'vscode'
import { collectContext } from '../analysis/context-collector'
import { computeRelatedSuggestions } from '../discovery/related-code'
import type { AnalysisMeta } from '../analysis/types'
import { readSettings } from '../services/settings-service'
import { knownError, toErrorInfo } from '../utilities/errors'
import { resolveInsideRoot } from '../utilities/paths'
import { largeSelectionWarningChars } from '../utilities/limits'
import type { AppServices } from '../app-services'

export async function runExplainAsProduct(
  services: AppServices,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<void> {
  const paths = await resolveSelectionPaths(uri, uris)
  await runAnalysis(services, paths)
}

export interface RunAnalysisOptions {
  preserveChat?: boolean
  productInventory?: string
}

export async function runAnalysis(
  services: AppServices,
  selectionPaths: string[],
  flowQuestion?: string,
  { preserveChat = false, productInventory }: RunAnalysisOptions = {},
): Promise<void> {
  const panel = services.getPanel()
  panel.reveal()
  const previousChat = preserveChat ? panel.getState().chat : []

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (!workspaceFolder) throw knownError('no-workspace')
    if (selectionPaths.length === 0) throw knownError('no-selection')

    const consented = await services.consentService.ensureConsent()
    if (!consented) return

    services.current.selectionPath = selectionPaths[0]
    services.current.selectionPaths = selectionPaths
    services.current.flowQuestion = flowQuestion
    const settings = readSettings()

    panel.replaceState({
      status: 'loading',
      loadingStep: 1,
      chat: [],
      isAsking: false,
    })

    const firstPath = selectionPaths[0]
    const selectionMtime = firstPath ? await mtimeOf(firstPath) : undefined

    panel.update({ loadingStep: 2 })
    const context = await collectContext({
      rootPath: workspaceFolder.uri.fsPath,
      selectionPaths,
      limits: settings.limits,
      includeImports: settings.includeRelatedImports,
    })
    if (flowQuestion) context.flowQuestion = flowQuestion
    if (productInventory) context.productInventory = productInventory

    if (context.totalChars > largeSelectionWarningChars) {
      const proceed = await vscode.window.showWarningMessage(
        `This selection is large (${context.files.length} files, ~${Math.round(context.totalChars / 1000)}k characters). Analyzing it may be slow and less precise. Continue?`,
        { modal: true },
        'Analyze anyway',
      )
      if (proceed !== 'Analyze anyway') {
        panel.replaceState({ status: 'empty', chat: [], isAsking: false })
        return
      }
    }

    panel.update({ loadingStep: 3 })
    const analysis = await services.provider.analyze(context)

    const mtimeAfter = firstPath ? await mtimeOf(firstPath) : undefined
    if (selectionMtime !== undefined && mtimeAfter !== undefined && mtimeAfter !== selectionMtime)
      throw knownError('file-changed')

    panel.update({ loadingStep: 4 })
    const meta: AnalysisMeta = {
      selectionLabel: flowQuestion ?? context.selectionLabel,
      includedFiles: context.files.length,
      excludedFiles: context.excludedFiles.length,
      truncatedFiles: context.truncatedFiles.length,
      maskedSecrets: context.maskedSecrets ?? 0,
      model: settings.model,
    }
    services.current.result = { analysis, meta, context }
    services.current.specComparison = undefined
    services.logger.info(
      `analysis complete: files=${meta.includedFiles} excluded=${meta.excludedFiles} truncated=${meta.truncatedFiles}`,
    )

    const map = services.mapService.getMap()
    const relatedSuggestions = map
      ? computeRelatedSuggestions(
          map,
          context.files.map((file) => file.relativePath),
        )
      : []

    panel.replaceState({
      status: 'ready',
      analysis,
      meta,
      question: flowQuestion,
      relatedSuggestions,
      chat: previousChat,
      isAsking: false,
    })
  } catch (error) {
    const info = toErrorInfo(error)
    services.logger.error(`analysis failed: ${info.code}`)
    panel.replaceState({ status: 'error', error: info, chat: [], isAsking: false })
    if (info.code === 'api-key-missing') {
      const choice = await vscode.window.showWarningMessage(info.message, 'Configure AI Provider')
      if (choice === 'Configure AI Provider')
        await vscode.commands.executeCommand('gizmo.configureProvider')
    }
  }
}

export async function resolveSelectionPaths(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<string[]> {
  if (uris && uris.length > 0) return uris.map((item) => item.fsPath)
  if (uri?.fsPath) return [uri.fsPath]
  const activePath = vscode.window.activeTextEditor?.document.uri.fsPath
  if (activePath) return [activePath]
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: true,
    canSelectMany: true,
    openLabel: 'Analyze with Gizmo',
  })
  return picked?.map((item) => item.fsPath) ?? []
}

async function mtimeOf(filePath: string): Promise<number | undefined> {
  try {
    const stat = await fs.stat(filePath)
    return stat.isFile() ? stat.mtimeMs : undefined
  } catch {
    return undefined
  }
}

export async function openEvidence(
  services: AppServices,
  evidence: { file: string; startLine: number; endLine: number },
): Promise<void> {
  const rootPath = services.current.result?.context.rootPath
  if (!rootPath) return
  const absolute = resolveInsideRoot(rootPath, evidence.file)
  if (!absolute) return
  try {
    const document = await vscode.workspace.openTextDocument(absolute)
    const lastLine = Math.max(document.lineCount - 1, 0)
    const start = Math.min(Math.max(evidence.startLine - 1, 0), lastLine)
    const end = Math.min(Math.max(evidence.endLine - 1, start), lastLine)
    const range = new vscode.Range(start, 0, end, document.lineAt(end).text.length)
    const editor = await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.One,
      selection: range,
    })
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter)
  } catch {
    void vscode.window.showWarningMessage(`Gizmo could not open ${evidence.file}.`)
  }
}

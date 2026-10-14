import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import * as vscode from 'vscode'
import { collectContext } from '../analysis/context-collector'
import type { AnalysisMeta, ReportArea } from '../analysis/types'
import { readSettings } from '../services/settings-service'
import { knownError, toErrorInfo, type ErrorInfo } from '../utilities/errors'
import { resolveInsideRoot } from '../utilities/paths'
import { maxReportAreas } from '../utilities/limits'
import { suggestAreas } from '../discovery/area-suggestions'
import { estimateScanCostUsd } from '../shared/format-cost'
import type { AreaView, PanelState, ScanTarget } from '../shared/messages'
import type { AppServices } from '../app-services'

export async function runExplainAsProduct(
  services: AppServices,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  target: ScanTarget = 'new',
): Promise<void> {
  const paths = await resolveSelectionPaths(uri, uris)
  if (paths.length === 0) return
  await runAnalysis(services, paths, undefined, { target })
}

// "Choose files manually" always opens the file picker, even when a file is open in the editor.
export async function runChooseFiles(services: AppServices, target: ScanTarget): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: true,
    canSelectMany: true,
    openLabel: target === 'add' ? 'Add to Gizmo report' : 'Analyze with Gizmo',
  })
  if (!picked || picked.length === 0) return
  await runAnalysis(
    services,
    picked.map((item) => item.fsPath),
    undefined,
    { target },
  )
}

export interface RunAnalysisOptions {
  target?: ScanTarget
  // Rescans this area in place instead of starting a report or adding an area.
  areaId?: string
  productInventory?: string
  source?: 'recent'
}

export async function runAnalysis(
  services: AppServices,
  selectionPaths: string[],
  flowQuestion?: string,
  { target = 'new', areaId, productInventory, source }: RunAnalysisOptions = {},
): Promise<void> {
  const panel = services.getPanel()
  panel.reveal()
  const report = services.current
  const rescanned = areaId ? report.areas.find((area) => area.id === areaId) : undefined
  const keepsReport = target === 'add' || rescanned !== undefined

  const showStep = (loadingStep: 1 | 2 | 3 | 4, estimateUsd?: number): void => {
    if (keepsReport)
      panel.update({ addArea: { status: 'loading', loadingStep, areaId }, estimateUsd })
    else panel.update({ loadingStep, estimateUsd })
  }

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (!workspaceFolder) throw knownError('no-workspace')
    if (selectionPaths.length === 0) throw knownError('no-selection')
    if (target === 'add' && !rescanned && report.areas.length >= maxReportAreas)
      throw knownError('too-many-areas')

    if (!rescanned)
      services.scan.lastRequest = {
        paths: selectionPaths,
        flowQuestion,
        target,
        productInventory,
        source,
      }
    const consented = await services.consentService.ensureConsent()
    if (!consented) {
      services.scan.lastRequest = undefined
      if (keepsReport) panel.update({ addArea: undefined })
      return
    }
    const settings = readSettings()

    if (!keepsReport) {
      panel.replaceState({ status: 'loading', loadingStep: 1, chat: [], isAsking: false })
      report.areas = []
      report.combined = undefined
      report.specComparisons = {}
    } else showStep(1)

    const firstPath = selectionPaths[0]
    const selectionMtime = firstPath ? await mtimeOf(firstPath) : undefined

    showStep(2)
    const context = await collectContext({
      rootPath: workspaceFolder.uri.fsPath,
      selectionPaths,
      limits: settings.limits,
      includeImports: settings.includeRelatedImports,
    })
    if (context.skippedSelectedFiles.length > 0) {
      const picked = context.files.filter((file) => file.reason === 'selected').length
      throw knownError(
        'selection-too-large',
        `You picked ${picked + context.skippedSelectedFiles.length} files; one scan holds up to ${settings.limits.maxFiles}.`,
      )
    }
    if (flowQuestion) context.flowQuestion = flowQuestion
    if (productInventory) context.productInventory = productInventory

    showStep(3, estimateScanCostUsd(context.totalChars))
    const { result: analysis, costUsd } = await services.provider.analyze(context)

    // The answer is already paid for, so a save during the scan only adds a note.
    const mtimeAfter = firstPath ? await mtimeOf(firstPath) : undefined
    const changedDuringScan =
      selectionMtime !== undefined && mtimeAfter !== undefined && mtimeAfter !== selectionMtime

    showStep(4)
    const meta: AnalysisMeta = {
      selectionLabel: flowQuestion ?? context.selectionLabel,
      includedFiles: context.files.length,
      excludedFiles: context.excludedFiles.length,
      truncatedFiles: context.truncatedFiles.length,
      maskedSecrets: context.maskedSecrets ?? 0,
      model: settings.model,
      costUsd,
      changedDuringScan,
    }
    const area: ReportArea = {
      id: rescanned?.id ?? randomUUID(),
      label: analysis.featureName,
      analysis,
      meta,
      context,
      selectionPaths,
      flowQuestion,
      source: source ?? rescanned?.source,
    }
    services.logger.info(
      `analysis complete: files=${meta.includedFiles} excluded=${meta.excludedFiles} truncated=${meta.truncatedFiles} areas=${keepsReport ? report.areas.length + (rescanned ? 0 : 1) : 1}`,
    )

    if (rescanned) report.areas = report.areas.map((item) => (item.id === area.id ? area : item))
    else if (target === 'add') report.areas = [...report.areas, area]
    else {
      report.areas = [area]
      report.combined = undefined
      report.specComparisons = {}
    }

    panel.replaceState({
      ...reportState(services),
      chat: keepsReport ? panel.getState().chat : [],
      isAsking: false,
      focusArea: { id: area.id, nonce: Date.now() },
    })
    services.scan.lastRequest = undefined
    if (report.areas.length > 1) await refreshCombinedSummary(services)
  } catch (error) {
    const info = toErrorInfo(error)
    services.logger.error(`analysis failed: ${info.code}`)
    if (rescanned) {
      panel.update({ addArea: undefined, estimateUsd: undefined })
      void vscode.window.showWarningMessage(
        `Gizmo could not rescan: ${info.message} ${info.action}`,
      )
    } else if (keepsReport)
      panel.update({ addArea: { status: 'error', error: info }, estimateUsd: undefined })
    else panel.replaceState({ status: 'error', error: info, chat: [], isAsking: false })
    // Not awaited: an unanswered notification must not keep the one-scan lock on.
    if (info.code === 'api-key-missing')
      void vscode.window
        .showWarningMessage(info.message, 'Configure AI Provider')
        .then((choice) => {
          if (choice === 'Configure AI Provider')
            void vscode.commands.executeCommand('gizmo.configureProvider')
        })
  }
}

// Writes one combined "Can we ship?" summary across all areas (findings only, no code).
// If it fails, the panel falls back to listing each area's own summary.
export async function refreshCombinedSummary(services: AppServices): Promise<void> {
  const report = services.current
  const panel = services.getPanel()
  if (report.areas.length < 2) {
    report.combined = undefined
    panel.update({ combined: undefined, isCombining: false })
    return
  }
  panel.update({ isCombining: true })
  let combinedCostUsd: number | undefined
  try {
    const priced = await services.provider.summarizeAreas(report.areas)
    report.combined = priced.result
    combinedCostUsd = priced.costUsd
    services.logger.info(`combined summary complete: areas=${report.areas.length}`)
  } catch (error) {
    report.combined = undefined
    services.logger.error(`combined summary failed: ${toErrorInfo(error).code}`)
  }
  panel.update({
    combined: report.combined,
    combinedCostUsd,
    isCombining: false,
  })
}

// Runs one scan at a time across Gizmo, from any button, chip, or command.
export async function guardScan(services: AppServices, task: () => Promise<void>): Promise<void> {
  if (services.scan.isBusy) {
    void vscode.window.showInformationMessage(
      'Gizmo is already scanning. Try again when it finishes.',
    )
    return
  }
  services.scan.isBusy = true
  try {
    await task()
  } finally {
    services.scan.isBusy = false
  }
}

export function reportState(
  services: AppServices,
): Pick<
  PanelState,
  'status' | 'areas' | 'combined' | 'isCombining' | 'addArea' | 'estimateUsd' | 'areaSuggestions'
> {
  const { areas, combined } = services.current
  return {
    status: areas.length > 0 ? 'ready' : 'empty',
    areas: areas.map(toAreaView),
    combined,
    isCombining: false,
    addArea: undefined,
    estimateUsd: undefined,
    areaSuggestions: areaSuggestionsFor(services),
  }
}

export function areaSuggestionsFor(services: AppServices): string[] | undefined {
  const map = services.mapService.getMap()
  if (!map) return undefined
  const scannedFiles = services.current.areas.flatMap((area) =>
    area.context.files.map((file) => file.relativePath),
  )
  return suggestAreas({ map, scannedFiles })
}

export function showScanError(services: AppServices, target: ScanTarget, error: ErrorInfo): void {
  const panel = services.getPanel()
  if (target === 'add') panel.update({ addArea: { status: 'error', error } })
  else panel.replaceState({ status: 'error', error, chat: [], isAsking: false })
}

// Only an exact id matches: falling back to another area would rescan or charge the wrong one.
export function findArea(services: AppServices, areaId?: string): ReportArea | undefined {
  if (!areaId) return undefined
  return services.current.areas.find((area) => area.id === areaId)
}

function toAreaView({ id, label, analysis, meta, source }: ReportArea): AreaView {
  return { id, label, analysis, meta, source }
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
  const rootPath = services.current.areas[0]?.context.rootPath
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

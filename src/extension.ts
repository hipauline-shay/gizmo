import * as vscode from 'vscode'
import { AnthropicProvider } from './providers/anthropic-provider'
import { createSecretService } from './services/secret-service'
import { createPrivacyConsentService } from './services/privacy-consent-service'
import { createLogger } from './services/logger'
import { readSettings } from './services/settings-service'
import { createProjectMapService } from './services/project-map-service'
import { runScanProduct } from './commands/scan-product'
import { GizmoPanel } from './panel/gizmo-panel'
import type { MessageHandlers } from './panel/message-router'
import type { AppServices } from './app-services'
import {
  findArea,
  openEvidence,
  reportState,
  runAnalysis,
  runChooseFiles,
  runExplainAsProduct,
} from './commands/explain-selection'
import { runAnalyzeFlow } from './commands/analyze-flow'
import { confirmScope, runAskProduct } from './commands/ask-product'
import { runAskAboutSelection } from './commands/ask-about-selection'
import { runExportBrief } from './commands/export-brief'
import { runExportTickets } from './commands/export-tickets'
import { promptForApiKey, runConfigureProvider } from './commands/configure-provider'
import { runOpenPanel } from './commands/open-panel'
import { runClearAnalysis } from './commands/clear-analysis'
import { runCompareSpec } from './commands/compare-spec'

export function activate(context: vscode.ExtensionContext): void {
  const logger = createLogger()
  const secretService = createSecretService(context.secrets)
  const mapService = createProjectMapService(context, logger)

  let sessionCostUsd = 0
  const services: AppServices = {
    extensionUri: context.extensionUri,
    secretService,
    consentService: createPrivacyConsentService(context.globalState),
    logger,
    provider: new AnthropicProvider({
      getApiKey: () => secretService.getApiKey(),
      getModel: () => readSettings().model,
      logger,
      onCost: (usd) => {
        sessionCostUsd += usd
        GizmoPanel.instance?.update({ cost: { lastUsd: usd, totalUsd: sessionCostUsd } })
      },
    }),
    mapService,
    getPanel: () => GizmoPanel.getOrCreate(context.extensionUri, panelHandlers),
    current: { areas: [], specComparisons: {} },
  }

  mapService.onStatusChange((mapStatus) => {
    GizmoPanel.instance?.update({ mapStatus })
  })

  const panelHandlers: MessageHandlers = {
    onReady: () => {
      const panel = services.getPanel()
      panel.update({ mapStatus: mapService.status() })
      void services.secretService
        .getApiKey()
        .then((key) => panel.update({ hasApiKey: key !== undefined }))
    },
    onChooseFile: (target) => void runChooseFiles(services, target),
    onRefresh: (areaId) => {
      const area = findArea(services, areaId)
      if (!area) return void runChooseFiles(services, 'new')
      void runAnalysis(services, area.selectionPaths, area.flowQuestion, { areaId: area.id })
    },
    onClear: () => runClearAnalysis(services),
    onExport: () => void runExportBrief(services),
    onExportTickets: () => void runExportTickets(services),
    onAsk: (question, label) => void runAskAboutSelection(services, question, label),
    onAskProduct: (question, target) => void runAskProduct(services, question, target),
    onConfirmScope: (files, autoScope, target) => {
      const panel = services.getPanel()
      const question = panel.getState().question ?? 'this feature'
      void confirmScope({
        services,
        question,
        relativePaths: files,
        rememberAutoScope: autoScope,
        target,
      })
    },
    onCancelScope: (target) => {
      if (target === 'add') services.getPanel().update({ addArea: undefined })
      else if (services.current.areas.length > 0)
        services.getPanel().replaceState({ ...reportState(services), chat: [], isAsking: false })
      else runClearAnalysis(services)
    },
    onRefreshMap: () => void mapService.refresh(),
    onScanProduct: () => void runScanProduct(services),
    onCompareSpec: (spec, areaId) => void runCompareSpec(services, spec, areaId),
    onOpenEvidence: (evidence) => void openEvidence(services, evidence),
    onCopy: (text) => void vscode.env.clipboard.writeText(text),
    onAddApiKey: () => void promptForApiKey(services),
    onOpenAnthropicConsole: () =>
      void vscode.env.openExternal(vscode.Uri.parse('https://console.anthropic.com/settings/keys')),
    onOpenEmail: (subject, body) => {
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      // Uri.parse decodes %26 back to "&", which cut the email off at the first "&".
      // openExternal accepts the raw string at runtime and keeps its encoding intact.
      void vscode.env.openExternal(mailto as unknown as vscode.Uri)
    },
  }

  context.subscriptions.push(
    logger,
    mapService,
    vscode.commands.registerCommand('gizmo.askProduct', () => runAskProduct(services)),
    vscode.commands.registerCommand(
      'gizmo.explainAsProduct',
      (uri?: vscode.Uri, uris?: vscode.Uri[]) => runExplainAsProduct(services, uri, uris),
    ),
    vscode.commands.registerCommand('gizmo.addToReport', (uri?: vscode.Uri, uris?: vscode.Uri[]) =>
      runExplainAsProduct(services, uri, uris, services.current.areas.length > 0 ? 'add' : 'new'),
    ),
    vscode.commands.registerCommand('gizmo.analyzeFlow', (uri?: vscode.Uri, uris?: vscode.Uri[]) =>
      runAnalyzeFlow(services, uri, uris),
    ),
    vscode.commands.registerCommand('gizmo.refreshProjectMap', () => mapService.refresh()),
    vscode.commands.registerCommand('gizmo.scanProduct', () => runScanProduct(services)),
    vscode.commands.registerCommand('gizmo.openPanel', () => runOpenPanel(services)),
    vscode.commands.registerCommand('gizmo.askAboutSelection', () =>
      runAskAboutSelection(services),
    ),
    vscode.commands.registerCommand('gizmo.exportBrief', () => runExportBrief(services)),
    vscode.commands.registerCommand('gizmo.configureProvider', () =>
      runConfigureProvider(services),
    ),
    vscode.commands.registerCommand('gizmo.clearAnalysis', () => runClearAnalysis(services)),
    vscode.commands.registerCommand('gizmo.compareSpec', () => runCompareSpec(services)),
    vscode.commands.registerCommand('gizmo.exportTickets', () => runExportTickets(services)),
  )
}

export function deactivate(): void {}

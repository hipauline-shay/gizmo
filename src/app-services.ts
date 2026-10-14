import type * as vscode from 'vscode'
import type { AIProvider } from './providers/ai-provider'
import type { SecretService } from './services/secret-service'
import type { PrivacyConsentService } from './services/privacy-consent-service'
import type { Logger } from './services/logger'
import type { ProjectMapService } from './services/project-map-service'
import type { GizmoPanel } from './panel/gizmo-panel'
import type { ReportArea } from './analysis/types'
import type { CombinedSummary, GapAnalysis } from './analysis/schemas'

export interface CurrentReport {
  areas: ReportArea[]
  combined?: CombinedSummary
  specComparisons: Record<string, GapAnalysis>
}

export interface AppServices {
  extensionUri: vscode.Uri
  secretService: SecretService
  consentService: PrivacyConsentService
  logger: Logger
  provider: AIProvider
  mapService: ProjectMapService
  getPanel(): GizmoPanel
  current: CurrentReport
}

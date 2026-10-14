import type * as vscode from 'vscode'
import type { AIProvider } from './providers/ai-provider'
import type { SecretService } from './services/secret-service'
import type { PrivacyConsentService } from './services/privacy-consent-service'
import type { Logger } from './services/logger'
import type { ProjectMapService } from './services/project-map-service'
import type { GizmoPanel } from './panel/gizmo-panel'
import type { ReportArea } from './analysis/types'
import type { CombinedSummary, GapAnalysis } from './analysis/schemas'
import type { ScanTarget } from './shared/messages'

export interface CurrentReport {
  areas: ReportArea[]
  combined?: CombinedSummary
  specComparisons: Record<string, GapAnalysis>
}

// The last scan request, so "Try again" repeats exactly what failed.
export interface ScanRequest {
  paths: string[]
  flowQuestion?: string
  target: ScanTarget
  productInventory?: string
  source?: 'recent'
}

export interface ScanState {
  // One scan at a time across Gizmo: a double tap never starts two paid scans.
  isBusy: boolean
  lastRequest?: ScanRequest
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
  scan: ScanState
}

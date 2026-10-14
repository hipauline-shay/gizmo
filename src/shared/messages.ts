import type { CombinedSummary, Evidence, GapAnalysis, ProductAnalysis } from '../analysis/schemas'
import type { AnalysisMeta, ChatEntry } from '../analysis/types'
import type { ErrorInfo } from '../utilities/errors'

export type PanelStatus = 'empty' | 'loading' | 'error' | 'ready'

export interface MapStatus {
  state: 'mapping' | 'ready' | 'stale' | 'unavailable'
  fileCount: number
}

// "new" starts a fresh report; "add" scans one more area into the current report.
export type ScanTarget = 'new' | 'add'

export interface AreaView {
  id: string
  label: string
  analysis: ProductAnalysis
  meta: AnalysisMeta
}

// The "+ Add area" tab's own progress, so the existing area tabs stay visible while it runs.
export interface AddAreaState {
  status: 'loading' | 'error'
  // Set while an existing area is being rescanned, so only that tab shows progress.
  areaId?: string
  loadingStep?: 1 | 2 | 3 | 4
  error?: ErrorInfo
}

export interface PanelState {
  status: PanelStatus
  loadingStep?: 1 | 2 | 3 | 4
  error?: ErrorInfo
  areas?: AreaView[]
  // Asks the panel to open this area's tab (after a scan finishes); the nonce re-triggers it.
  focusArea?: { id: string; nonce: number }
  combined?: CombinedSummary
  combinedCostUsd?: number
  isCombining?: boolean
  addArea?: AddAreaState
  estimateUsd?: number
  chat: ChatEntry[]
  isAsking: boolean
  specComparison?: GapAnalysis
  isComparing?: boolean
  // The project's own areas, offered as chips; leaves out areas this report already covers.
  areaSuggestions?: string[]
  mapStatus?: MapStatus
  cost?: { lastUsd: number; totalUsd: number }
  hasApiKey?: boolean
}

export type ExtensionToWebviewMessage = { type: 'state'; state: PanelState }

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'chooseFile'; target?: ScanTarget }
  | { type: 'refresh'; areaId?: string }
  | { type: 'clear' }
  | { type: 'export' }
  | { type: 'exportTickets' }
  | { type: 'ask'; question: string; label?: string }
  | { type: 'askProduct'; question: string; target?: ScanTarget }
  | { type: 'scanRecent'; target?: ScanTarget }
  | { type: 'resetAddArea' }
  | { type: 'refreshMap' }
  | { type: 'scanProduct' }
  | { type: 'compareSpec'; spec: string; areaId?: string }
  | { type: 'openEvidence'; evidence: Evidence }
  | { type: 'copy'; text: string }
  | { type: 'openEmail'; subject: string; body: string }
  | { type: 'addApiKey' }
  | { type: 'openAnthropicConsole' }

export const emptyPanelState: PanelState = {
  status: 'empty',
  chat: [],
  isAsking: false,
}

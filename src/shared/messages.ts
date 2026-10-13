import type { ProductAnalysis, Evidence, GapAnalysis } from '../analysis/schemas'
import type { AnalysisMeta, ChatEntry } from '../analysis/types'
import type { ErrorInfo } from '../utilities/errors'

export type PanelStatus = 'empty' | 'loading' | 'scope' | 'error' | 'ready'

export interface ProposedFile {
  path: string
  reason: string
  tier: 'strong' | 'possible'
}

export interface ScopeProposal {
  question: string
  strong: ProposedFile[]
  possible: ProposedFile[]
  totalMatches: number
  broad?: { total: number; sections: { name: string; count: number; files: string[] }[] }
}

export interface MapStatus {
  state: 'mapping' | 'ready' | 'stale' | 'unavailable'
  fileCount: number
}

export interface RelatedSuggestionView {
  path: string
  reason: string
}

export interface PanelState {
  status: PanelStatus
  loadingStep?: 1 | 2 | 3 | 4
  error?: ErrorInfo
  analysis?: ProductAnalysis
  meta?: AnalysisMeta
  chat: ChatEntry[]
  isAsking: boolean
  specComparison?: GapAnalysis
  isComparing?: boolean
  question?: string
  scope?: ScopeProposal
  mapStatus?: MapStatus
  relatedSuggestions?: RelatedSuggestionView[]
  cost?: { lastUsd: number; totalUsd: number }
  hasApiKey?: boolean
}

export type ExtensionToWebviewMessage = { type: 'state'; state: PanelState }

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'chooseFile' }
  | { type: 'refresh' }
  | { type: 'clear' }
  | { type: 'export' }
  | { type: 'exportTickets' }
  | { type: 'ask'; question: string; label?: string }
  | { type: 'askProduct'; question: string }
  | { type: 'confirmScope'; files: string[]; autoScope: boolean }
  | { type: 'cancelScope' }
  | { type: 'refreshMap' }
  | { type: 'addRelated'; files: string[] }
  | { type: 'dismissRelated' }
  | { type: 'scanProduct' }
  | { type: 'compareSpec'; spec: string }
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

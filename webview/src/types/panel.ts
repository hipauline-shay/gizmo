export type {
  PanelState,
  PanelStatus,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  ScopeProposal,
  ProposedFile,
  MapStatus,
  RelatedSuggestionView,
} from '../../../src/shared/messages'
export type {
  ProductAnalysis,
  Evidence,
  Finding,
  UxState,
  PrimaryAction,
  UserFlowStep,
  GapAnalysis,
  GapItem,
  NextStep,
} from '../../../src/analysis/schemas'
export type { AnalysisMeta, ChatEntry } from '../../../src/analysis/types'

export type Mode = 'check' | 'summary'

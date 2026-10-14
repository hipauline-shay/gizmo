export type {
  PanelState,
  PanelStatus,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  MapStatus,
  AreaView,
  AddAreaState,
  ScanTarget,
} from '../../../src/shared/messages'
export type {
  ProductAnalysis,
  Evidence,
  Finding,
  UxState,
  GapAnalysis,
  GapItem,
  NextStep,
  CombinedSummary,
} from '../../../src/analysis/schemas'
export type { AnalysisMeta, ChatEntry } from '../../../src/analysis/types'

// A tab is an area id, the "+ Add area" tab, or the combined Summary.
export const ADD_TAB = 'add'
export const SUMMARY_TAB = 'summary'
export type TabId = string

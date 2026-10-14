import type { ProductAnalysis } from './schemas'

export interface CollectedFile {
  relativePath: string
  content: string
  numberedContent: string
  truncated: boolean
  reason: 'selected' | 'import'
}

export interface AnalysisContext {
  rootPath: string
  selectionLabel: string
  files: CollectedFile[]
  excludedFiles: string[]
  truncatedFiles: string[]
  totalChars: number
  // Picked files that did not fit the size limits; a scan never runs with these silently dropped.
  skippedSelectedFiles: string[]
  flowQuestion?: string
  productInventory?: string
  maskedSecrets?: number
}

export interface FollowUpAnswer {
  answer: string
}

export interface ChatEntry {
  role: 'user' | 'assistant'
  text: string
}

export interface AnalysisMeta {
  maskedSecrets?: number
  selectionLabel: string
  includedFiles: number
  excludedFiles: number
  truncatedFiles: number
  model: string
}

// One scanned area of the report (e.g. "Camera"), shown as its own tab in the panel.
export interface ReportArea {
  id: string
  label: string
  analysis: ProductAnalysis
  meta: AnalysisMeta
  context: AnalysisContext
  selectionPaths: string[]
  flowQuestion?: string
}

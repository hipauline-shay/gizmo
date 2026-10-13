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

export interface AnalysisResult {
  analysis: ProductAnalysis
  meta: AnalysisMeta
  context: AnalysisContext
}

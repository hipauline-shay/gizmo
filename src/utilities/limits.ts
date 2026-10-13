export interface ContextLimits {
  maxFiles: number
  maxCharsPerFile: number
  maxTotalChars: number
  maxImportDepth: number
}

export const defaultLimits: ContextLimits = {
  maxFiles: 12,
  maxCharsPerFile: 40000,
  maxTotalChars: 160000,
  maxImportDepth: 1,
}

export const largeSelectionWarningChars = 120000

export const discoveryLimits = {
  maxIndexedFiles: 2000,
  maxScanChars: 60000,
  strongScore: 40,
  possibleScore: 15,
  maxStrong: 12,
  maxPossible: 8,
  broadThreshold: 25,
  maxRelatedSuggestions: 5,
} as const

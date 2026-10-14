export interface ContextLimits {
  maxFiles: number
  maxCharsPerFile: number
  maxTotalChars: number
  maxImportDepth: number
}

// One scan = one area. Kept small so each answer stays short, fast, cheap and reliable;
// bigger reports are built by adding areas (see maxReportAreas).
export const defaultLimits: ContextLimits = {
  maxFiles: 6,
  maxCharsPerFile: 40000,
  maxTotalChars: 60000,
  maxImportDepth: 1,
}

export const maxReportAreas = 4

export const discoveryLimits = {
  maxIndexedFiles: 2000,
  maxScanChars: 60000,
  strongScore: 40,
  possibleScore: 15,
  maxStrong: 6,
  maxPossible: 8,
  broadThreshold: 25,
  maxRelatedSuggestions: 5,
} as const

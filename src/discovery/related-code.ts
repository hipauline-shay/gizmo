import { discoveryLimits } from '../utilities/limits'
import type { ProjectMap } from './project-mapper'

export interface RelatedSuggestion {
  path: string
  reason: string
}

// After an analysis, surface local files the included code points at
// (re-export targets, direct imports) that were not part of the context.
export function computeRelatedSuggestions(
  map: ProjectMap,
  includedRelativePaths: string[],
): RelatedSuggestion[] {
  const included = new Set(includedRelativePaths)
  const byPath = new Map(map.files.map((entry) => [entry.relativePath, entry]))
  const suggestions = new Map<string, string>()

  for (const relativePath of includedRelativePaths) {
    const entry = byPath.get(relativePath)
    if (!entry) continue

    for (const reExport of entry.reExports) {
      if (included.has(reExport.target) || !byPath.has(reExport.target)) continue
      suggestions.set(
        reExport.target,
        reExport.symbol === '*'
          ? `Implements what ${entry.fileName} re-exports`
          : `The route points to ${reExport.symbol}, but its implementation was not included`,
      )
    }

    for (const imported of entry.localImports) {
      if (included.has(imported) || !byPath.has(imported) || suggestions.has(imported)) continue
      const target = byPath.get(imported)
      if (!target) continue
      if (target.kind === 'other' || target.kind === 'component') continue
      suggestions.set(imported, `${describeKind(target.kind)} used by ${entry.fileName}`)
    }
  }

  return [...suggestions.entries()]
    .slice(0, discoveryLimits.maxRelatedSuggestions)
    .map(([path, reason]) => ({ path, reason }))
}

function describeKind(kind: string): string {
  switch (kind) {
    case 'hook':
      return 'A hook'
    case 'service':
      return 'A service'
    case 'navigation':
      return 'Navigation configuration'
    case 'store':
      return 'Shared state'
    case 'screen':
      return 'A screen'
    default:
      return 'Code'
  }
}

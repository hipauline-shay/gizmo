import { discoveryLimits } from '../utilities/limits'
import type { FileMapEntry, ProjectMap } from './project-mapper'

export interface ScoredFile {
  path: string
  reason: string
  tier: 'strong' | 'possible'
  score: number
}

export interface RetrievalResult {
  strong: ScoredFile[]
  possible: ScoredFile[]
  totalMatches: number
}

const stopwords = new Set([
  'what',
  'is',
  'the',
  'a',
  'an',
  'of',
  'to',
  'in',
  'on',
  'for',
  'how',
  'does',
  'do',
  'work',
  'works',
  'when',
  'where',
  'which',
  'this',
  'that',
  'happens',
  'happen',
  'my',
  'our',
  'app',
  'product',
  'user',
  'users',
  'file',
  'files',
  'code',
  'explain',
  'show',
  'me',
  'about',
  'across',
  'with',
  'and',
  'or',
  'are',
])

export function tokenizeQuery(query: string): string[] {
  const raw = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stopwords.has(token))
  const tokens = new Set<string>()
  for (const token of raw) {
    tokens.add(token)
    if (token.endsWith('s')) tokens.add(token.slice(0, -1))
    if (token.endsWith('ing') && token.length > 5) tokens.add(token.slice(0, -3))
  }
  return [...tokens]
}

export function findRelevantFiles(map: ProjectMap, query: string): RetrievalResult {
  const tokens = tokenizeQuery(query)
  const byPath = new Map(map.files.map((entry) => [entry.relativePath, entry]))
  const scores = new Map<string, { score: number; reason: string }>()

  for (const entry of map.files) {
    const { score, reason } = scoreEntry(entry, tokens)
    if (score > 0) scores.set(entry.relativePath, { score, reason })
  }

  // Link expansion: strongly matched files pull in what they re-export and import.
  const directStrong = [...scores.entries()].filter(
    ([, value]) => value.score >= discoveryLimits.strongScore,
  )
  for (const [entryPath, value] of directStrong) {
    const entry = byPath.get(entryPath)
    if (!entry) continue
    for (const reExport of entry.reExports) {
      const target = byPath.get(reExport.target)
      if (!target) continue
      bump(
        scores,
        reExport.target,
        value.score,
        reExport.symbol === '*'
          ? `Implements what ${entry.fileName} re-exports`
          : `Implements ${reExport.symbol}, re-exported by ${entry.fileName}`,
      )
    }
    for (const imported of entry.localImports) {
      if (!byPath.has(imported)) continue
      bump(scores, imported, 18, `Used by ${entry.fileName}`)
    }
  }

  // Reverse links: screens/routes that USE a strongly matched file are part of the story.
  const strongSet = new Set(directStrong.map(([entryPath]) => entryPath))
  for (const entry of map.files) {
    if (strongSet.has(entry.relativePath)) continue
    const usedStrong = entry.localImports.find((imported) => strongSet.has(imported))
    const reExportedStrong = entry.reExports.find((reExport) => strongSet.has(reExport.target))
    if (usedStrong) {
      const used = byPath.get(usedStrong)
      bump(scores, entry.relativePath, 20, `Uses ${used?.fileName ?? usedStrong}`)
    } else if (reExportedStrong) {
      bump(scores, entry.relativePath, 20, `Route entry for ${reExportedStrong.symbol}`)
    }
  }

  const ranked = [...scores.entries()]
    .map(([entryPath, value]) => ({ path: entryPath, ...value }))
    .filter((item) => item.score >= discoveryLimits.possibleScore)
    .sort((a, b) => b.score - a.score)

  const strong = ranked
    .filter((item) => item.score >= discoveryLimits.strongScore)
    .slice(0, discoveryLimits.maxStrong)
    .map((item) => ({ ...item, tier: 'strong' as const }))
  const strongPaths = new Set(strong.map((item) => item.path))
  const possible = ranked
    .filter((item) => item.score < discoveryLimits.strongScore && !strongPaths.has(item.path))
    .slice(0, discoveryLimits.maxPossible)
    .map((item) => ({ ...item, tier: 'possible' as const }))

  return {
    strong,
    possible,
    totalMatches: ranked.length,
  }
}

function bump(
  scores: Map<string, { score: number; reason: string }>,
  entryPath: string,
  amount: number,
  reason: string,
): void {
  const existing = scores.get(entryPath)
  if (existing) {
    existing.score += Math.min(amount, discoveryLimits.strongScore)
  } else {
    scores.set(entryPath, { score: Math.min(amount, discoveryLimits.strongScore + 10), reason })
  }
}

const kindSynonyms: Record<string, FileMapEntry['kind'][]> = {
  screen: ['screen', 'route'],
  page: ['screen', 'route'],
  flow: ['screen', 'navigation', 'route'],
  journey: ['screen', 'navigation', 'route'],
  navigation: ['navigation'],
  hook: ['hook'],
  service: ['service'],
  api: ['service'],
  upload: ['service'],
  state: ['store'],
  data: ['store', 'service'],
}

function scoreEntry(entry: FileMapEntry, tokens: string[]): { score: number; reason: string } {
  let score = 0
  let reason = ''
  const lowerFileName = entry.fileName.toLowerCase()
  const lowerPath = entry.relativePath.toLowerCase()
  const symbolText = [...entry.exports, ...entry.components, ...entry.hooks].join(' ').toLowerCase()
  const routeText = entry.routeRefs.join(' ').toLowerCase()

  for (const token of tokens) {
    if (lowerFileName.includes(token)) {
      score += 30
      reason ||= describeMatch(entry, token)
    }
    const segments = lowerPath.split('/').slice(0, -1)
    if (segments.includes(token)) {
      score += 25
      reason ||= describeMatch(entry, token)
    } else if (segments.some((segment) => segment.includes(token))) {
      score += 12
      reason ||= describeMatch(entry, token)
    }
    if (symbolText.includes(token)) {
      score += 22
      reason ||= describeMatch(entry, token)
    }
    if (routeText.includes(token)) {
      score += 15
      reason ||= `Navigates to "${token}"`
    }
    const featureArea = entry.featureArea.toLowerCase()
    if (featureArea === token) {
      score += 15
      reason ||= describeMatch(entry, token)
    } else if (featureArea.includes(token)) {
      score += 8
      reason ||= describeMatch(entry, token)
    }
    const kinds = kindSynonyms[token]
    if (kinds?.includes(entry.kind)) score += 8
  }

  return { score, reason: reason || describeMatch(entry) }
}

function describeMatch(entry: FileMapEntry, token?: string): string {
  const topic = token ?? entry.featureArea
  switch (entry.kind) {
    case 'screen':
      return `Defines the ${topic} screen`
    case 'route':
      return `Route entry that opens the ${topic} screen`
    case 'hook':
      return `Provides ${entry.hooks[0] ?? `the ${topic} hook`}`
    case 'service':
      return entry.hasApiCalls ? `Handles ${topic} requests` : `Handles ${topic} logic`
    case 'navigation':
      return 'Controls navigation between steps'
    case 'store':
      return `Manages shared ${topic} state`
    case 'component':
      return `Renders the ${entry.components[0] ?? topic} component`
    default:
      return `Related to ${topic}`
  }
}

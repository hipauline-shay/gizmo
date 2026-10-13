import fs from 'fs/promises'
import path from 'path'
import {
  createGitignoreMatcher,
  isBinaryFile,
  isIgnoredDirectory,
  isSecretFile,
  isSupportedSourceFile,
  type GitignoreMatcher,
} from '../analysis/file-filters'
import { extractImportSpecifiers, resolveImportWithAliases } from '../analysis/import-resolver'
import { discoveryLimits } from '../utilities/limits'
import { toRelative } from '../utilities/paths'

export type FileKind =
  'screen' | 'component' | 'hook' | 'service' | 'route' | 'navigation' | 'store' | 'other'

export interface ReExport {
  symbol: string
  target: string
}

export interface FileMapEntry {
  relativePath: string
  fileName: string
  kind: FileKind
  featureArea: string
  imports: string[]
  localImports: string[]
  exports: string[]
  reExports: ReExport[]
  components: string[]
  hooks: string[]
  routeRefs: string[]
  hasApiCalls: boolean
  hasStateManagement: boolean
  isRouteOnly: boolean
}

export interface ProjectMap {
  rootPath: string
  createdAt: string
  files: FileMapEntry[]
}

export interface BuildMapOptions {
  rootPath: string
  maxFiles?: number
}

// Local-only analysis: file contents are read here to extract structure,
// but nothing from this module is ever sent to the AI provider.
export async function buildProjectMap({
  rootPath,
  maxFiles = discoveryLimits.maxIndexedFiles,
}: BuildMapOptions): Promise<ProjectMap> {
  const gitignore = await loadGitignore(rootPath)
  const filePaths: string[] = []
  await walk(rootPath, rootPath, gitignore, filePaths, maxFiles)

  const files: FileMapEntry[] = []
  for (const filePath of filePaths) {
    const entry = await mapFile(rootPath, filePath)
    if (entry) files.push(entry)
  }

  return { rootPath, createdAt: new Date().toISOString(), files }
}

export async function mapFile(
  rootPath: string,
  filePath: string,
): Promise<FileMapEntry | undefined> {
  let source: string
  try {
    source = await fs.readFile(filePath, 'utf8')
  } catch {
    return undefined
  }
  if (source.length > discoveryLimits.maxScanChars)
    source = source.slice(0, discoveryLimits.maxScanChars)

  const relativePath = toRelative(rootPath, filePath)
  const fileName = path.basename(filePath)
  const imports = extractImportSpecifiers(source)
  const localImports = imports
    .map((specifier) => resolveImportWithAliases(rootPath, filePath, specifier))
    .filter((resolved): resolved is string => resolved !== undefined)
    .map((resolved) => toRelative(rootPath, resolved))

  const reExports = extractReExports(source)
    .map(({ symbol, from }) => {
      const resolved = resolveImportWithAliases(rootPath, filePath, from)
      return resolved ? { symbol, target: toRelative(rootPath, resolved) } : undefined
    })
    .filter((item): item is ReExport => item !== undefined)

  const exports = extractExportNames(source)
  const components = exports.filter((name) => /^[A-Z]/.test(name))
  const hooks = [
    ...new Set([...exports, ...extractLocalNames(source), ...extractImportedNames(source)]),
  ].filter((name) => /^use[A-Z]/.test(name))
  const routeRefs = extractRouteRefs(source)

  return {
    relativePath,
    fileName,
    kind: inferKind(relativePath, fileName, exports, reExports),
    featureArea: inferFeatureArea(relativePath),
    imports,
    localImports: [...new Set(localImports)],
    exports,
    reExports,
    components,
    hooks,
    routeRefs,
    hasApiCalls: /\bfetch\s*\(|axios|supabase|\.post\s*\(|\.get\s*\(|graphql/i.test(source),
    hasStateManagement: /zustand|createContext|useContext|redux|jotai|recoil|createStore/.test(
      source,
    ),
    isRouteOnly: exports.length === 0 && reExports.length > 0,
  }
}

const reExportPattern = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g
const starReExportPattern = /export\s*\*\s*(?:as\s+\w+\s*)?from\s*['"]([^'"]+)['"]/g

export function extractReExports(source: string): { symbol: string; from: string }[] {
  const results: { symbol: string; from: string }[] = []
  for (const match of source.matchAll(reExportPattern)) {
    const from = match[2]
    if (!from) continue
    const symbols = (match[1] ?? '')
      .split(',')
      .map((piece) => piece.trim())
      .filter(Boolean)
      .map((piece) => {
        const asMatch = /(?:^|\s)as\s+(\w+)$/.exec(piece)
        return asMatch?.[1] ?? piece.split(/\s+/)[0] ?? piece
      })
    for (const symbol of symbols) results.push({ symbol, from })
  }
  for (const match of source.matchAll(starReExportPattern)) {
    const from = match[1]
    if (from) results.push({ symbol: '*', from })
  }
  return results
}

const exportNamePattern =
  /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class|let|var)\s+([A-Za-z0-9_]+)/g
const exportDefaultRefPattern = /export\s+default\s+([A-Za-z][A-Za-z0-9_]*)\s*;?\s*$/m

export function extractExportNames(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(exportNamePattern)) {
    if (match[1]) names.add(match[1])
  }
  const defaultRef = exportDefaultRefPattern.exec(source)
  if (defaultRef?.[1]) names.add(defaultRef[1])
  return [...names]
}

const localNamePattern = /(?:function|const)\s+(use[A-Z][A-Za-z0-9_]*)/g

function extractLocalNames(source: string): string[] {
  const names: string[] = []
  for (const match of source.matchAll(localNamePattern)) {
    if (match[1]) names.push(match[1])
  }
  return names
}

const importClausePattern = /import\s*\{([^}]+)\}\s*from/g

function extractImportedNames(source: string): string[] {
  const names: string[] = []
  for (const match of source.matchAll(importClausePattern)) {
    for (const piece of (match[1] ?? '').split(',')) {
      const name = piece
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim()
      if (name) names.push(name)
    }
  }
  return names
}

const routeRefPatterns = [
  /navigate\(\s*['"]([\w/-]+)['"]/g,
  /router\.(?:push|replace|navigate)\(\s*['"]([\w/-]+)['"]/g,
  /<\w*Stack\.Screen[^>]*name=\{?['"]([\w/-]+)['"]/g,
  /href=\{?['"](\/[\w/-]*)['"]/g,
]

export function extractRouteRefs(source: string): string[] {
  const refs = new Set<string>()
  for (const pattern of routeRefPatterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) refs.add(match[1])
    }
  }
  return [...refs]
}

const genericSegments = new Set([
  'src',
  'app',
  'apps',
  'screens',
  'components',
  'features',
  'pages',
  'ui',
  'lib',
  'utils',
  'util',
  'shared',
  'common',
])

export function inferFeatureArea(relativePath: string): string {
  const segments = relativePath.split('/').slice(0, -1)
  const meaningful = segments.filter((segment) => !genericSegments.has(segment.toLowerCase()))
  return meaningful[0] ?? segments[0] ?? 'root'
}

export function inferKind(
  relativePath: string,
  fileName: string,
  exports: string[],
  reExports: ReExport[],
): FileKind {
  const lowerPath = relativePath.toLowerCase()
  const lowerName = fileName.toLowerCase()
  const segments = lowerPath.split('/')

  if (
    (segments[0] === 'app' || segments[0] === 'pages') &&
    exports.length === 0 &&
    reExports.length > 0
  )
    return 'route'
  if (/navigat|stack|router|tabs/.test(lowerName)) return 'navigation'
  if (/^use[a-z0-9-]/.test(lowerName) || segments.includes('hooks')) return 'hook'
  if (/service|api|client/.test(lowerName) || segments.includes('services')) return 'service'
  if (/store|state|context|slice/.test(lowerName) || segments.includes('store')) return 'store'
  if (/screen|page|view/.test(lowerName) || segments.includes('screens')) return 'screen'
  if (segments[0] === 'app' || segments[0] === 'pages') return 'route'
  if (segments.includes('components') || exports.some((name) => /^[A-Z]/.test(name)))
    return 'component'
  return 'other'
}

async function walk(
  directory: string,
  rootPath: string,
  gitignore: GitignoreMatcher | undefined,
  collected: string[],
  maxFiles: number,
): Promise<void> {
  if (collected.length >= maxFiles) return
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (collected.length >= maxFiles) return
    const fullPath = path.join(directory, entry.name)
    const relativePath = toRelative(rootPath, fullPath)
    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name) || gitignore?.isIgnored(relativePath)) continue
      await walk(fullPath, rootPath, gitignore, collected, maxFiles)
      continue
    }
    if (!entry.isFile()) continue
    if (isSecretFile(entry.name) || isBinaryFile(entry.name)) continue
    if (gitignore?.isIgnored(relativePath)) continue
    if (!isSupportedSourceFile(fullPath)) continue
    collected.push(fullPath)
  }
}

async function loadGitignore(rootPath: string): Promise<GitignoreMatcher | undefined> {
  try {
    const content = await fs.readFile(path.join(rootPath, '.gitignore'), 'utf8')
    return createGitignoreMatcher(content)
  } catch {
    return undefined
  }
}

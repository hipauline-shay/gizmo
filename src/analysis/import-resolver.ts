import fs from 'fs'
import path from 'path'

const importPattern =
  /(?:import\s+[\s\S]*?from\s+|import\s*\(\s*|export\s+[\s\S]*?from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g

export function extractImportSpecifiers(source: string): string[] {
  const specifiers = new Set<string>()
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1]
    if (specifier) specifiers.add(specifier)
  }
  return [...specifiers]
}

const resolutionSuffixes = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
]

export interface ResolveOptions {
  exists?: (candidate: string) => boolean
}

export function resolveLocalImport(
  fromFile: string,
  specifier: string,
  { exists = defaultExists }: ResolveOptions = {},
): string | undefined {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return undefined
  const base = path.resolve(path.dirname(fromFile), specifier)
  for (const suffix of resolutionSuffixes) {
    const candidate = base + suffix
    if (exists(candidate)) return candidate
  }
  return undefined
}

export function resolveImportWithAliases(
  rootPath: string,
  fromFile: string,
  specifier: string,
  { exists = defaultExists }: ResolveOptions = {},
): string | undefined {
  if (specifier.startsWith('./') || specifier.startsWith('../'))
    return resolveLocalImport(fromFile, specifier, { exists })

  const aliasMatch = /^[@~]\/(.+)$/.exec(specifier)
  const rest = aliasMatch?.[1] ?? (specifier.startsWith('src/') ? specifier : undefined)
  if (!rest) return undefined

  for (const base of [path.join(rootPath, rest), path.join(rootPath, 'src', rest)]) {
    for (const suffix of resolutionSuffixes) {
      const candidate = base + suffix
      if (exists(candidate)) return candidate
    }
  }
  return undefined
}

function defaultExists(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile()
  } catch {
    return false
  }
}

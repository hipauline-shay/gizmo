import fs from 'fs/promises'
import { countRedactions, redactSecrets } from './secret-redactor'
import path from 'path'
import {
  createGitignoreMatcher,
  filePriority,
  isBinaryFile,
  isIgnoredDirectory,
  isSecretFile,
  isSupportedSourceFile,
  type GitignoreMatcher,
} from './file-filters'
import { extractImportSpecifiers, resolveImportWithAliases } from './import-resolver'
import { knownError } from '../utilities/errors'
import { defaultLimits, type ContextLimits } from '../utilities/limits'
import { isInsideRoot, toRelative } from '../utilities/paths'
import type { AnalysisContext, CollectedFile } from './types'

export interface CollectOptions {
  rootPath: string
  selectionPath?: string
  selectionPaths?: string[]
  limits?: Partial<ContextLimits>
  includeImports?: boolean
}

export async function collectContext({
  rootPath,
  selectionPath,
  selectionPaths,
  limits: limitOverrides,
  includeImports = true,
}: CollectOptions): Promise<AnalysisContext> {
  const limits: ContextLimits = { ...defaultLimits, ...limitOverrides }
  const gitignore = await loadGitignore(rootPath)

  const inputPaths = [...new Set(selectionPaths ?? (selectionPath ? [selectionPath] : []))]
  if (inputPaths.length === 0) throw knownError('no-selection')

  const excludedFiles: string[] = []
  const selectedPaths: string[] = []
  const singleFileSelection = inputPaths.length === 1

  for (const inputPath of inputPaths) {
    const stat = await fs.stat(inputPath).catch(() => {
      throw knownError('no-selection')
    })

    if (stat.isDirectory()) {
      const directoryFiles: string[] = []
      await walkDirectory(inputPath, rootPath, gitignore, directoryFiles, excludedFiles)
      directoryFiles.sort(
        (a, b) => filePriority(toRelative(rootPath, a)) - filePriority(toRelative(rootPath, b)),
      )
      selectedPaths.push(...directoryFiles)
    } else {
      const base = path.basename(inputPath)
      if (isSecretFile(base)) {
        if (singleFileSelection)
          throw knownError('unsupported-file', 'Secret and environment files are never analyzed.')
        continue
      }
      if (!isSupportedSourceFile(inputPath)) {
        if (singleFileSelection) throw knownError('unsupported-file')
        excludedFiles.push(toRelative(rootPath, inputPath))
        continue
      }
      selectedPaths.push(inputPath)
    }
  }

  if (selectedPaths.length === 0) throw knownError('unsupported-file')

  const files: CollectedFile[] = []
  const truncatedFiles: string[] = []
  const seen = new Set<string>()
  let totalChars = 0
  let maskedSecrets = 0

  const addFile = async (
    filePath: string,
    reason: CollectedFile['reason'],
  ): Promise<string | undefined> => {
    if (seen.has(filePath)) return undefined
    if (files.length >= limits.maxFiles || totalChars >= limits.maxTotalChars) {
      excludedFiles.push(toRelative(rootPath, filePath))
      return undefined
    }
    seen.add(filePath)
    let raw: string
    try {
      const original = await fs.readFile(filePath, 'utf8')
      raw = redactSecrets(original)
      maskedSecrets += countRedactions(original, raw)
    } catch {
      excludedFiles.push(toRelative(rootPath, filePath))
      return undefined
    }
    if (reason === 'selected' && selectedPaths.length === 1 && raw.trim().length === 0)
      throw knownError('empty-file')
    if (raw.trim().length === 0) return raw

    let truncated = false
    let content = raw
    const remaining = limits.maxTotalChars - totalChars
    const budget = Math.min(limits.maxCharsPerFile, remaining)
    if (content.length > budget) {
      content = content.slice(0, budget)
      truncated = true
    }
    const relativePath = toRelative(rootPath, filePath)
    if (truncated) truncatedFiles.push(relativePath)
    totalChars += content.length
    files.push({
      relativePath,
      content,
      numberedContent: addLineNumbers(content),
      truncated,
      reason,
    })
    return raw
  }

  const importQueue: { filePath: string; depth: number }[] = []
  for (const filePath of selectedPaths) {
    const raw = await addFile(filePath, 'selected')
    if (raw !== undefined && includeImports && limits.maxImportDepth > 0)
      importQueue.push({ filePath, depth: 0 })
  }

  const rawByPath = new Map<string, string>()
  for (const file of files) rawByPath.set(path.resolve(rootPath, file.relativePath), file.content)

  while (importQueue.length > 0) {
    const item = importQueue.shift()
    if (!item) break
    const source = rawByPath.get(item.filePath)
    if (!source) continue
    for (const specifier of extractImportSpecifiers(source)) {
      const resolved = resolveImportWithAliases(rootPath, item.filePath, specifier)
      if (!resolved || seen.has(resolved)) continue
      if (!isSupportedSourceFile(resolved)) continue
      if (!isInsideRoot(rootPath, resolved)) continue
      if (gitignore?.isIgnored(toRelative(rootPath, resolved))) continue
      const raw = await addFile(resolved, 'import')
      if (raw !== undefined) {
        rawByPath.set(resolved, raw)
        if (item.depth + 1 < limits.maxImportDepth)
          importQueue.push({ filePath: resolved, depth: item.depth + 1 })
      }
    }
  }

  if (files.length === 0) throw knownError('unsupported-file')

  return {
    rootPath,
    maskedSecrets,
    selectionLabel: buildSelectionLabel(rootPath, inputPaths),
    files,
    excludedFiles: dedupe(excludedFiles),
    truncatedFiles: dedupe(truncatedFiles),
    totalChars,
  }
}

function buildSelectionLabel(rootPath: string, inputPaths: string[]): string {
  const first = inputPaths[0]
  if (!first) return 'selection'
  const firstLabel = toRelative(rootPath, first) || path.basename(first)
  if (inputPaths.length === 1) return firstLabel
  return `${firstLabel} +${inputPaths.length - 1} more`
}

async function walkDirectory(
  directory: string,
  rootPath: string,
  gitignore: GitignoreMatcher | undefined,
  collected: string[],
  excluded: string[],
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    const relativePath = toRelative(rootPath, fullPath)
    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name) || gitignore?.isIgnored(relativePath)) continue
      await walkDirectory(fullPath, rootPath, gitignore, collected, excluded)
      continue
    }
    if (!entry.isFile()) continue
    if (isSecretFile(entry.name) || isBinaryFile(entry.name)) continue
    if (gitignore?.isIgnored(relativePath)) continue
    if (!isSupportedSourceFile(fullPath)) {
      excluded.push(relativePath)
      continue
    }
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

export function addLineNumbers(content: string): string {
  return content
    .split('\n')
    .map((line, index) => `${String(index + 1).padStart(4, ' ')}| ${line}`)
    .join('\n')
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)]
}

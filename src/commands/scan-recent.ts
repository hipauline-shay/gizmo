import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'
import { readSettings } from '../services/settings-service'
import { fitToScan } from '../analysis/fit-to-scan'
import { runAnalysis, showScanError } from './explain-selection'
import type { AppServices } from '../app-services'
import type { ScanTarget } from '../shared/messages'
import type { ErrorInfo } from '../utilities/errors'
import type { ContextLimits } from '../utilities/limits'

const execFileAsync = promisify(execFile)
const RECENT_DAYS = 7

export function recentChangesQuestion({
  scanned,
  changed,
}: {
  scanned: number
  changed: number
}): string {
  const coverage =
    changed > scanned
      ? ` These are the ${scanned} most recently changed of ${changed} files changed this week; say so in the summary, and do not judge the files you were not given.`
      : ''
  return `What I changed this week: review the code changed in the last ${RECENT_DAYS} days. Say what was built or changed, what works, and what is still missing.${coverage}`
}

// Scans the files changed in the last week, newest first, up to one area's worth. With an
// areaId it refreshes that area, picking the week's files again rather than the old ones.
export async function runScanRecent(
  services: AppServices,
  target: ScanTarget,
  areaId?: string,
): Promise<void> {
  services.getPanel().reveal()
  if (!areaId) services.scan.lastRequest = undefined
  const showError = (error: ErrorInfo): void => {
    if (areaId)
      void vscode.window.showWarningMessage(
        `Gizmo could not rescan: ${error.message} ${error.action}`,
      )
    else showScanError(services, target, error)
  }
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    showError({
      code: 'no-workspace',
      message: 'No folder is open in this window.',
      action: 'Open a project folder, then try again.',
    })
    return
  }

  const rootPath = workspaceFolder.uri.fsPath
  const map = await services.mapService.ensureMap()
  const sourceFiles = map?.files.map((entry) => entry.relativePath) ?? []
  const { files: recent, changedCount } = await findRecentFiles({
    rootPath,
    sourceFiles,
    limits: readSettings().limits,
  })
  if (recent.length === 0) {
    showError({
      code: 'no-selection',
      message: `No code changed in the last ${RECENT_DAYS} days.`,
      action: 'Pick a screen or feature instead, or choose files manually.',
    })
    return
  }

  services.logger.info(`recent changes: changed=${changedCount} scanned=${recent.length}`)
  await runAnalysis(
    services,
    recent.map((relativePath) => path.resolve(rootPath, relativePath)),
    recentChangesQuestion({ scanned: recent.length, changed: changedCount }),
    { target, areaId, source: 'recent' },
  )
}

export async function findRecentFiles({
  rootPath,
  sourceFiles,
  limits,
}: {
  rootPath: string
  sourceFiles: string[]
  limits: Pick<ContextLimits, 'maxFiles' | 'maxTotalChars'>
}): Promise<{ files: string[]; changedCount: number }> {
  const { files, isFromGit } = await changedFiles(rootPath, sourceFiles)
  const newestFirst = await pickRecentFiles({
    rootPath,
    files,
    limit: Number.MAX_SAFE_INTEGER,
    requireRecentDate: !isFromGit,
  })
  const fitted = await fitToScan({ rootPath, relativePaths: newestFirst, limits })
  return { files: fitted, changedCount: newestFirst.length }
}

// With git: files in commits from the last week plus uncommitted and new files. Without
// git: every source file, filtered by date afterwards. Only the project's own source files
// (from the project map, which already skips ignored and secret files) are ever returned.
async function changedFiles(
  rootPath: string,
  sourceFiles: string[],
): Promise<{ files: string[]; isFromGit: boolean }> {
  const sources = new Set(sourceFiles)
  const fromGit = await gitChangedFiles(rootPath)
  if (!fromGit) return { files: sourceFiles, isFromGit: false }
  return { files: [...new Set(fromGit)].filter((file) => sources.has(file)), isFromGit: true }
}

async function gitChangedFiles(rootPath: string): Promise<string[] | undefined> {
  const git = async (args: string[]): Promise<string[]> => {
    const { stdout } = await execFileAsync('git', args, { cwd: rootPath, maxBuffer: 4_000_000 })
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }
  try {
    const [committed, uncommitted, untracked] = await Promise.all([
      git(['log', `--since=${RECENT_DAYS}.days`, '--name-only', '--pretty=format:', '--relative']),
      git(['diff', '--name-only', '--relative', 'HEAD']),
      git(['ls-files', '--others', '--exclude-standard']),
    ])
    return [...committed, ...uncommitted, ...untracked]
  } catch {
    return undefined
  }
}

export async function pickRecentFiles({
  rootPath,
  files,
  limit,
  requireRecentDate,
  now = Date.now(),
}: {
  rootPath: string
  files: string[]
  limit: number
  // Git already knows these changed this week; only the no-git fallback filters by date.
  requireRecentDate: boolean
  now?: number
}): Promise<string[]> {
  const cutoff = now - RECENT_DAYS * 24 * 60 * 60 * 1000
  const dated = await Promise.all(
    files.map(async (relativePath) => {
      const stat = await fs.stat(path.join(rootPath, relativePath)).catch(() => undefined)
      return { relativePath, changedAt: stat?.isFile() ? stat.mtimeMs : 0 }
    }),
  )
  return dated
    .filter((file) => file.changedAt > 0 && (!requireRecentDate || file.changedAt >= cutoff))
    .sort((a, b) => b.changedAt - a.changedAt)
    .slice(0, limit)
    .map((file) => file.relativePath)
}

import * as vscode from 'vscode'
import { buildProjectMap, type ProjectMap } from '../discovery/project-mapper'
import type { MapStatus } from '../shared/messages'
import type { Logger } from './logger'

const mapStateKey = 'gizmo.projectMapV1'
const rebuildDebounceMs = 3000

export interface ProjectMapService extends vscode.Disposable {
  getMap(): ProjectMap | undefined
  ensureMap(): Promise<ProjectMap | undefined>
  refresh(): Promise<ProjectMap | undefined>
  status(): MapStatus
  onStatusChange(listener: (status: MapStatus) => void): void
}

export function createProjectMapService(
  context: vscode.ExtensionContext,
  logger: Logger,
): ProjectMapService {
  let map: ProjectMap | undefined
  let state: MapStatus['state'] = 'unavailable'
  let building: Promise<ProjectMap | undefined> | undefined
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined
  const listeners: ((status: MapStatus) => void)[] = []

  const rootPath = (): string | undefined => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  const currentStatus = (): MapStatus => ({ state, fileCount: map?.files.length ?? 0 })

  const notify = (): void => {
    const status = currentStatus()
    for (const listener of listeners) listener(status)
  }

  const setState = (next: MapStatus['state']): void => {
    state = next
    notify()
  }

  const loadPersisted = (): void => {
    const persisted = context.workspaceState.get<ProjectMap>(mapStateKey)
    const root = rootPath()
    if (persisted && root && persisted.rootPath === root) {
      map = persisted
      state = 'stale'
    }
  }

  const build = async (): Promise<ProjectMap | undefined> => {
    const root = rootPath()
    if (!root) {
      setState('unavailable')
      return undefined
    }
    setState('mapping')
    try {
      const fresh = await buildProjectMap({ rootPath: root })
      map = fresh
      await context.workspaceState.update(mapStateKey, fresh)
      logger.info(`project map built: files=${fresh.files.length}`)
      setState('ready')
      return fresh
    } catch {
      logger.error('project map build failed')
      setState(map ? 'stale' : 'unavailable')
      return map
    }
  }

  const refresh = (): Promise<ProjectMap | undefined> => {
    building ??= build().finally(() => {
      building = undefined
    })
    return building
  }

  const scheduleRebuild = (): void => {
    if (state === 'ready') setState('stale')
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(() => void refresh(), rebuildDebounceMs)
  }

  // Map structure changes on file create/delete/rename; plain edits rarely
  // change relationships enough to warrant a full rebuild.
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,mjs,cjs}')
  watcher.onDidCreate(scheduleRebuild)
  watcher.onDidDelete(scheduleRebuild)

  loadPersisted()
  void refresh()

  return {
    getMap: () => map,
    async ensureMap() {
      if (map && (state === 'ready' || state === 'stale')) return map
      return refresh()
    },
    refresh,
    status: currentStatus,
    onStatusChange(listener) {
      listeners.push(listener)
    },
    dispose() {
      watcher.dispose()
      if (rebuildTimer) clearTimeout(rebuildTimer)
    },
  }
}

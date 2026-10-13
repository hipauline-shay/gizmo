import { filePriority } from '../analysis/file-filters'
import type { FileMapEntry, ProjectMap } from './project-mapper'

const maxInventoryChars = 12000

// Text summary of the locally built project map — structure and symbol names
// only, never source code. Used by the full product scan so the AI can judge
// overall health without receiving the whole repository.
export function buildProductInventory(map: ProjectMap): string {
  const byArea = new Map<string, FileMapEntry[]>()
  for (const entry of map.files) {
    const list = byArea.get(entry.featureArea) ?? []
    list.push(entry)
    byArea.set(entry.featureArea, list)
  }

  const lines: string[] = [`Project inventory: ${map.files.length} source files.`]
  const areas = [...byArea.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [area, entries] of areas) {
    lines.push('', `Feature area "${area}" (${entries.length} files):`)
    for (const entry of entries) {
      const symbols = [...entry.components, ...entry.hooks].slice(0, 4).join(', ')
      const flags = [
        entry.hasApiCalls ? 'api' : '',
        entry.hasStateManagement ? 'state' : '',
        entry.isRouteOnly ? 're-export only' : '',
      ]
        .filter(Boolean)
        .join(', ')
      lines.push(
        `- ${entry.relativePath} [${entry.kind}${flags ? `; ${flags}` : ''}]${symbols ? ` — ${symbols}` : ''}${entry.routeRefs.length > 0 ? ` → navigates to: ${entry.routeRefs.slice(0, 4).join(', ')}` : ''}`,
      )
    }
  }

  const text = lines.join('\n')
  return text.length > maxInventoryChars
    ? `${text.slice(0, maxInventoryChars)}\n… (inventory truncated)`
    : text
}

// Representative files for a full product scan: routes, navigation, and
// screens first, ranked by structural priority.
export function pickProductScanFiles(map: ProjectMap, maxFiles: number): string[] {
  const kindOrder: Record<string, number> = {
    navigation: 0,
    route: 1,
    screen: 2,
    store: 3,
    service: 4,
    hook: 5,
    component: 6,
    other: 7,
  }
  return [...map.files]
    .sort(
      (a, b) =>
        (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9) ||
        filePriority(a.relativePath) - filePriority(b.relativePath),
    )
    .slice(0, maxFiles)
    .map((entry) => entry.relativePath)
}

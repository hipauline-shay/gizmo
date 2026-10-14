import type { ProjectMap } from './project-mapper'

// The project's own areas, as chips under "What should Gizmo look at?": feature areas that
// contain screens, biggest first, leaving out areas the report already covers.
export function suggestAreas({
  map,
  scannedFiles,
  limit = 6,
}: {
  map: ProjectMap
  scannedFiles: string[]
  limit?: number
}): string[] {
  const scanned = new Set(scannedFiles)
  const screensByArea = new Map<string, number>()
  const coveredAreas = new Set<string>()

  for (const entry of map.files) {
    if (scanned.has(entry.relativePath)) coveredAreas.add(entry.featureArea)
    if (entry.kind !== 'screen' || entry.featureArea === 'root') continue
    screensByArea.set(entry.featureArea, (screensByArea.get(entry.featureArea) ?? 0) + 1)
  }

  return [...screensByArea.entries()]
    .filter(([area]) => !coveredAreas.has(area))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([area]) => area)
}

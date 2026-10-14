import { describe, expect, it } from 'vitest'
import { suggestAreas } from '../src/discovery/area-suggestions'
import type { FileMapEntry, ProjectMap } from '../src/discovery/project-mapper'

function entry(partial: Partial<FileMapEntry> & { relativePath: string }): FileMapEntry {
  return {
    fileName: partial.relativePath.split('/').pop() ?? '',
    kind: 'other',
    featureArea: 'root',
    imports: [],
    localImports: [],
    exports: [],
    reExports: [],
    components: [],
    hooks: [],
    routeRefs: [],
    hasApiCalls: false,
    hasStateManagement: false,
    isRouteOnly: false,
    ...partial,
  }
}

const map: ProjectMap = {
  rootPath: '/project',
  createdAt: '2026-01-01T00:00:00.000Z',
  files: [
    entry({
      relativePath: 'screens/camera/camera-screen.tsx',
      kind: 'screen',
      featureArea: 'camera',
    }),
    entry({ relativePath: 'screens/settings/a.tsx', kind: 'screen', featureArea: 'settings' }),
    entry({ relativePath: 'screens/settings/b.tsx', kind: 'screen', featureArea: 'settings' }),
    entry({ relativePath: 'screens/map/map-screen.tsx', kind: 'screen', featureArea: 'map' }),
    entry({ relativePath: 'services/api.ts', kind: 'service', featureArea: 'services' }),
    entry({ relativePath: 'app-screen.tsx', kind: 'screen', featureArea: 'root' }),
  ],
}

describe('suggestAreas', () => {
  it('offers the areas that have screens, biggest first', () => {
    expect(suggestAreas({ map, scannedFiles: [] })).toEqual(['settings', 'camera', 'map'])
  })

  it('leaves out areas the report already covers', () => {
    expect(suggestAreas({ map, scannedFiles: ['screens/camera/camera-screen.tsx'] })).toEqual([
      'settings',
      'map',
    ])
  })

  it('respects the limit', () => {
    expect(suggestAreas({ map, scannedFiles: [], limit: 1 })).toEqual(['settings'])
  })
})

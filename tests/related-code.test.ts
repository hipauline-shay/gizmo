import { describe, expect, it } from 'vitest'
import { computeRelatedSuggestions } from '../src/discovery/related-code'
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
      relativePath: 'app/scan.tsx',
      kind: 'route',
      isRouteOnly: true,
      reExports: [{ symbol: 'ScanScreen', target: 'screens/scan-screen.tsx' }],
    }),
    entry({
      relativePath: 'screens/scan-screen.tsx',
      kind: 'screen',
      localImports: ['hooks/use-camera.ts', 'components/button.tsx'],
    }),
    entry({ relativePath: 'hooks/use-camera.ts', kind: 'hook' }),
    entry({ relativePath: 'components/button.tsx', kind: 'component' }),
  ],
}

describe('computeRelatedSuggestions', () => {
  it('suggests the implementation behind an included route file', () => {
    const suggestions = computeRelatedSuggestions(map, ['app/scan.tsx'])
    const target = suggestions.find((item) => item.path === 'screens/scan-screen.tsx')
    expect(target).toBeDefined()
    expect(target?.reason).toContain('was not included')
  })

  it('suggests hooks and services used by included files, not generic components', () => {
    const suggestions = computeRelatedSuggestions(map, ['screens/scan-screen.tsx'])
    const paths = suggestions.map((item) => item.path)
    expect(paths).toContain('hooks/use-camera.ts')
    expect(paths).not.toContain('components/button.tsx')
  })

  it('never suggests files that are already included', () => {
    const suggestions = computeRelatedSuggestions(map, [
      'app/scan.tsx',
      'screens/scan-screen.tsx',
      'hooks/use-camera.ts',
    ])
    expect(suggestions).toHaveLength(0)
  })

  it('does not recursively expand beyond direct references', () => {
    const suggestions = computeRelatedSuggestions(map, ['app/scan.tsx'])
    // hooks/use-camera.ts is referenced by scan-screen (not included), so it must not appear.
    expect(suggestions.map((item) => item.path)).not.toContain('hooks/use-camera.ts')
  })
})

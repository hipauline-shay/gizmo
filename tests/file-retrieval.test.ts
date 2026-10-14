import { describe, expect, it } from 'vitest'
import { findRelevantFiles, tokenizeQuery } from '../src/discovery/file-retrieval'
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

const cameraMap: ProjectMap = {
  rootPath: '/project',
  createdAt: '2026-01-01T00:00:00.000Z',
  files: [
    entry({
      relativePath: 'app/capture/scan.tsx',
      kind: 'route',
      featureArea: 'capture',
      isRouteOnly: true,
      reExports: [{ symbol: 'ScanScreen', target: 'screens/capture/scan-screen.tsx' }],
    }),
    entry({
      relativePath: 'screens/capture/scan-screen.tsx',
      kind: 'screen',
      featureArea: 'capture',
      components: ['ScanScreen'],
      localImports: ['hooks/use-camera.ts', 'services/upload-service.ts'],
    }),
    entry({
      relativePath: 'hooks/use-camera.ts',
      kind: 'hook',
      featureArea: 'capture',
      hooks: ['useCamera'],
    }),
    entry({
      relativePath: 'services/upload-service.ts',
      kind: 'service',
      featureArea: 'services',
      hasApiCalls: true,
    }),
    entry({
      relativePath: 'screens/settings/settings-screen.tsx',
      kind: 'screen',
      featureArea: 'settings',
      components: ['SettingsScreen'],
    }),
  ],
}

describe('tokenizeQuery', () => {
  it('drops stopwords and keeps meaningful terms', () => {
    const tokens = tokenizeQuery('What is the camera flow?')
    expect(tokens).toContain('camera')
    expect(tokens).not.toContain('what')
    expect(tokens).not.toContain('the')
  })
})

describe('findRelevantFiles', () => {
  it('finds camera files for a camera question', () => {
    const result = findRelevantFiles(cameraMap, 'What is the camera flow?')
    const strongPaths = result.strong.map((file) => file.path)
    const allPaths = [...strongPaths, ...result.possible.map((file) => file.path)]
    expect(strongPaths).toContain('hooks/use-camera.ts')
    expect(allPaths.some((p) => p.includes('capture'))).toBe(true)
    expect(allPaths).not.toContain('screens/settings/settings-screen.tsx')
  })

  it('pulls in re-export implementation targets with a plain-language reason', () => {
    const result = findRelevantFiles(cameraMap, 'What happens on the scan screen?')
    const all = [...result.strong, ...result.possible]
    const implementation = all.find((file) => file.path === 'screens/capture/scan-screen.tsx')
    expect(implementation).toBeDefined()
  })

  it('separates strong and possible tiers by score', () => {
    const result = findRelevantFiles(cameraMap, 'capture')
    expect(result.strong.length).toBeGreaterThan(0)
    for (const file of result.strong) expect(file.tier).toBe('strong')
    for (const file of result.possible) expect(file.tier).toBe('possible')
  })

  it('returns nothing useful for unrelated queries', () => {
    const result = findRelevantFiles(cameraMap, 'billing subscription paywall')
    expect(result.strong).toHaveLength(0)
  })
})

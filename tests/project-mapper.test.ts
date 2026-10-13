import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildProjectMap,
  extractExportNames,
  extractReExports,
  extractRouteRefs,
  inferFeatureArea,
  inferKind,
  mapFile,
} from '../src/discovery/project-mapper'

let root: string

async function write(relativePath: string, content: string): Promise<string> {
  const fullPath = path.join(root, relativePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, 'utf8')
  return fullPath
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-map-'))
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('extractReExports', () => {
  it('parses named, aliased-default, and star re-exports', () => {
    const source = `
export { ScanScreen as default } from '@/screens/capture/scan-screen'
export { helper, other } from './helpers'
export * from './types'
`
    const reExports = extractReExports(source)
    expect(reExports).toContainEqual({ symbol: 'default', from: '@/screens/capture/scan-screen' })
    expect(reExports).toContainEqual({ symbol: 'helper', from: './helpers' })
    expect(reExports).toContainEqual({ symbol: '*', from: './types' })
  })
})

describe('extractExportNames', () => {
  it('finds function, const, and default-reference exports', () => {
    const source = `
export function ScanScreen() {}
export const useCamera = () => {}
const ResultView = () => null
export default ResultView
`
    const names = extractExportNames(source)
    expect(names).toContain('ScanScreen')
    expect(names).toContain('useCamera')
    expect(names).toContain('ResultView')
  })
})

describe('extractRouteRefs', () => {
  it('finds navigate calls, router pushes, and stack screens', () => {
    const source = `
navigation.navigate('Results')
router.push('/capture/scan')
<Stack.Screen name="Camera" component={CameraScreen} />
`
    const refs = extractRouteRefs(source)
    expect(refs).toContain('Results')
    expect(refs).toContain('/capture/scan')
    expect(refs).toContain('Camera')
  })
})

describe('inferKind and inferFeatureArea', () => {
  it('classifies files by path and name', () => {
    expect(
      inferKind('screens/capture/scan-screen.tsx', 'scan-screen.tsx', ['ScanScreen'], []),
    ).toBe('screen')
    expect(inferKind('hooks/use-camera.ts', 'use-camera.ts', ['useCamera'], [])).toBe('hook')
    expect(inferKind('services/upload-service.ts', 'upload-service.ts', ['upload'], [])).toBe(
      'service',
    )
    expect(
      inferKind('navigation/capture-stack.tsx', 'capture-stack.tsx', ['CaptureStack'], []),
    ).toBe('navigation')
    expect(
      inferKind('app/capture/scan.tsx', 'scan.tsx', [], [{ symbol: 'default', target: 'x' }]),
    ).toBe('route')
  })

  it('derives feature areas from meaningful folders', () => {
    expect(inferFeatureArea('screens/capture/scan-screen.tsx')).toBe('capture')
    expect(inferFeatureArea('src/features/onboarding/steps.tsx')).toBe('onboarding')
  })
})

describe('mapFile', () => {
  it('resolves alias re-exports to implementation files', async () => {
    await write('screens/capture/scan-screen.tsx', 'export function ScanScreen() { return null }\n')
    const routePath = await write(
      'app/capture/scan.tsx',
      "export { ScanScreen as default } from '@/screens/capture/scan-screen'\n",
    )
    const entry = await mapFile(root, routePath)
    expect(entry?.isRouteOnly).toBe(true)
    expect(entry?.reExports).toContainEqual({
      symbol: 'default',
      target: 'screens/capture/scan-screen.tsx',
    })
  })

  it('resolves relative imports into localImports', async () => {
    await write('hooks/use-camera.ts', 'export const useCamera = () => {}\n')
    const screenPath = await write(
      'screens/scan.tsx',
      "import { useCamera } from '../hooks/use-camera'\nexport const Scan = () => null\n",
    )
    const entry = await mapFile(root, screenPath)
    expect(entry?.localImports).toContain('hooks/use-camera.ts')
    expect(entry?.hooks).toContain('useCamera')
  })
})

describe('buildProjectMap', () => {
  it('indexes supported files and skips secrets and node_modules', async () => {
    await write('screens/scan.tsx', 'export const Scan = () => null\n')
    await write('.env', 'SECRET=1\n')
    await write('node_modules/pkg/index.js', 'module.exports = {}\n')
    await write('assets/logo.svg', '<svg/>\n')
    const map = await buildProjectMap({ rootPath: root })
    const paths = map.files.map((entry) => entry.relativePath)
    expect(paths).toEqual(['screens/scan.tsx'])
  })

  it('survives a JSON round-trip for persistence', async () => {
    await write('screens/scan.tsx', 'export const Scan = () => null\n')
    const map = await buildProjectMap({ rootPath: root })
    const restored = JSON.parse(JSON.stringify(map)) as typeof map
    expect(restored.rootPath).toBe(root)
    expect(restored.files[0]?.relativePath).toBe('screens/scan.tsx')
  })
})

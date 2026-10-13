import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addLineNumbers, collectContext } from '../src/analysis/context-collector'
import { GizmoError } from '../src/utilities/errors'

let root: string

async function write(relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(root, relativePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, 'utf8')
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-'))
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('collectContext', () => {
  it('collects a single file with line numbers', async () => {
    await write('src/app.ts', 'const a = 1\nconst b = 2\n')
    const context = await collectContext({
      rootPath: root,
      selectionPath: path.join(root, 'src/app.ts'),
    })
    expect(context.files).toHaveLength(1)
    expect(context.files[0]?.relativePath).toBe('src/app.ts')
    expect(context.files[0]?.numberedContent).toContain('   1| const a = 1')
  })

  it('excludes .env files from folder analysis', async () => {
    await write('feature/.env', 'SECRET=1')
    await write('feature/.env.local', 'SECRET=2')
    await write('feature/screen.tsx', 'export const Screen = () => null\n')
    const context = await collectContext({
      rootPath: root,
      selectionPath: path.join(root, 'feature'),
    })
    expect(context.files.map((file) => file.relativePath)).toEqual(['feature/screen.tsx'])
  })

  it('rejects a directly selected .env file', async () => {
    await write('.env', 'SECRET=1')
    await expect(
      collectContext({ rootPath: root, selectionPath: path.join(root, '.env') }),
    ).rejects.toThrow(GizmoError)
  })

  it('skips node_modules and build output', async () => {
    await write('node_modules/pkg/index.js', 'module.exports = {}\n')
    await write('dist/bundle.js', 'var x = 1\n')
    await write('src/app.ts', 'export const app = true\n')
    const context = await collectContext({ rootPath: root, selectionPath: root })
    expect(context.files.map((file) => file.relativePath)).toEqual(['src/app.ts'])
  })

  it('respects .gitignore rules', async () => {
    await write('.gitignore', 'generated/\n')
    await write('generated/api.ts', 'export const generated = true\n')
    await write('src/app.ts', 'export const app = true\n')
    const context = await collectContext({ rootPath: root, selectionPath: root })
    expect(context.files.map((file) => file.relativePath)).toEqual(['src/app.ts'])
  })

  it('follows local relative imports one level deep', async () => {
    await write('src/app.ts', "import { helper } from './helper'\nexport const app = helper\n")
    await write('src/helper.ts', 'export const helper = 1\n')
    await write('src/deep.ts', 'export const deep = 2\n')
    const context = await collectContext({
      rootPath: root,
      selectionPath: path.join(root, 'src/app.ts'),
      limits: { maxImportDepth: 1 },
    })
    const paths = context.files.map((file) => file.relativePath)
    expect(paths).toContain('src/app.ts')
    expect(paths).toContain('src/helper.ts')
    expect(paths).not.toContain('src/deep.ts')
  })

  it('never follows an import that climbs outside the project folder', async () => {
    await write('proj/src/app.ts', "import { leak } from '../../leak'\nexport const app = leak\n")
    await write('leak.ts', 'export const leak = 1\n')
    const context = await collectContext({
      rootPath: path.join(root, 'proj'),
      selectionPath: path.join(root, 'proj/src/app.ts'),
      limits: { maxImportDepth: 1 },
    })
    const paths = context.files.map((file) => file.relativePath)
    expect(paths).toEqual(['src/app.ts'])
    expect(paths.join()).not.toContain('leak')
  })

  it('masks key-looking strings inside code before they reach the prompt', async () => {
    await write(
      'src/config.ts',
      // Fake key, split so GitHub's secret scanner doesn't mistake it for a real one.
      `export const anthropicKey = '${'sk-ant-'}api03-abcdefghijklmnopqrstuvwxyz0123456789'\n`,
    )
    const context = await collectContext({
      rootPath: root,
      selectionPath: path.join(root, 'src/config.ts'),
    })
    const file = context.files[0]
    expect(file?.content).not.toContain('sk-ant-')
    expect(file?.numberedContent).not.toContain('sk-ant-')
    expect(file?.content).toContain('[REDACTED]')
    expect(context.maskedSecrets).toBe(1)
  })

  it('enforces the max file limit and records exclusions', async () => {
    for (let index = 0; index < 5; index += 1)
      await write(`feature/file-${index}.ts`, `export const value${index} = ${index}\n`)
    const context = await collectContext({
      rootPath: root,
      selectionPath: path.join(root, 'feature'),
      limits: { maxFiles: 2 },
    })
    expect(context.files).toHaveLength(2)
    expect(context.excludedFiles.length).toBeGreaterThanOrEqual(3)
  })

  it('truncates files over the per-file character budget', async () => {
    await write('src/big.ts', `const filler = "${'x'.repeat(500)}"\n`)
    const context = await collectContext({
      rootPath: root,
      selectionPath: path.join(root, 'src/big.ts'),
      limits: { maxCharsPerFile: 100 },
    })
    expect(context.files[0]?.truncated).toBe(true)
    expect(context.truncatedFiles).toEqual(['src/big.ts'])
    expect(context.files[0]?.content.length).toBe(100)
  })

  it('throws for empty files', async () => {
    await write('src/empty.ts', '   \n')
    await expect(
      collectContext({ rootPath: root, selectionPath: path.join(root, 'src/empty.ts') }),
    ).rejects.toThrow(GizmoError)
  })

  it('throws for unsupported file types', async () => {
    await write('notes.md', '# notes\n')
    await expect(
      collectContext({ rootPath: root, selectionPath: path.join(root, 'notes.md') }),
    ).rejects.toThrow(GizmoError)
  })

  it('follows a route file re-export to its implementation via alias imports', async () => {
    await write(
      'app/capture/scan.tsx',
      "export { ScanScreen as default } from '@/screens/capture/scan-screen'\n",
    )
    await write('screens/capture/scan-screen.tsx', 'export function ScanScreen() { return null }\n')
    const context = await collectContext({
      rootPath: root,
      selectionPath: path.join(root, 'app/capture/scan.tsx'),
      limits: { maxImportDepth: 1 },
    })
    const paths = context.files.map((file) => file.relativePath)
    expect(paths).toContain('app/capture/scan.tsx')
    expect(paths).toContain('screens/capture/scan-screen.tsx')
  })

  it('collects multiple selected files and labels the selection', async () => {
    await write('src/camera.tsx', 'export const Camera = () => null\n')
    await write('src/results.tsx', 'export const Results = () => null\n')
    const context = await collectContext({
      rootPath: root,
      selectionPaths: [path.join(root, 'src/camera.tsx'), path.join(root, 'src/results.tsx')],
    })
    expect(context.files.map((file) => file.relativePath)).toEqual([
      'src/camera.tsx',
      'src/results.tsx',
    ])
    expect(context.selectionLabel).toBe('src/camera.tsx +1 more')
  })

  it('skips unsupported files in a multi-selection instead of failing', async () => {
    await write('src/app.ts', 'export const app = true\n')
    await write('notes.md', '# notes\n')
    const context = await collectContext({
      rootPath: root,
      selectionPaths: [path.join(root, 'src/app.ts'), path.join(root, 'notes.md')],
    })
    expect(context.files.map((file) => file.relativePath)).toEqual(['src/app.ts'])
    expect(context.excludedFiles).toContain('notes.md')
  })

  it('throws for a missing selection', async () => {
    await expect(
      collectContext({ rootPath: root, selectionPath: path.join(root, 'nope.ts') }),
    ).rejects.toThrow(GizmoError)
  })
})

describe('addLineNumbers', () => {
  it('pads line numbers consistently', () => {
    expect(addLineNumbers('a\nb')).toBe('   1| a\n   2| b')
  })
})

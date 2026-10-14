import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickRecentFiles, recentChangesQuestion } from '../src/commands/scan-recent'

// scan-recent also wires into the editor; these tests only use its file picker.
vi.mock('vscode', () => ({}))

let root: string
const day = 24 * 60 * 60 * 1000
const now = Date.parse('2026-10-14T12:00:00Z')

async function write(relativePath: string, daysAgo: number): Promise<void> {
  const fullPath = path.join(root, relativePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, 'export const x = 1\n', 'utf8')
  const time = new Date(now - daysAgo * day)
  await fs.utimes(fullPath, time, time)
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-recent-'))
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('pickRecentFiles', () => {
  it('without git, keeps only files changed in the last week, newest first', async () => {
    await write('a.ts', 1)
    await write('b.ts', 3)
    await write('old.ts', 30)
    const picked = await pickRecentFiles({
      rootPath: root,
      files: ['a.ts', 'b.ts', 'old.ts'],
      limit: 6,
      requireRecentDate: true,
      now,
    })
    expect(picked).toEqual(['a.ts', 'b.ts'])
  })

  it('with git, trusts the change list even when the file date is older', async () => {
    await write('committed.ts', 30)
    const picked = await pickRecentFiles({
      rootPath: root,
      files: ['committed.ts'],
      limit: 6,
      requireRecentDate: false,
      now,
    })
    expect(picked).toEqual(['committed.ts'])
  })

  it('skips deleted files and stops at one scan worth of files', async () => {
    for (const name of ['1', '2', '3']) await write(`${name}.ts`, 1)
    const picked = await pickRecentFiles({
      rootPath: root,
      files: ['1.ts', '2.ts', '3.ts', 'deleted.ts'],
      limit: 2,
      requireRecentDate: true,
      now,
    })
    expect(picked).toHaveLength(2)
    expect(picked).not.toContain('deleted.ts')
  })
})

describe('recentChangesQuestion', () => {
  it('tells Gizmo when it only sees the newest part of a big week', () => {
    const question = recentChangesQuestion({ scanned: 6, changed: 424 })
    expect(question).toContain('6 most recently changed of 424 files')
  })

  it('says nothing extra when every changed file fits', () => {
    expect(recentChangesQuestion({ scanned: 3, changed: 3 })).not.toContain('most recently changed')
  })
})

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fitToScan } from '../src/analysis/fit-to-scan'

let root: string

async function write(relativePath: string, size: number): Promise<void> {
  await fs.writeFile(path.join(root, relativePath), 'x'.repeat(size), 'utf8')
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'gizmo-fit-'))
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('fitToScan', () => {
  const limits = { maxFiles: 6, maxTotalChars: 1000 }

  it('keeps files in order until the next one would outgrow one scan', async () => {
    await write('a.ts', 400)
    await write('b.ts', 400)
    await write('c.ts', 400)
    expect(
      await fitToScan({ rootPath: root, relativePaths: ['a.ts', 'b.ts', 'c.ts'], limits }),
    ).toEqual(['a.ts', 'b.ts'])
  })

  it('still fills the space with a later, smaller file', async () => {
    await write('a.ts', 700)
    await write('big.ts', 600)
    await write('small.ts', 200)
    expect(
      await fitToScan({ rootPath: root, relativePaths: ['a.ts', 'big.ts', 'small.ts'], limits }),
    ).toEqual(['a.ts', 'small.ts'])
  })

  it('always keeps the first file, even when it alone is too big', async () => {
    await write('huge.ts', 5000)
    await write('b.ts', 10)
    expect(await fitToScan({ rootPath: root, relativePaths: ['huge.ts', 'b.ts'], limits })).toEqual(
      ['huge.ts'],
    )
  })

  it('stops at the file limit', async () => {
    for (const name of ['1', '2', '3']) await write(`${name}.ts`, 10)
    expect(
      await fitToScan({
        rootPath: root,
        relativePaths: ['1.ts', '2.ts', '3.ts'],
        limits: { maxFiles: 2, maxTotalChars: 1000 },
      }),
    ).toEqual(['1.ts', '2.ts'])
  })
})

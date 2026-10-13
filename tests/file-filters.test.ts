import { describe, expect, it } from 'vitest'
import {
  createGitignoreMatcher,
  filePriority,
  isIgnoredDirectory,
  isSecretFile,
  isSupportedSourceFile,
} from '../src/analysis/file-filters'

describe('isSupportedSourceFile', () => {
  it('accepts supported extensions', () => {
    for (const file of ['a.ts', 'b.tsx', 'c.js', 'd.jsx', 'e.mjs', 'f.cjs'])
      expect(isSupportedSourceFile(file)).toBe(true)
  })

  it('rejects unsupported extensions', () => {
    for (const file of ['a.py', 'b.css', 'c.json', 'd.md', 'e.png'])
      expect(isSupportedSourceFile(file)).toBe(false)
  })

  it('rejects env files even with a supported-looking name', () => {
    expect(isSupportedSourceFile('.env')).toBe(false)
    expect(isSupportedSourceFile('.env.local')).toBe(false)
  })
})

describe('isSecretFile', () => {
  it('flags env and key files', () => {
    for (const file of [
      '.env',
      '.env.production',
      'server.pem',
      'signing.key',
      'aws-credentials.ts',
    ])
      expect(isSecretFile(file)).toBe(true)
  })

  it('allows normal source files', () => {
    expect(isSecretFile('patient-card.tsx')).toBe(false)
    expect(isSecretFile('use-auth.ts')).toBe(false)
  })
})

describe('isIgnoredDirectory', () => {
  it('ignores node_modules and build output', () => {
    for (const dir of ['node_modules', 'dist', 'build', '.next', '.git'])
      expect(isIgnoredDirectory(dir)).toBe(true)
  })

  it('keeps ordinary source directories', () => {
    expect(isIgnoredDirectory('src')).toBe(false)
    expect(isIgnoredDirectory('components')).toBe(false)
  })
})

describe('createGitignoreMatcher', () => {
  it('matches directory rules anywhere in the tree', () => {
    const matcher = createGitignoreMatcher('generated/\n*.snap\n# comment\n')
    expect(matcher.isIgnored('src/generated/api.ts')).toBe(true)
    expect(matcher.isIgnored('tests/button.test.ts.snap')).toBe(true)
    expect(matcher.isIgnored('src/components/button.tsx')).toBe(false)
  })
})

describe('filePriority', () => {
  it('ranks index and screen files before generic files', () => {
    expect(filePriority('src/index.ts')).toBeLessThan(filePriority('src/misc-helpers.ts'))
    expect(filePriority('src/screens/home.tsx')).toBeLessThan(filePriority('src/misc-helpers.ts'))
  })
})

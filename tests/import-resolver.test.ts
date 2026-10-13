import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  extractImportSpecifiers,
  resolveImportWithAliases,
  resolveLocalImport,
} from '../src/analysis/import-resolver'

describe('extractImportSpecifiers', () => {
  it('finds static, dynamic, re-export, and require imports', () => {
    const source = `
import React from 'react'
import { Button } from './button'
import type { User } from '../types/user'
export { helper } from './helper'
const lazy = import('./lazy-view')
const legacy = require('./legacy')
`
    const specifiers = extractImportSpecifiers(source)
    expect(specifiers).toContain('react')
    expect(specifiers).toContain('./button')
    expect(specifiers).toContain('../types/user')
    expect(specifiers).toContain('./helper')
    expect(specifiers).toContain('./lazy-view')
    expect(specifiers).toContain('./legacy')
  })
})

describe('resolveLocalImport', () => {
  const from = path.join('/project', 'src', 'app.ts')
  const files = new Set([
    path.join('/project', 'src', 'button.tsx'),
    path.join('/project', 'src', 'utils', 'index.ts'),
  ])
  const exists = (candidate: string) => files.has(candidate)

  it('resolves extensionless relative imports', () => {
    expect(resolveLocalImport(from, './button', { exists })).toBe(
      path.join('/project', 'src', 'button.tsx'),
    )
  })

  it('resolves directory imports to index files', () => {
    expect(resolveLocalImport(from, './utils', { exists })).toBe(
      path.join('/project', 'src', 'utils', 'index.ts'),
    )
  })

  it('ignores package imports', () => {
    expect(resolveLocalImport(from, 'react', { exists })).toBeUndefined()
  })

  it('returns undefined for unresolvable paths', () => {
    expect(resolveLocalImport(from, './missing', { exists })).toBeUndefined()
  })
})

describe('resolveImportWithAliases', () => {
  const root = '/project'
  const from = path.join(root, 'app', 'scan.tsx')
  const files = new Set([
    path.join(root, 'screens', 'scan-screen.tsx'),
    path.join(root, 'src', 'hooks', 'use-camera.ts'),
    path.join(root, 'app', 'local.ts'),
  ])
  const exists = (candidate: string) => files.has(candidate)

  it('resolves @/ aliases against the workspace root', () => {
    expect(resolveImportWithAliases(root, from, '@/screens/scan-screen', { exists })).toBe(
      path.join(root, 'screens', 'scan-screen.tsx'),
    )
  })

  it('falls back to the src directory for aliases', () => {
    expect(resolveImportWithAliases(root, from, '@/hooks/use-camera', { exists })).toBe(
      path.join(root, 'src', 'hooks', 'use-camera.ts'),
    )
  })

  it('still resolves relative imports', () => {
    expect(resolveImportWithAliases(root, from, './local', { exists })).toBe(
      path.join(root, 'app', 'local.ts'),
    )
  })

  it('ignores package imports', () => {
    expect(resolveImportWithAliases(root, from, 'react', { exists })).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { productAnalysisSchema } from '../src/analysis/schemas'
import { exportToMarkdown } from '../src/export/markdown-exporter'
import { buildAnalysisPrompt } from '../src/analysis/prompt-builder'
import { buildProductInventory, pickProductScanFiles } from '../src/discovery/product-inventory'
import type { AnalysisContext } from '../src/analysis/types'
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
    entry({ relativePath: 'navigation/root-stack.tsx', kind: 'navigation', featureArea: 'root' }),
    entry({ relativePath: 'app/scan.tsx', kind: 'route', featureArea: 'capture' }),
    entry({
      relativePath: 'screens/capture/scan-screen.tsx',
      kind: 'screen',
      featureArea: 'capture',
      components: ['ScanScreen'],
      routeRefs: ['Results'],
    }),
    entry({
      relativePath: 'services/upload-service.ts',
      kind: 'service',
      featureArea: 'services',
      hasApiCalls: true,
    }),
    entry({ relativePath: 'components/button.tsx', kind: 'component', featureArea: 'components' }),
  ],
}

describe('review schema', () => {
  it('accepts completion status, risk level, and whats working', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'Camera Upload',
      summary: 'Uploads captured images.',
      confidence: 'high',
      completionStatus: 'mostly-complete',
      riskLevel: 'medium',
      whatsWorking: [{ text: 'Camera opens', confidence: 'confirmed', evidence: [] }],
    })
    expect(analysis.completionStatus).toBe('mostly-complete')
    expect(analysis.riskLevel).toBe('medium')
    expect(analysis.whatsWorking[0]?.text).toBe('Camera opens')
  })

  it('defaults review fields for older responses', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'X',
      summary: 'Y',
      confidence: 'low',
    })
    expect(analysis.completionStatus).toBe('in-progress')
    expect(analysis.riskLevel).toBe('medium')
    expect(analysis.whatsWorking).toEqual([])
  })

  it('accepts team-provided confidence on findings', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'X',
      summary: 'Y',
      confidence: 'high',
      businessRules: [{ text: 'Shipping without offline mode', confidence: 'team', evidence: [] }],
    })
    expect(analysis.businessRules[0]?.confidence).toBe('team')
  })
})

describe('role perspectives', () => {
  it('parses role-specific perspectives', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'Camera Upload',
      summary: 'Uploads captured images.',
      confidence: 'high',
      perspectives: {
        designer: {
          painPoints: [{ text: 'No feedback after tapping upload', confidence: 'confirmed' }],
          designSystem: [{ text: 'Hardcoded #FF6600 instead of a token', confidence: 'confirmed' }],
        },
        pm: {
          valueProposition: 'Instant animal identification from a photo.',
          sellingPoints: [{ text: 'Identification works end to end', confidence: 'confirmed' }],
          mvpMustFix: [{ text: 'Handle upload failures', confidence: 'confirmed' }],
          analytics: [{ text: 'No tracking of identification success rate', confidence: 'likely' }],
        },
        stakeholder: {
          launchSummary: 'Camera capture and identification are working.',
          launchGoal: 'Let users identify animals in the wild.',
          launchBlockers: [{ text: 'Upload failures show nothing', confidence: 'confirmed' }],
        },
      },
    })
    expect(analysis.perspectives.designer.painPoints).toHaveLength(1)
    expect(analysis.perspectives.pm.valueProposition).toContain('Instant')
    expect(analysis.perspectives.stakeholder.launchBlockers[0]?.text).toContain('Upload failures')
  })

  it('defaults perspectives for older responses', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'X',
      summary: 'Y',
      confidence: 'low',
    })
    expect(analysis.perspectives.designer.painPoints).toEqual([])
    expect(analysis.perspectives.pm.valueProposition).toBe('')
    expect(analysis.perspectives.stakeholder.launchBlockers).toEqual([])
  })

  it('exports perspective sections in the brief', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'Camera Upload',
      summary: 'Uploads captured images.',
      confidence: 'high',
      perspectives: {
        designer: { designSystem: [{ text: 'Hardcoded color', confidence: 'confirmed' }] },
        pm: { valueProposition: 'Instant identification.' },
        stakeholder: { launchSummary: 'Nearly ready.', launchGoal: 'Grow retention.' },
      },
    })
    const markdown = exportToMarkdown(analysis)
    expect(markdown).toContain('## Design system & visual consistency (Designer)')
    expect(markdown).toContain('## Positioning (PM)')
    expect(markdown).toContain('## Launch overview (Stakeholder)')
    expect(markdown).toContain('**Goal of this launch:** Grow retention.')
  })
})

describe('brief export with review fields', () => {
  it('leads with status, risk, and confidence', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'Camera Upload',
      summary: 'Uploads captured images.',
      confidence: 'high',
      completionStatus: 'mostly-complete',
      riskLevel: 'medium',
      whatsWorking: [{ text: 'Upload succeeds', confidence: 'confirmed', evidence: [] }],
    })
    const markdown = exportToMarkdown(analysis)
    expect(markdown).toContain(
      '**Status:** Mostly complete · **Risk:** Medium · **Confidence:** High',
    )
    expect(markdown).toContain("## What's working")
    expect(markdown).toContain('Upload succeeds')
  })
})

describe('team notes and inventory in prompts', () => {
  const baseContext: AnalysisContext = {
    rootPath: '/project',
    selectionLabel: 'screens/scan.tsx',
    files: [
      {
        relativePath: 'screens/scan.tsx',
        content: 'export const Scan = () => null',
        numberedContent: '   1| export const Scan = () => null',
        truncated: false,
        reason: 'selected',
      },
    ],
    excludedFiles: [],
    truncatedFiles: [],
    totalChars: 30,
  }

  it('includes the product inventory for full scans', () => {
    const prompt = buildAnalysisPrompt({
      ...baseContext,
      productInventory: 'Project inventory: 5 source files.',
    })
    expect(prompt).toContain('Project inventory: 5 source files.')
    expect(prompt).toContain('do not invent behavior')
  })
})

describe('product inventory', () => {
  it('summarizes structure without source code', () => {
    const inventory = buildProductInventory(map)
    expect(inventory).toContain('Project inventory: 5 source files.')
    expect(inventory).toContain('Feature area "capture"')
    expect(inventory).toContain('screens/capture/scan-screen.tsx [screen]')
    expect(inventory).toContain('navigates to: Results')
    expect(inventory).not.toContain('export const')
  })

  it('picks navigation, routes, and screens first for scans', () => {
    const picked = pickProductScanFiles(map, 3)
    expect(picked).toEqual([
      'navigation/root-stack.tsx',
      'app/scan.tsx',
      'screens/capture/scan-screen.tsx',
    ])
  })
})

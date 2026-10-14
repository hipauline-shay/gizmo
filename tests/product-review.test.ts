import { describe, expect, it } from 'vitest'
import { productAnalysisSchema } from '../src/analysis/schemas'
import { exportToMarkdown } from '../src/export/markdown-exporter'
import {
  buildAnalysisPrompt,
  buildCombinedSummaryPrompt,
  buildFollowUpPrompt,
} from '../src/analysis/prompt-builder'
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
  it('keeps only the sections the panel shows', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'Camera Upload',
      summary: 'Uploads captured images.',
      confidence: 'high',
      whatsWorking: [{ text: 'Camera opens', confidence: 'confirmed', evidence: [] }],
      userFlow: [{ step: 1, title: 'Open camera' }],
      businessRules: [{ text: 'Old section', confidence: 'confirmed', evidence: [] }],
    })
    expect(analysis.whatsWorking[0]?.text).toBe('Camera opens')
    expect(Object.keys(analysis)).not.toContain('userFlow')
    expect(Object.keys(analysis)).not.toContain('businessRules')
  })

  it('defaults every section for minimal responses', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'X',
      summary: 'Y',
      confidence: 'low',
    })
    expect(analysis.whatsWorking).toEqual([])
    expect(analysis.perspectives.pm.mvpMustFix).toEqual([])
    expect(analysis.perspectives.stakeholder.launchBlockers).toEqual([])
  })

  it('accepts team-provided confidence on findings', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'X',
      summary: 'Y',
      confidence: 'high',
      risks: [{ text: 'Shipping without offline mode', confidence: 'team', evidence: [] }],
    })
    expect(analysis.risks[0]?.confidence).toBe('team')
  })
})

describe('perspectives', () => {
  it('parses the designer, PM and stakeholder findings the panel shows', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'Camera Upload',
      summary: 'Uploads captured images.',
      confidence: 'high',
      perspectives: {
        designer: {
          designSystem: [{ text: 'Hardcoded #FF6600 instead of a token', confidence: 'confirmed' }],
        },
        pm: { mvpMustFix: [{ text: 'Handle upload failures', confidence: 'confirmed' }] },
        stakeholder: {
          launchSummary: 'Camera capture and identification are working.',
          launchGoal: 'Let users identify animals in the wild.',
          launchBlockers: [{ text: 'Upload failures show nothing', confidence: 'confirmed' }],
        },
      },
    })
    expect(analysis.perspectives.designer.designSystem).toHaveLength(1)
    expect(analysis.perspectives.pm.mvpMustFix[0]?.text).toBe('Handle upload failures')
    expect(analysis.perspectives.stakeholder.launchBlockers[0]?.text).toContain('Upload failures')
  })

  it('exports the launch overview and findings in the brief', () => {
    const analysis = productAnalysisSchema.parse({
      featureName: 'Camera Upload',
      summary: 'Uploads captured images.',
      confidence: 'high',
      whatsWorking: [{ text: 'Upload succeeds', confidence: 'confirmed', evidence: [] }],
      perspectives: {
        designer: { designSystem: [{ text: 'Hardcoded color', confidence: 'confirmed' }] },
        stakeholder: { launchSummary: 'Nearly ready.', launchGoal: 'Grow retention.' },
      },
    })
    const markdown = exportToMarkdown({ areas: [{ label: 'Camera', analysis }] })
    expect(markdown).toContain('# Camera Upload')
    expect(markdown).toContain('Nearly ready.')
    expect(markdown).toContain('**Goal of this launch:** Grow retention.')
    expect(markdown).toContain("## What's working")
    expect(markdown).toContain('## Design system')
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
    skippedSelectedFiles: [],
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

describe('prompts across areas', () => {
  const context: AnalysisContext = {
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
    skippedSelectedFiles: [],
  }
  const analysis = productAnalysisSchema.parse({
    featureName: 'Scan',
    summary: 'Scans.',
    confidence: 'high',
  })

  it('sends the code with a question about one area', () => {
    const prompt = buildFollowUpPrompt({
      areas: [{ label: 'Scan', analysis, context }],
      question: 'Ready?',
    })
    expect(prompt).toContain('export const Scan')
  })

  it('sends findings only, no code, for a question across several areas', () => {
    const prompt = buildFollowUpPrompt({
      areas: [
        { label: 'Scan', analysis, context },
        { label: 'Settings', analysis, context },
      ],
      question: 'Ready?',
    })
    expect(prompt).not.toContain('export const Scan')
    expect(prompt).toContain('=== AREA: Settings ===')
  })

  it('builds the combined summary from findings only', () => {
    const prompt = buildCombinedSummaryPrompt([
      { label: 'Scan', analysis },
      { label: 'Settings', analysis },
    ])
    expect(prompt).toContain('"area":"Settings"')
    expect(prompt).not.toContain('export const')
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

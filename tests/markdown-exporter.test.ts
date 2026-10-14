import { describe, expect, it } from 'vitest'
import { exportToMarkdown, formatEvidence } from '../src/export/markdown-exporter'
import { productAnalysisSchema } from '../src/analysis/schemas'

const analysis = productAnalysisSchema.parse({
  featureName: 'Checkout',
  summary: 'Lets users pay for their cart.',
  confidence: 'medium',
  states: [
    { name: 'Loading', status: 'implemented', description: 'Spinner shown', evidence: [] },
    { name: 'Empty', status: 'missing', description: 'No empty cart UI found', evidence: [] },
  ],
  risks: [
    {
      text: 'No retry on payment failure',
      confidence: 'likely',
      evidence: [{ file: 'src/checkout.tsx', startLine: 42, endLine: 58 }],
    },
  ],
  openQuestions: [{ text: 'Is tax handled server-side?', confidence: 'unclear', evidence: [] }],
  nextSteps: [
    {
      title: 'Add empty-cart state',
      detail: 'Users with no items see a blank screen.',
      userImpact: 'high',
      effort: 'low',
      required: false,
      evidence: [],
    },
    {
      title: 'Verify payment retry behavior',
      detail: 'Cannot be confirmed from the provided files.',
      userImpact: 'medium',
      effort: 'medium',
      required: true,
      evidence: [],
    },
  ],
  perspectives: {
    stakeholder: {
      launchBlockers: [
        { text: 'Payment errors show nothing', confidence: 'confirmed', evidence: [] },
      ],
    },
  },
})

const settings = productAnalysisSchema.parse({
  featureName: 'Settings',
  summary: 'Profile and notifications.',
  confidence: 'high',
  perspectives: {
    stakeholder: {
      launchBlockers: [
        { text: 'Delete account does nothing', confidence: 'confirmed', evidence: [] },
      ],
    },
  },
})

const meta = {
  selectionLabel: 'src/checkout',
  includedFiles: 3,
  excludedFiles: 1,
  truncatedFiles: 0,
  model: 'claude-opus-5-5',
}

describe('exportToMarkdown with one area', () => {
  const markdown = exportToMarkdown({ areas: [{ label: 'Checkout', analysis, meta }] })

  it('starts with the feature name heading', () => {
    expect(markdown.startsWith('# Checkout')).toBe(true)
  })

  it('includes the sections the panel shows', () => {
    for (const heading of [
      '## Summary',
      '## Recommended next steps',
      "## What's blocking release",
      '## Needs a decision',
      '## Open questions',
      '## UX states',
    ])
      expect(markdown).toContain(heading)
  })

  it('renders prioritized next steps with impact and effort', () => {
    expect(markdown).toContain('1. **Add empty-cart state** — High user impact · Low effort')
    expect(markdown).toContain(
      '2. **Verify payment retry behavior** — Required before the analysis can be considered complete',
    )
  })

  it('renders the state audit as a table', () => {
    expect(markdown).toContain('| State | Status | Explanation |')
    expect(markdown).toContain('| Empty | Missing | No empty cart UI found |')
  })

  it('cites evidence with file and line ranges', () => {
    expect(markdown).toContain('`src/checkout.tsx` lines 42–58')
  })

  it('omits sections with no findings', () => {
    expect(markdown).not.toContain('## Technical notes')
  })
})

describe('exportToMarkdown with several areas', () => {
  const markdown = exportToMarkdown({
    areas: [
      { label: 'Checkout', analysis, meta },
      { label: 'Settings', analysis: settings },
    ],
    combined: {
      summary: 'Checkout and settings are built; two bugs block launch.',
      launchGoal: 'Let people buy and manage their account.',
      nextSteps: [],
    },
  })

  it('leads with the combined summary and names every area', () => {
    expect(markdown.startsWith('# Gizmo report: Checkout, Settings')).toBe(true)
    expect(markdown).toContain('Checkout and settings are built; two bugs block launch.')
    expect(markdown).toContain('## Area: Checkout')
    expect(markdown).toContain('## Area: Settings')
  })

  it('labels each blocker with its area', () => {
    expect(markdown).toContain('- **Checkout:** Payment errors show nothing')
    expect(markdown).toContain('- **Settings:** Delete account does nothing')
  })
})

describe('formatEvidence', () => {
  it('formats a clickable-style reference', () => {
    expect(formatEvidence({ file: 'src/a.ts', startLine: 1, endLine: 3 })).toBe(
      '`src/a.ts` lines 1–3',
    )
  })
})

import { describe, expect, it } from 'vitest'
import { exportToMarkdown, formatEvidence } from '../src/export/markdown-exporter'
import { productAnalysisSchema } from '../src/analysis/schemas'

const analysis = productAnalysisSchema.parse({
  featureName: 'Checkout',
  summary: 'Lets users pay for their cart.',
  confidence: 'medium',
  evidenceSummary: 'Based on checkout-screen.tsx and payment-service.ts',
  userGoal: 'Complete a purchase',
  primaryActions: [
    {
      label: 'Pay now',
      behavior: 'Submits the order',
      evidence: [{ file: 'src/checkout.tsx', startLine: 42, endLine: 58 }],
    },
  ],
  userFlow: [
    { step: 1, title: 'Review cart', description: 'User reviews items.', confidence: 'confirmed' },
    { step: 2, title: 'Pay', description: 'User pays.', confidence: 'likely' },
  ],
  states: [
    { name: 'Loading', status: 'implemented', description: 'Spinner shown', evidence: [] },
    { name: 'Empty', status: 'missing', description: 'No empty cart UI found', evidence: [] },
  ],
  risks: [{ text: 'No retry on payment failure', confidence: 'likely', evidence: [] }],
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
})

describe('exportToMarkdown', () => {
  const markdown = exportToMarkdown(analysis, {
    selectionLabel: 'src/checkout',
    includedFiles: 3,
    excludedFiles: 1,
    truncatedFiles: 0,
    model: 'claude-opus-4-8',
  })

  it('starts with the feature name heading', () => {
    expect(markdown.startsWith('# Checkout')).toBe(true)
  })

  it('includes the required sections', () => {
    for (const heading of [
      '## Summary',
      '## User goal',
      '## Main actions',
      '## User flow',
      '## UX states',
      '## Risks',
      '## Open questions',
      '## Evidence',
    ])
      expect(markdown).toContain(heading)
  })

  it('renders prioritized next steps with impact and effort', () => {
    expect(markdown).toContain('## Recommended next steps')
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
    expect(markdown).not.toContain('## Permissions')
  })
})

describe('formatEvidence', () => {
  it('formats a clickable-style reference', () => {
    expect(formatEvidence({ file: 'src/a.ts', startLine: 1, endLine: 3 })).toBe(
      '`src/a.ts` lines 1–3',
    )
  })
})

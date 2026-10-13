import { describe, expect, it } from 'vitest'
import { parseGapAnalysisResponse } from '../src/analysis/response-parser'
import { exportTicketsToMarkdown } from '../src/export/markdown-exporter'
import { gapAnalysisSchema, productAnalysisSchema } from '../src/analysis/schemas'
import { GizmoError } from '../src/utilities/errors'

const validGapResponse = JSON.stringify({
  summary: 'Most of the spec is implemented; error handling is missing.',
  items: [
    {
      requirement: 'Users can play a recorded call',
      status: 'partial',
      explanation: 'A play button renders but has no handler.',
      evidence: [{ file: 'src/audio-player.tsx', startLine: 14, endLine: 16 }],
    },
    {
      requirement: 'Show an error if playback fails',
      status: 'missing',
      explanation: 'No error handling found.',
      evidence: [],
    },
    {
      requirement: 'Default title "Call" is always shown',
      status: 'not-specified',
      explanation: 'The component hardcodes a default title the spec never mentions.',
      evidence: [{ file: 'src/audio-player.tsx', startLine: 10, endLine: 13 }],
    },
  ],
})

describe('parseGapAnalysisResponse', () => {
  it('parses a valid gap analysis', () => {
    const result = parseGapAnalysisResponse(validGapResponse)
    expect(result.items).toHaveLength(3)
    expect(result.items[1]?.status).toBe('missing')
  })

  it('parses gap analysis wrapped in prose and fences', () => {
    const result = parseGapAnalysisResponse('```json\n' + validGapResponse + '\n```')
    expect(result.summary).toContain('error handling')
  })

  it('rejects invalid status values', () => {
    expect(() =>
      parseGapAnalysisResponse(
        JSON.stringify({
          summary: 'x',
          items: [{ requirement: 'r', status: 'maybe', explanation: 'e' }],
        }),
      ),
    ).toThrow(GizmoError)
  })

  it('rejects non-JSON responses', () => {
    expect(() => parseGapAnalysisResponse('cannot compare')).toThrow(GizmoError)
  })
})

describe('exportTicketsToMarkdown', () => {
  const analysis = productAnalysisSchema.parse({
    featureName: 'Audio Player',
    summary: 'Plays call recordings.',
    confidence: 'high',
    missingStates: [
      {
        text: 'No error state for playback failure',
        confidence: 'confirmed',
        evidence: [{ file: 'src/audio-player.tsx', startLine: 10, endLine: 19 }],
      },
    ],
    risks: [{ text: 'Play button does nothing', confidence: 'confirmed', evidence: [] }],
    openQuestions: [{ text: 'Should playback auto-stop?', confidence: 'unclear', evidence: [] }],
  })

  const comparison = gapAnalysisSchema.parse(JSON.parse(validGapResponse))
  const markdown = exportTicketsToMarkdown(analysis, undefined, comparison)

  it('creates one ticket block per finding', () => {
    expect(markdown).toContain(
      '## Ticket 1: Add missing state — No error state for playback failure',
    )
    expect(markdown).toContain('## Ticket 2: Mitigate risk — Play button does nothing')
    expect(markdown).toContain('## Ticket 3: Clarify — Should playback auto-stop?')
  })

  it('includes spec-gap tickets but skips built requirements', () => {
    expect(markdown).toContain('Complete partially built requirement')
    expect(markdown).toContain('Implement specified requirement')
    expect(markdown).toContain('Review unspecified behavior')
  })

  it('carries evidence into ticket blocks', () => {
    expect(markdown).toContain('`src/audio-player.tsx` lines 10–19')
  })

  it('reports when there is nothing to file', () => {
    const clean = productAnalysisSchema.parse({
      featureName: 'X',
      summary: 'Y',
      confidence: 'high',
    })
    expect(exportTicketsToMarkdown(clean)).toContain('No gaps, risks, concerns, or open questions')
  })
})

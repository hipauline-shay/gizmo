import { describe, expect, it } from 'vitest'
import { estimateCostUsd } from '../src/providers/pricing'
import { formatCostUsd } from '../src/shared/format-cost'

describe('estimateCostUsd', () => {
  it('prices Opus 5.5 at $4 in / $20 out per million tokens', () => {
    expect(
      estimateCostUsd('claude-opus-5-5', { inputTokens: 40_000, outputTokens: 5_000 }),
    ).toBeCloseTo(0.26)
  })

  it('prices other models from the same table', () => {
    expect(estimateCostUsd('claude-opus-4-8', { inputTokens: 1_000_000, outputTokens: 0 })).toBe(5)
    expect(estimateCostUsd('claude-haiku-4-5', { inputTokens: 0, outputTokens: 1_000_000 })).toBe(5)
  })

  it('returns undefined for unknown models instead of guessing', () => {
    expect(
      estimateCostUsd('some-future-model', { inputTokens: 10, outputTokens: 10 }),
    ).toBeUndefined()
  })

  it('costs nothing for zero tokens', () => {
    expect(estimateCostUsd('claude-opus-5-5', { inputTokens: 0, outputTokens: 0 })).toBe(0)
  })
})

describe('formatCostUsd', () => {
  it('shows tiny amounts as less than a cent', () => {
    expect(formatCostUsd(0)).toBe('less than 1¢')
    expect(formatCostUsd(0.004)).toBe('less than 1¢')
  })

  it('rounds to cents otherwise', () => {
    expect(formatCostUsd(0.01)).toBe('about $0.01')
    expect(formatCostUsd(0.256)).toBe('about $0.26')
    expect(formatCostUsd(1.5)).toBe('about $1.50')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { detectProviderFromKey, isProviderId } from '../src/shared/ai-providers'
import { createActiveProvider } from '../src/providers/active-provider'
import type { AIProvider } from '../src/providers/ai-provider'

describe('detectProviderFromKey', () => {
  it('tells an Anthropic key from an OpenAI key', () => {
    expect(detectProviderFromKey('sk-ant-api03-abc')).toBe('anthropic')
    expect(detectProviderFromKey('  sk-proj-abc  ')).toBe('openai')
    expect(detectProviderFromKey('sk-abc')).toBe('openai')
  })

  it('returns undefined for a key it cannot place, so Gizmo asks', () => {
    expect(detectProviderFromKey('AIzaSomething')).toBeUndefined()
    expect(detectProviderFromKey('')).toBeUndefined()
  })
})

describe('isProviderId', () => {
  it('accepts only the supported providers', () => {
    expect(isProviderId('anthropic')).toBe(true)
    expect(isProviderId('openai')).toBe(true)
    expect(isProviderId('gemini')).toBe(false)
    expect(isProviderId(undefined)).toBe(false)
  })
})

describe('createActiveProvider', () => {
  it('sends each request to the provider chosen at that moment', async () => {
    let active: 'anthropic' | 'openai' = 'anthropic'
    const anthropic = fakeProvider('anthropic')
    const openai = fakeProvider('openai')
    const provider = createActiveProvider({
      providers: { anthropic, openai },
      getActive: () => active,
    })

    await provider.askFollowUp([], 'first')
    active = 'openai'
    await provider.askFollowUp([], 'second')

    expect(anthropic.askFollowUp).toHaveBeenCalledWith([], 'first')
    expect(openai.askFollowUp).toHaveBeenCalledWith([], 'second')
    expect(provider.name).toBe('openai')
  })
})

function fakeProvider(name: string): AIProvider {
  return {
    name,
    analyze: vi.fn(),
    askFollowUp: vi.fn(async () => ({ answer: name })),
    summarizeAreas: vi.fn(),
    compareToSpec: vi.fn(),
  }
}

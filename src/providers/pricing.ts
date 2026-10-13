export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export function estimateCostUsd(model: string, usage: TokenUsage): number | undefined {
  const price = PRICE_PER_MILLION_TOKENS[model]
  if (!price) return undefined
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000
}

// Anthropic first-party API list prices in USD (claude-api skill, cached 2026-09-25).
// Unknown models return undefined so the panel shows no cost rather than a wrong one.
const PRICE_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'claude-fable-5-1': { input: 10, output: 50 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

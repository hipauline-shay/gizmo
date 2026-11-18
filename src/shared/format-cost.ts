import { providerInfo, type ProviderId } from './ai-providers'

export function formatCostUsd(usd: number): string {
  if (usd < 0.01) return 'less than 1¢'
  return `about $${usd.toFixed(2)}`
}

// Rough price of one area scan on the provider's default model, shown before a scan so nobody
// is surprised by the charge.
export function estimateScanCostUsd(sourceChars: number, provider: ProviderId): number {
  const { input, output } = providerInfo[provider].defaultRates
  const inputTokens = sourceChars / CHARS_PER_TOKEN + PROMPT_OVERHEAD_TOKENS
  return (inputTokens * input + TYPICAL_ANSWER_TOKENS * output) / 1_000_000
}

// Measured 10/14 on two real 60k-character Claude scans: ~33k input and ~10k output tokens each.
// OpenAI uses the same numbers until a paid test re-measures them.
const CHARS_PER_TOKEN = 2
const PROMPT_OVERHEAD_TOKENS = 3500
// Thinking plus the trimmed report; re-measure after changing the requested sections.
const TYPICAL_ANSWER_TOKENS = 10000

export function formatCostUsd(usd: number): string {
  if (usd < 0.01) return 'less than 1¢'
  return `about $${usd.toFixed(2)}`
}

// Rough price of one area scan on the default model (Claude Opus 5.5: $4 in / $20 out per
// million tokens), shown before a scan so nobody is surprised by the charge.
export function estimateScanCostUsd(sourceChars: number): number {
  const inputTokens = sourceChars / CHARS_PER_TOKEN + PROMPT_OVERHEAD_TOKENS
  return (inputTokens * 4 + TYPICAL_ANSWER_TOKENS * 20) / 1_000_000
}

// Measured 10/14 on two real 60k-character scans: ~33k input and ~10k output tokens each.
const CHARS_PER_TOKEN = 2
const PROMPT_OVERHEAD_TOKENS = 3500
// Thinking plus the trimmed report; re-measure after changing the requested sections.
const TYPICAL_ANSWER_TOKENS = 10000

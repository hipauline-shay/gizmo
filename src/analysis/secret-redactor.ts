// Masks values that look like credentials inside source text before it is sent to the AI.
// File-name filters catch .env and key files; this catches keys pasted into ordinary code.
export function redactSecrets(content: string): string {
  let redacted = content
  for (const pattern of TOKEN_PATTERNS) redacted = redacted.replace(pattern, REDACTED)
  redacted = redacted.replace(
    PRIVATE_KEY_BLOCK,
    `-----BEGIN PRIVATE KEY-----${REDACTED}-----END PRIVATE KEY-----`,
  )
  redacted = redacted.replace(
    ASSIGNED_SECRET,
    (_match, name: string, quote: string) => `${name}${quote}${REDACTED}${quote}`,
  )
  redacted = redacted.replace(QUOTED_LITERAL, (match, quote: string, value: string) =>
    looksLikeRandomSecret(value) ? `${quote}${REDACTED}${quote}` : match,
  )
  return redacted
}

// Catch-all for keys in formats we don't know: a long quoted string with no spaces that
// mixes letters and digits and reads as random (high entropy) is masked, whatever it is.
function looksLikeRandomSecret(value: string): boolean {
  if (value.length < MIN_RANDOM_LENGTH) return false
  if (/\s/.test(value)) return false
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return false
  if (UUID.test(value) || PATH_OR_URL.test(value)) return false
  if (HEX_ONLY.test(value)) return true
  return shannonEntropy(value) >= RANDOM_ENTROPY_BITS
}

function shannonEntropy(value: string): number {
  const counts = new Map<string, number>()
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1)
  let entropy = 0
  for (const count of counts.values()) {
    const p = count / value.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}

const MIN_RANDOM_LENGTH = 24
const RANDOM_ENTROPY_BITS = 4
const QUOTED_LITERAL = /(["'`])([^"'`\n]+)\1/g
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PATH_OR_URL = /^(?:\.{0,2}\/|https?:|www\.|[a-z]+:\/\/)/i
const HEX_ONLY = /^[0-9a-f]{32,}$/i

export function countRedactions(original: string, redacted: string): number {
  return occurrences(redacted, REDACTED) - occurrences(original, REDACTED)
}

function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1
}

export const REDACTED = '[REDACTED]'

const TOKEN_PATTERNS = [
  /\bsk-ant-[A-Za-z0-9_-]{20,}/g, // Anthropic
  /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}/g, // OpenAI
  /\b[sr]k_(?:live|test)_[A-Za-z0-9]{10,}/g, // Stripe secret / restricted keys
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\bAIza[0-9A-Za-z_-]{35}\b/g, // Google API key
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, // GitHub tokens
  /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWTs (incl. Supabase keys)
]

const PRIVATE_KEY_BLOCK =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g

// `apiKey: "…"`, `SECRET = '…'`, `password: "…"` — only when the value has no spaces,
// so UI strings like "Password must be 8 characters" are left alone.
const ASSIGNED_SECRET =
  /((?:api[_-]?key|secret|token|password|passwd|client[_-]?secret|access[_-]?key|private[_-]?key)["']?\s*[:=]\s*)(["'`])[^"'`\s]{8,}\2/gi

export const providerIds = ['anthropic', 'openai'] as const

export type ProviderId = (typeof providerIds)[number]

export interface ProviderInfo {
  company: string
  keyPageUrl: string
  keyPageLabel: string
  // Default model's list price in USD per million tokens, for the estimate shown before a scan.
  defaultRates: { input: number; output: number }
}

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (providerIds as readonly string[]).includes(value)
}

// Anthropic keys start with "sk-ant-"; OpenAI keys start with "sk-" (often "sk-proj-").
export function detectProviderFromKey(key: string): ProviderId | undefined {
  const trimmed = key.trim()
  if (trimmed.startsWith('sk-ant-')) return 'anthropic'
  if (trimmed.startsWith('sk-')) return 'openai'
  return undefined
}

export const providerInfo: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    company: 'Anthropic',
    keyPageUrl: 'https://console.anthropic.com/settings/keys',
    keyPageLabel: 'console.anthropic.com',
    defaultRates: { input: 4, output: 20 },
  },
  openai: {
    company: 'OpenAI',
    keyPageUrl: 'https://platform.openai.com/api-keys',
    keyPageLabel: 'platform.openai.com',
    defaultRates: { input: 2, output: 10 },
  },
}

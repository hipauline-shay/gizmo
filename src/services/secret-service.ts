import type * as vscode from 'vscode'
import type { ProviderId } from '../shared/ai-providers'

// The Anthropic id predates OpenAI support; keeping it means existing keys still work.
const apiKeySecretIds: Record<ProviderId, string> = {
  anthropic: 'gizmo.anthropic-api-key',
  openai: 'gizmo.openai-api-key',
}

export interface SecretService {
  getApiKey(provider: ProviderId): Promise<string | undefined>
  setApiKey(provider: ProviderId, value: string): Promise<void>
  clearApiKey(provider: ProviderId): Promise<void>
}

export function createSecretService(secrets: vscode.SecretStorage): SecretService {
  return {
    async getApiKey(provider) {
      const value = await secrets.get(apiKeySecretIds[provider])
      return value && value.trim().length > 0 ? value.trim() : undefined
    },
    async setApiKey(provider, value) {
      await secrets.store(apiKeySecretIds[provider], value.trim())
    },
    async clearApiKey(provider) {
      await secrets.delete(apiKeySecretIds[provider])
    },
  }
}

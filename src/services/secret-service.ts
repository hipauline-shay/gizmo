import type * as vscode from 'vscode'

const apiKeySecretId = 'gizmo.anthropic-api-key'

export interface SecretService {
  getApiKey(): Promise<string | undefined>
  setApiKey(value: string): Promise<void>
  clearApiKey(): Promise<void>
}

export function createSecretService(secrets: vscode.SecretStorage): SecretService {
  return {
    async getApiKey() {
      const value = await secrets.get(apiKeySecretId)
      return value && value.trim().length > 0 ? value.trim() : undefined
    },
    async setApiKey(value: string) {
      await secrets.store(apiKeySecretId, value.trim())
    },
    async clearApiKey() {
      await secrets.delete(apiKeySecretId)
    },
  }
}

import * as vscode from 'vscode'
import { readSettings } from './settings-service'
import { providerInfo, type ProviderId } from '../shared/ai-providers'

// Consent is per company: agreeing to send code to Anthropic says nothing about OpenAI.
// The Anthropic key predates OpenAI support, so earlier choices are kept.
const consentStateKeys: Record<ProviderId, string> = {
  anthropic: 'gizmo.privacyConsent',
  openai: 'gizmo.privacyConsent.openai',
}

export interface PrivacyConsentService {
  ensureConsent(): Promise<boolean>
}

export function createPrivacyConsentService(globalState: vscode.Memento): PrivacyConsentService {
  return {
    async ensureConsent(): Promise<boolean> {
      const settings = readSettings()
      const consentStateKey = consentStateKeys[settings.provider]
      const remembered = globalState.get<boolean>(consentStateKey, false)
      if (remembered || !settings.showPrivacyDisclosure) return true

      const choice = await vscode.window.showInformationMessage(
        disclosureFor(providerInfo[settings.provider].company),
        { modal: true },
        'Continue',
        'Continue and remember my choice',
      )
      if (choice === undefined) return false
      if (choice === 'Continue and remember my choice')
        await globalState.update(consentStateKey, true)
      return true
    },
  }
}

function disclosureFor(company: string): string {
  return `Gizmo sends the selected code (plus a little related code it imports) to ${company}, using your own API key, to write the review. .env and key files are never sent, and anything that looks like a secret inside code is masked first. Nothing else leaves your computer.`
}

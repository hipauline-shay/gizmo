import * as vscode from 'vscode'
import { readSettings } from './settings-service'

const consentStateKey = 'gizmo.privacyConsent'

export interface PrivacyConsentService {
  ensureConsent(): Promise<boolean>
}

const disclosure =
  'Gizmo sends the selected code (plus a little related code it imports) to Anthropic, using your own API key, to write the review. .env and key files are never sent, and anything that looks like a secret inside code is masked first. Nothing else leaves your computer.'

export function createPrivacyConsentService(globalState: vscode.Memento): PrivacyConsentService {
  return {
    async ensureConsent(): Promise<boolean> {
      const remembered = globalState.get<boolean>(consentStateKey, false)
      if (remembered || !readSettings().showPrivacyDisclosure) return true

      const choice = await vscode.window.showInformationMessage(
        disclosure,
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

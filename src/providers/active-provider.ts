import type { AIProvider } from './ai-provider'
import type { ProviderId } from '../shared/ai-providers'

interface ActiveProviderOptions {
  providers: Record<ProviderId, AIProvider>
  getActive: () => ProviderId
}

// Each request goes to whichever provider is chosen at that moment, so switching needs no reload.
export function createActiveProvider({ providers, getActive }: ActiveProviderOptions): AIProvider {
  const current = (): AIProvider => providers[getActive()]
  return {
    get name() {
      return current().name
    },
    analyze: (context) => current().analyze(context),
    askFollowUp: (areas, question) => current().askFollowUp(areas, question),
    summarizeAreas: (areas) => current().summarizeAreas(areas),
    compareToSpec: (context, analysis, spec) => current().compareToSpec(context, analysis, spec),
  }
}

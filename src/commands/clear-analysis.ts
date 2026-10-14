import type { AppServices } from '../app-services'

export function runClearAnalysis(services: AppServices): void {
  services.current.areas = []
  services.current.combined = undefined
  services.current.specComparisons = {}
  services.getPanel().replaceState({ status: 'empty', chat: [], isAsking: false })
}

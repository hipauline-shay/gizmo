import type { AppServices } from '../app-services'

export function runClearAnalysis(services: AppServices): void {
  services.current.result = undefined
  services.current.selectionPath = undefined
  services.current.selectionPaths = undefined
  services.current.flowQuestion = undefined
  services.current.specComparison = undefined
  services.getPanel().replaceState({ status: 'empty', chat: [], isAsking: false })
}

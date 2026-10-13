import type { AppServices } from '../app-services'

export function runOpenPanel(services: AppServices): void {
  const panel = services.getPanel()
  panel.reveal()
  panel.postState()
}

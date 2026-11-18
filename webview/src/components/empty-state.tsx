import { postMessage } from '../hooks/use-vscode'
import { MapStatusLine } from './map-status'
import { GizmoPose } from './gizmo-pose'
import { ApiKeySetup } from './api-key-setup'
import { AreaPicker } from './area-picker'
import type { MapStatus } from '../types/panel'
import { providerInfo, type ProviderId } from '../../../src/shared/ai-providers'

interface EmptyStateProps {
  mapStatus?: MapStatus
  hasApiKey?: boolean
  areaSuggestions?: string[]
  provider?: ProviderId
}

export const EmptyState = ({
  mapStatus,
  hasApiKey,
  areaSuggestions,
  provider = 'anthropic',
}: EmptyStateProps) => {
  return (
    <div className="centered-state">
      <GizmoPose mood="sleeping" size={120} />
      <h1 className="empty-title">Hi, I'm Gizmo.</h1>
      <p className="empty-copy">
        Tell me which screen or feature to look at. I'll check what's built, what's missing, and sum
        it up so you can share it with your team.
      </p>
      <p className="empty-note">
        Works with JavaScript and TypeScript projects: React, Next.js, React Native, Node.
      </p>
      {hasApiKey === false ? (
        <ApiKeySetup />
      ) : (
        <>
          <AreaPicker target="new" suggestions={areaSuggestions} provider={provider} />
          <MapStatusLine mapStatus={mapStatus} />
          <div className="empty-secondary">
            <button
              type="button"
              className="ghost-button"
              onClick={() => postMessage({ type: 'scanProduct' })}
            >
              Scan whole product
            </button>
          </div>
        </>
      )}
      <p className="privacy-note">
        Gizmo maps file relationships locally. Only the files selected for analysis are sent to{' '}
        {hasApiKey === false ? 'the AI company whose key you add' : providerInfo[provider].company},
        using your own API key.
      </p>
    </div>
  )
}

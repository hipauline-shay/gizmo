import { postMessage } from '../hooks/use-vscode'
import { providerIds, providerInfo } from '../../../src/shared/ai-providers'

export const ApiKeySetup = () => (
  <section className="key-setup" aria-label="Set up your API key">
    <h2 className="key-setup-title">First, give me a key (2 minutes)</h2>
    <p className="key-setup-copy">
      Gizmo is free. I run on your own API key from Anthropic (Claude) or OpenAI. Checking one
      screen or feature costs about 35 cents with Claude or about 20 cents with OpenAI, and I show
      the price before and after every scan.
    </p>
    <ol className="key-setup-steps">
      <li>
        <div className="key-setup-step">
          <span>Create a key at Anthropic or OpenAI (sign up free, add a little credit).</span>
          <div className="key-setup-links">
            {providerIds.map((provider) => (
              <button
                key={provider}
                type="button"
                className="ghost-button"
                onClick={() => postMessage({ type: 'openKeyPage', provider })}
              >
                Open {providerInfo[provider].keyPageLabel}
              </button>
            ))}
          </div>
        </div>
      </li>
      <li>
        <div className="key-setup-step">
          <span>Copy the key, then paste it here. I'll tell which company it's from.</span>
          <button
            type="button"
            className="primary-button"
            onClick={() => postMessage({ type: 'addApiKey' })}
          >
            Add my key
          </button>
        </div>
      </li>
      <li>
        <div className="key-setup-step">
          <span>Ask me about any screen or feature. That's it.</span>
        </div>
      </li>
    </ol>
    <p className="key-setup-note">
      Your key stays on this computer in secure storage. It's never shared or sent anywhere except
      the company it came from.
    </p>
  </section>
)

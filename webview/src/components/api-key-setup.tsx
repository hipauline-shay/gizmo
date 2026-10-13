import { postMessage } from '../hooks/use-vscode'

export const ApiKeySetup = () => (
  <section className="key-setup" aria-label="Set up your Anthropic API key">
    <h2 className="key-setup-title">First, give me a key (2 minutes)</h2>
    <p className="key-setup-copy">
      Gizmo is free. I use Claude to read your code, so I run on your own Anthropic API key. A scan
      costs cents, not dollars, and I show the cost after every run.
    </p>
    <ol className="key-setup-steps">
      <li>
        <div className="key-setup-step">
          <span>Create a key at Anthropic (sign up free, add a little credit).</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => postMessage({ type: 'openAnthropicConsole' })}
          >
            Open console.anthropic.com
          </button>
        </div>
      </li>
      <li>
        <div className="key-setup-step">
          <span>Copy the key, then paste it here.</span>
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
      Anthropic.
    </p>
  </section>
)

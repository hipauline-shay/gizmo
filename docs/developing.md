# Developing and publishing Gizmo

Internal notes for working on Gizmo. Not part of the published extension.

## Setup (from source)

Requirements: VS Code 1.104+ (or a recent Cursor), Node.js 20+, an [Anthropic API key](https://platform.claude.com/).

```bash
npm install
npm run build
```

### Run the Extension Development Host

1. Open this folder in VS Code
2. Press `F5` (or Run → "Run Gizmo Extension") — this builds the extension and webview, then launches a second VS Code window with Gizmo loaded
3. In that window, open any React/Next.js project and right-click a source file → **Gizmo: Explain as Product**

### Configure the Anthropic key

Run **Gizmo: Configure AI Provider** from the Command Palette and paste your API key. The key is stored in VS Code **SecretStorage** (your OS keychain) — never in settings, source files, or logs. You will also be prompted automatically the first time an analysis needs a key.

## Development commands

```bash
npm run build          # bundle extension (esbuild) + webview (vite)
npm run watch:extension
npm run type-check     # tsc for extension and webview
npm run lint           # eslint
npm run format         # prettier
npm run test           # vitest unit tests
```

## Package the VSIX

```bash
npm run package
```

This produces `gizmo-<version>.vsix`. Install it via Extensions panel → “…” → *Install from VSIX*, or:

```bash
code --install-extension gizmo-1.0.0.vsix
```

## Publishing to the VS Code Marketplace

One-time setup (requires a Microsoft account):

1. Create a publisher at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage). If the name `gizmo` is taken, pick another and update the `publisher` field in `package.json`.
2. Create a Personal Access Token in [Azure DevOps](https://dev.azure.com) (Organization: *All accessible*, Scope: *Marketplace → Manage*).
3. Log in and publish:

```bash
npx vsce login <your-publisher-name>
npm run build
npx vsce publish
```

4. For Cursor users, also publish to [Open VSX](https://open-vsx.org): `npx ovsx publish gizmo-1.0.0.vsix -p <open-vsx-token>`.

Before publishing, put the code on GitHub and add a `"repository"` field to `package.json` — the Marketplace page links to it and users trust extensions with visible source. Add 2–3 screenshots of the panel to this README; that page is your landing page.

## Troubleshooting

- **"No Anthropic API key is configured"** — run *Gizmo: Configure AI Provider*.
- **"The AI provider rejected the API key"** — the key is invalid or revoked; re-enter it.
- **"This file type is not supported yet"** — select a `.ts/.tsx/.js/.jsx` file, or a folder containing them.
- **"The selection is too large"** — pick a smaller folder, or raise `gizmo.maxContextSize`.
- **The panel is blank** — make sure `npm run build` ran (the webview bundle lives in `media/webview/`); check the Gizmo output channel (View → Output → Gizmo).
- **Rate limits** — wait a minute; Anthropic rate limits are per-organization.

## Architecture (for contributors)

- `src/extension.ts` — activation and command registration
- `src/analysis/` — context collection, file filtering, import resolution, prompt building, Zod-validated response parsing
- `src/providers/` — `AIProvider` interface + `AnthropicProvider` (swap-in point for other providers)
- `src/services/` — SecretStorage, settings, privacy consent, logging
- `src/panel/` — webview panel host and message routing
- `webview/` — React UI built with Vite into `media/webview/`
- `tests/` — Vitest unit tests for the pure-logic modules

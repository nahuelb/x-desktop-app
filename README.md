# X Desktop App

A desktop client for X/Twitter with an AI-powered drafting sidebar. Built with Electron, React, and the Claude Agent SDK.

The app embeds X.com in a native window and adds a collapsible sidebar where you can draft tweets, compose replies with full thread context, and refine your writing — all powered by Claude.

<img src="assets/preview.jpg" alt="App Preview" width="680" />

## Features

- **Native X.com experience** — Full X.com loaded in an Electron window with persistent session
- **AI drafting sidebar** — Toggle a sidebar (`Cmd+S`) to draft posts and replies
- **Thread-aware replies** — Extracts tweet and thread context from the page so Claude can write relevant replies
- **Refine controls** — Improve, shorten, or lengthen drafts with one click
- **Copy & paste to compose box** — Send drafts directly into X's compose area
- **Ad-free feed** — Automatically hides promoted/ad tweets from your timeline
- **Writing style editor** — Customize the AI's voice and tone directly from the sidebar; define your audience, style rules, and reference posts
- **Model selection** — Choose from all available Claude models via a dropdown in the sidebar footer; your choice persists across sessions
- **Dark theme** — Matches X.com's dark mode aesthetic

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)
- [Claude Code](https://claude.ai/code) — The AI agent runs through the Claude Agent SDK, which requires a Claude Code subscription

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run in development

```bash
pnpm start
```

This launches the Electron app with hot reload via Vite.

### 3. Build for production

```bash
pnpm run make
```

This packages the app and creates a distributable installer. On macOS, it produces a `.app` bundle in `out/`.

### AI Agent

The agent uses the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) (`query()` API) to generate drafts. It runs through your local Claude Code installation — **a Claude Code subscription is required** for the agent to work. Without it, the sidebar will not be able to generate any content.

By default the agent uses `claude-sonnet-4-6`. You can switch to any available model (Opus, Haiku, etc.) using the model selector at the bottom of the sidebar — your choice is saved to `~/.config/x-app/settings.json` and persists across sessions.

The agent ships with a generic system prompt. To personalize it with your voice, click the **Style** button in the sidebar header — this opens a built-in editor where you can describe your audience, writing rules, and paste reference posts. Your style is saved to `~/.config/x-app/settings.json` and persists across sessions.

### Geo Proxy (optional)

If you need to route X.com traffic through a remote server (e.g. to change your location), the app includes a built-in SSH-based SOCKS5 proxy. When configured, it opens an SSH tunnel to your server and routes only the Twitter session through it — the rest of the app (sidebar, AI requests) is unaffected.

Click the connection indicator (top of the sidebar) to open the proxy settings panel, enter your SSH host and username, then click **Connect**. Settings are saved to `~/.config/x-app/settings.json` and persist across sessions and worktrees.

**SSH key setup is required.** The app authenticates via your local SSH agent — it does not support password authentication. Before connecting:

1. Generate an SSH key if you don't have one: `ssh-keygen -t ed25519`
2. Copy your public key to the remote server: `ssh-copy-id user@your-server`
3. Make sure your SSH agent is running and your key is loaded: `ssh-add`
4. Verify you can connect manually: `ssh user@your-server`

On macOS, the SSH agent runs automatically and keys in `~/.ssh/` are loaded on first use.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Run in development mode |
| `pnpm run make` | Build distributable app |
| `pnpm run package` | Package without creating installer |
| `pnpm run install-app` | Copy built `.app` to `/Applications` (macOS) |
| `pnpm run typecheck` | Type-check the project |
| `pnpm run check` | Lint check (Biome via Ultracite) |
| `pnpm run fix` | Auto-fix lint issues |

## Tech Stack

- **Electron** — Desktop shell
- **React 19** — Sidebar UI
- **Vite** — Build tooling (via Electron Forge)
- **Claude Agent SDK** — AI drafting
- **TypeScript** — Throughout
- **Biome** — Linting and formatting (via Ultracite)

## License

MIT

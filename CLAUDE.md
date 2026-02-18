# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm start              # Run the app in development (electron-forge start)
pnpm run package        # Package the app for distribution
pnpm run make           # Build distributable installers
pnpm run install-app    # Copy packaged app to /Applications (macOS, after `package`)
pnpm run typecheck      # Type-check without emitting
pnpm run check          # Lint/format check (Biome via Ultracite)
pnpm run fix            # Auto-fix lint/format issues
```

No test runner is configured.

## Environment

Uses pnpm as the package manager. Optional `.env` loaded from `~/.config/x-app/.env` (preferred) or project root (dev fallback).

App settings (model, SSH config) persist in `~/.config/x-app/settings.json`. Writing style customization via `WRITING_STYLE.md` in `~/.config/x-app/` or project root.

## Architecture

Electron desktop client that embeds X.com alongside a React-based AI drafting sidebar. Uses Electron Forge with Vite for building.

### Process Model

Three Vite entry points configured in `forge.config.ts`:

- **Main process** (`src/main/main.ts`) — Creates a `BaseWindow` with three `WebContentsView`s stacked side-by-side: `twitterView` (X.com with persistent session), `overlayView` (React drafting panel), and `titlebarView` (transparent drag region). `Cmd+Shift+D` toggles overlay visibility.
- **Preload** (`src/preload/overlay-preload.ts`) — Context bridge exposing `electronAPI` to the overlay renderer. All IPC channels defined in `src/shared/types.ts`.
- **Renderer** (`src/overlay/`) — React 19 app mounted in the right sidebar overlay.

### IPC Flow

Renderer calls `window.electronAPI.*` methods → preload forwards via `ipcRenderer.invoke` → main process handlers in `src/main/ipc-handlers.ts`. Streaming responses (draft/refine) push tokens back via `webContents.send` on channels `agent:stream-chunk`, `agent:stream-complete`, `agent:stream-error`.

### AI Agent (`src/main/agent.ts`)

Uses `@anthropic-ai/claude-agent-sdk` with `claude-sonnet-4-6`. Streams drafts, replies (with extracted tweet context), and refinements (resumes previous session). Budget capped at $0.05 per session, max 3 turns. The system prompt is generic by default; if a `WRITING_STYLE.md` file exists in `~/.config/x-app/` or the project root, it is appended at runtime to personalize the agent's voice.

### Tweet Extraction & Injection (`src/main/tweet-extractor.ts`)

Runs `executeJavaScript` on the twitterView to scrape tweet DOM (`article[data-testid="tweet"]`) and inject text into the compose box (`[data-testid="tweetTextarea_0"]`). These selectors are brittle and tied to X.com's current DOM structure.

### SSH Geo-Proxy (`src/main/geo-proxy.ts`)

Optional SOCKS5 proxy over SSH tunnel for routing twitterView traffic through a remote host. Configured via `SSH_HOST`/`SSH_USER` env vars or `settings.json`. Uses `ssh2` with agent-based auth (`SSH_AUTH_SOCK`). Auto-reconnects on network resume.

### Key Files

- `src/main/constants.ts` — System prompt, layout constants (`OVERLAY_WIDTH`, `TITLEBAR_HEIGHT`, etc.)
- `src/main/views.ts` — Creates and lays out the three `WebContentsView`s
- `src/main/window-state.ts` — Persists/restores window bounds across sessions
- `src/main/settings.ts` — Read/write `~/.config/x-app/settings.json`

### Path Alias

`@shared/*` → `src/shared/*` (configured in `tsconfig.json`)

## Design

Always use X/Twitter-inspired design. The sidebar should feel native to X.com.

- **Accent color:** `#1d9bf0` (X blue), not orange
- **Background:** Pure black `#000`, surfaces `rgba(255,255,255,0.03-0.06)`
- **Borders:** `#2f3336` (X's border color)
- **Text:** White `rgba(255,255,255,0.92)`, muted `rgba(255,255,255,0.45)`
- **Font:** System font stack, monospace for AI output
- **Buttons:** Minimal, borderless or subtle border, no heavy backgrounds
- **Tone:** Dark, minimal, no color overload — matches X's dark theme

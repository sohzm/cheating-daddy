# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cheating Daddy — Electron desktop app for real-time AI assistance during video calls, interviews, and presentations. Captures screen and audio, sends to AI (Google Gemini, Groq, Ollama, or cloud API), streams responses in an overlay window.

Model identifiers are hardcoded in `src/utils/gemini.js`: `gemini-3.1-flash-live-preview` (Live API) and `gemma-4-26b-a4b-it`. These break with 404 NOT_FOUND when Google retires a version (happened with `gemma-3-27b-it`) — update the strings in `gemini.js` AND `storage.js` (usage-tracking keys) together.

Fork of [sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy). Upstream PRs are cherry-picked; after merging, verify `npm install && npm start` still works.

## Commands

```bash
npm install          # Install dependencies
npm start            # Run in development (electron-forge start)
npm run package      # Package app (no installer)
npm run make         # Build platform installers (DMG/Squirrel/AppImage)
npx prettier --write .  # Format code (run before committing)
```

Prettier is not a declared dependency — `npx` resolves it from cache/global. No linting or automated tests exist; `npm run lint` is a no-op.

## Code Style

Prettier config (`.prettierrc`): 4-space indentation, 150 char width, semicolons, single quotes, trailing commas in ES5. `.prettierignore` excludes `src/assets` and `node_modules`.

## Architecture

### Process Model

**Main process** (`src/index.js`) — app lifecycle, window management, storage IPC handlers, AI session orchestration.

**Renderer process** — Lit web components loaded via `src/index.html`. Screen/audio capture happens here via `getDisplayMedia()` and Web Audio API.

**Preload** (`src/preload.js`) — minimal bridge. Note: context isolation is currently disabled (TODO to fix).

### Key Modules (Main Process — `src/utils/`)

| File | Responsibility |
|------|---------------|
| `gemini.js` | Google Gemini Live API integration, IPC handlers for AI sessions (~1140 lines) |
| `cloud.js` | WebSocket connection to `wss://api.cheatingdaddy.com/ws` |
| `localai.js` | Ollama local AI with Whisper transcription and VAD |
| `prompts.js` | System prompts for profiles (Interview, Sales, Business, Presentation, Negotiation) |
| `window.js` | Window creation (normal 1100x800, assistant 850x400), global shortcuts, keybind management |
| `renderer.js` | Renderer-side utilities: storage API wrapper, screen/audio capture, resampling (24kHz→16kHz) |

### UI Layer (`src/components/`)

Built with **Lit web components** (not React — migration planned). Lit is loaded from the bundled minified file `src/assets/lit-core-2.7.4.min.js`, not an npm dependency. Root: `src/components/app/CheatingDaddyApp.js` (app shell with sidebar + view routing) and `src/components/app/AppHeader.js`.

Views in `src/components/views/`: MainView (API key setup), OnboardingView, CustomizeView (settings), AICustomizeView (provider config), AssistantView (live overlay), HistoryView, FeedbackView, HelpView. Shared styles in `sharedPageStyles.js`.

### Storage (`src/storage.js`)

JSON file-based storage in platform config dirs (`~/Library/Application Support/cheating-daddy-config` on macOS). Stores: config, credentials (API keys), preferences, keybinds, session history, usage limits. Accessed via `storage:get-*` / `storage:set-*` IPC channels.

### Audio Pipeline

```
Display Media → Web Audio API (24kHz) → resample to 16kHz → VAD → buffer → AI provider
```

`src/audioUtils.js` — PCM↔WAV conversion, audio analysis, debug helpers. macOS uses `SystemAudioDump` native binary (in `src/assets/`) for system audio capture.

### IPC Communication

Main ↔ Renderer channels: `storage:*` (data ops), `view-changed` (resize window), `toggle-window-visibility`, `new-response`/`update-response` (streaming AI), `update-status`, `update-keybinds`, `clear-sensitive-data` (emergency erase via Cmd+Shift+E).

## Migration Direction

Aspirational, **not yet started** — the codebase is 100% JavaScript today. `AGENTS.md` describes a future move to TypeScript strict mode + React + shadcn/ui, but none of its scaffolding exists yet: no `tsconfig.json`/`jsconfig.json`, no `.ts/.tsx` files, no `src/components/ui/`, no `@/` path alias, and `npm run typecheck` is not defined. Don't import via `@/` or call `npm run typecheck` — set up the tooling first if you begin the migration.

## Build & Packaging

Electron Forge (`forge.config.js`). Native modules (onnxruntime, @huggingface/transformers, sharp) are unpacked from ASAR. Makers: DMG (macOS), Squirrel (Windows), AppImage (Linux). Code signing is disabled.

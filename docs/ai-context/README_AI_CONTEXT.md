# AI Context System - Cheating Daddy

> **Bootstrap Prompt:** Copy-paste this into a new AI session to restore project understanding:
>
> "Read `/docs/ai-context/README_AI_CONTEXT.md` and the context files in `/docs/ai-context/sessions/` before continuing implementation. This gives you the full project architecture, previous decisions, and current state."

---

## Project Overview

**Name:** Cheating Daddy  
**Type:** Electron desktop app (macOS/Windows/Linux)  
**Purpose:** Real-time AI assistant for live conversations (interviews, meetings, exams) — captures audio, transcribes, and generates AI responses  
**Stack:** Electron + Lit 2.7.4 (ES modules, no bundler) + Node.js (CommonJS main process)

---

## Architecture Summary

### Process Model
| Layer | Runtime | Module System | Key Files |
|-------|---------|---------------|-----------|
| Main process | Node.js | CommonJS | `src/index.js`, `src/storage.js`, `src/utils/apiKeys.js`, `src/utils/gemini.js` |
| Preload | Node.js | CommonJS | `src/preload.js` (mostly empty) |
| Renderer | Chromium | ES Modules | `src/utils/renderer.js`, `src/components/**/*.js` |

### IPC Pattern
- Main registers handlers via `ipcMain.handle('channel-name', async (event, ...args) => { ... })`
- Renderer calls via `ipcRenderer.invoke('channel-name', ...args)` wrapped in `src/utils/renderer.js`
- All IPC returns `{ success: boolean, data?, error? }`
- Renderer exposes everything through `window.cheatingDaddy` global object

### Storage
- Custom JSON-file storage (NOT electron-store)
- Location: OS-specific config dir (`~/Library/Application Support/cheating-daddy-config/` on macOS)
- Files: `config.json`, `credentials.json`, `preferences.json`, `keybinds.json`, `limits.json`, `history/*.json`

### UI Framework
- Lit 2.7.4 loaded from local vendored file (`src/assets/lit-core-2.7.4.min.js`)
- Shared styles in `src/components/views/sharedPageStyles.js`
- Views registered via `customElements.define()` at bottom of each file
- Root component: `<cheating-daddy-app>` in `CheatingDaddyApp.js`
- Navigation: `this.currentView` string property, rendered via `renderCurrentView()` switch

### Providers
| Provider | Purpose | Key Functions |
|----------|---------|---------------|
| Gemini | Live audio session, screen analysis, Gemma text | `initializeGeminiSession()`, `sendImageToGeminiHttp()`, `sendToGemma()` |
| Groq | Fast text completions | `sendToGroq()` |
| Cloud | Managed cloud service | `connectCloud()` |
| Local (Ollama) | Local LLM | `initializeLocalSession()` |

---

## Key Systems

### API Key Management (v2 - Multi-key with rotation)
- **Storage:** `credentials.json` → `geminiKeys[]` and `groqKeys[]` arrays
- **States:** `ready` | `exhausted` | `invalid` | `unknown`
- **Key fields:** `{ id, key, label, state, lastCheckedAt, exhaustedAt, exhaustedUntil, errorReason, createdAt }`
- **Rotation:** `withKeyRotation(provider, fn)` tries each ready key, marks failures, broadcasts switches
- **Validation:** Lightweight probes (Gemini: `models.list`, Groq: `GET /openai/v1/models`)
- **Recovery:** 24h cooldown, 5-min sweep checks for expired cooldowns
- **IPC channels:** `api-keys:list`, `api-keys:add`, `api-keys:remove`, `api-keys:revalidate`, `api-keys:revalidate-all`
- **Events:** `api-keys:updated` (state changes), `api-keys:rotated` (key switch notification)
- **UI:** `<api-keys-view>` — compact grid table, countdown timers, search/filter, rotation toasts

### Rate Limiting
- Per-model daily limits in `limits.json`
- `getAvailableModel()` for Gemini (flash/flash-lite rotation)
- `getModelForToday()` for Groq (char-based limits per model)

### Audio Capture
- macOS: SystemAudioDump binary + getDisplayMedia for screen
- Linux: getDisplayMedia with audio + optional mic
- Windows: Loopback audio + optional mic

---

## File Map (Key Files)

```
src/
├── index.js                    # Main process entry, IPC setup, app lifecycle
├── storage.js                  # JSON file storage, provider key pools
├── preload.js                  # Empty (nodeIntegration enabled)
├── index.html                  # Root HTML with CSS variables
├── utils/
│   ├── apiKeys.js              # Key validation, rotation, background revalidation
│   ├── gemini.js               # All AI provider logic, IPC handlers, audio capture
│   ├── renderer.js             # Renderer bridge (storage, apiKeys, theme, capture)
│   ├── cloud.js                # Cloud provider WebSocket
│   ├── localai.js              # Ollama local AI
│   ├── prompts.js              # System prompt generation
│   └── window.js               # Window creation, shortcuts
├── components/
│   ├── app/CheatingDaddyApp.js # Root Lit component, routing, sidebar
│   └── views/
│       ├── MainView.js         # Home screen (BYOK/local mode selection)
│       ├── ApiKeysView.js      # Multi-key management UI
│       ├── CustomizeView.js    # Settings (audio, language, theme, keybinds)
│       ├── AICustomizeView.js  # AI context/prompt customization
│       ├── AssistantView.js    # Live session view
│       ├── HistoryView.js      # Session history
│       ├── OnboardingView.js   # First-run onboarding
│       ├── HelpView.js         # Help documentation
│       ├── HotkeysView.js      # Hotkey configuration UI
│       └── sharedPageStyles.js # Shared CSS (surfaces, controls, forms)
└── assets/                     # Vendored libs, icons, audio binary
```

---

## Current TODOs / Known Issues

- [ ] MainView still has legacy single-key input fields (functional but could link to ApiKeysView)
- [ ] `sendImageToGeminiHttp` uses `getApiKey()` which resolves pool -> works, but could use explicit `withKeyRotation` for the live session init too
- [ ] No unit tests
- [ ] PR creation via GitHub API returns 422 (likely repo permission issue)
- [x] ~~FeedbackView.js removed~~ (was an embedded Google Form, no longer needed)

---

## Coding Conventions

- 4-space indent, single quotes, semicolons kept
- Prettier configured (`.prettierrc`)
- Main process: CommonJS (`require`/`module.exports`)
- Renderer: ES modules (`import`/`export`)
- Lit components: `static styles`, `static properties`, `constructor()`, methods, `render()`
- Component registration: `customElements.define('tag-name', ClassName)` at file bottom
- IPC handler pattern: `try { return { success: true, data }; } catch (error) { return { success: false, error: error.message }; }`

---

## Context Files Index

| File | Date | Summary |
|------|------|---------|
| `sessions/001-api-key-management.md` | 2025-05-11 | Full API key pool system implementation |
| `sessions/002-ui-features-hotkeys.md` | 2025-05-11 | Hotkeys, AI Hearing, settings UI, feedback removal |

---

*Last updated: 2026-05-11*

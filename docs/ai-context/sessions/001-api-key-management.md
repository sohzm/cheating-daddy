# Session 001: Multi-Key API Management System

**Date:** 2026-05-11  
**Branch:** `feature/api-key-management`  
**Status:** Implemented + Fixed

---

## Feature Summary

Added a complete multi-key API management system for both Gemini and Groq providers, with:

- Multiple API keys per provider (separate pools)
- State tracking: ready / exhausted / invalid / unknown
- Automatic key rotation on failure
- Background validation on app startup (non-blocking)
- 24h exhaustion cooldown with automatic recovery
- Manual revalidation ("Test" button)
- UI with countdown timers, search/filter, rotation notifications

---

## Architectural Decisions

### 1. Key Pool Storage Model

**Decision:** Store keys as arrays in `credentials.json` (`geminiKeys[]`, `groqKeys[]`)  
**Reasoning:** Simple JSON file storage already exists; arrays allow ordering (first ready = active). Legacy single-key fields (`apiKey`, `groqApiKey`) are mirrored from pool for backward compatibility.

### 2. Sanitized Entries for Renderer

**Decision:** Raw keys never leave main process. Renderer receives sanitized entries with masked key (`AIza…hX9k`).  
**Reasoning:** Security — even with nodeIntegration on, minimizes exposure surface.

### 3. withKeyRotation Pattern

**Decision:** Higher-order function that wraps any API call, tries each ready key in sequence.  
**Reasoning:** Avoids duplicating retry logic in every call site. Centralizes error classification and state transitions.

### 4. Error Classification

**Decision:** Three categories — `invalid` (401/403), `exhausted` (429/quota), `transient` (network/5xx).  
**Reasoning:** Only invalid/exhausted trigger state changes. Transient errors bubble up without marking the key bad.

### 5. handleKeyFailure vs handleResponseStatus

**Decision:** Added `handleKeyFailure(provider, id, statusCode, errorText)` that takes already-extracted values.  
**Reasoning:** The Groq streaming path consumes the response body before we can classify it. Can't clone/re-read a consumed stream.

### 6. Revalidation Interval

**Decision:** 5 minutes (was 1 hour).  
**Reasoning:** Users expect exhausted keys to recover promptly after 24h. Checking every 5min means max 5min delay after cooldown expires.

### 7. Countdown Persistence

**Decision:** `exhaustedUntil` is an absolute timestamp stored on disk.  
**Reasoning:** Survives app restart. UI computes `remaining = exhaustedUntil - Date.now()` client-side.

---

## Implementation Notes

### Files Modified

| File                                     | Changes                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/storage.js`                         | Added provider key pool CRUD, `exhaustedAt` field, migration logic                             |
| `src/utils/apiKeys.js`                   | **New file** — probes, classification, rotation, background validation                         |
| `src/index.js`                           | Added `setupApiKeysIpcHandlers()`, startup validation call                                     |
| `src/utils/renderer.js`                  | Added `cheatingDaddy.apiKeys` bridge object                                                    |
| `src/utils/gemini.js`                    | Wrapped `sendToGroq`/`sendToGemma`/`sendImageToGeminiHttp`/`initialize-gemini` in key rotation |
| `src/components/views/ApiKeysView.js`    | **New file** — full management UI                                                              |
| `src/components/app/CheatingDaddyApp.js` | Registered view + sidebar nav                                                                  |

### IPC Channels Added

- `api-keys:list` — list sanitized keys for provider
- `api-keys:list-all` — list all providers at once
- `api-keys:add` — add key (triggers async validation)
- `api-keys:remove` — remove key
- `api-keys:revalidate` — probe single key
- `api-keys:revalidate-all` — probe all keys for provider

### Events (main → renderer)

- `api-keys:updated` — `{ provider, keys[] }` — fired on any state change
- `api-keys:rotated` — `{ provider, from: {id,label}, to: {id,label} }` — fired on failover

---

## Bugs Fixed (v2)

1. **Revalidation marking exhausted keys as ready** — Now skips keys whose cooldown hasn't expired
2. **Response body consumed before classification** — Added `handleKeyFailure()` that takes status code + text
3. **No exhaustedAt timestamp** — Added to storage model and sanitized entry
4. **1h revalidation too slow** — Reduced to 5min
5. **No rotation notification** — Added `broadcastRotation()` + renderer toast
6. **UI not scalable** — Rebuilt with compact grid, search, sort, countdown

---

## Pending / Future Work

- MainView legacy key inputs could link to ApiKeysView or show pool summary
- Could add "set as primary" to manually reorder pool priority
- Could add key import/export (JSON)
- Could add per-key usage statistics
- Live session (`initialize-gemini`) could use full `withKeyRotation` pattern instead of manual loop

---

## Key Prompts/Workflows Used

### Adding a new IPC channel

1. Add handler in `src/index.js` → `setupApiKeysIpcHandlers()`
2. Add wrapper in `src/utils/renderer.js` → `apiKeys` object
3. Call from component via `cheatingDaddy.apiKeys.methodName()`

### Adding a new sidebar view

1. Create `src/components/views/MyView.js` (extend LitElement, use unifiedPageStyles)
2. Import in `CheatingDaddyApp.js`
3. Add `case 'my-view':` in `renderCurrentView()`
4. Add nav item to `items` array in `renderSidebar()`

### Testing a key state transition

The probe endpoints:

- Gemini: `GET https://generativelanguage.googleapis.com/v1beta/models?key=KEY`
- Groq: `GET https://api.groq.com/openai/v1/models` with Bearer auth

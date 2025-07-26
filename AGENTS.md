# Repo Guidelines

This repository is a fork of [`cheating-daddy`](https://github.com/sohzm/cheating-daddy).
It provides an Electron-based real‑time assistant which captures screen and audio
for contextual AI responses. The code is JavaScript and uses Electron Forge for
packaging.

## Getting started

Install dependencies and run the development app:

```
1. npm install
2. npm start
```

## Style

Run `npx prettier --write .` before committing. Prettier uses the settings in
`.prettierrc` (four-space indentation, print width 150, semicolons and single
quotes). `src/assets` and `node_modules` are ignored via `.prettierignore`.
The project does not provide linting; `npm run lint` simply prints
"No linting configured".

## Code standards

Development is gradually migrating toward a TypeScript/React codebase inspired by the
[transcriber](https://github.com/Gatecrashah/transcriber) project. Keep the following
rules in mind as new files are created:

- **TypeScript strict mode** – avoid `any` and prefer explicit interfaces.
- **React components** should be functional with hooks and wrapped in error
  boundaries where appropriate.
- **Secure IPC** – validate and sanitize all parameters crossing the renderer/main
  boundary.
- **Non‑blocking audio** – heavy processing must stay off the UI thread.
- **Tests** – every new feature requires tests once the test suite is available.

## Shadcn and Electron

The interface is being rebuilt with [shadcn/ui](https://ui.shadcn.com) components.
Follow these guidelines when working on UI code:

- **Component directory** – place generated files under `src/components/ui` and export them from that folder.
- **Add components with the CLI** – run `npx shadcn@latest add <component>`; never hand-roll components.
- **Component pattern** – use `React.forwardRef` with the `cn()` helper for class names.
- **Path aliases** – import modules from `src` using the `@/` prefix.
- **React 19 + Compiler** – target React 19 with the new compiler when available.
- **Context isolation** – maintain Electron's context isolation pattern for IPC.
- **TypeScript strict mode** – run `npm run typecheck` before claiming work complete.
- **Tailwind theming** – rely on CSS variables and utilities in `@/utils/tailwind` for styling.
- **Testing without running** – confirm `npm run typecheck` and module resolution with `node -e "require('<file>')"`.

## Tests

No automated tests yet. When a suite is added, run `npm test` before each
commit. Until then, at minimum ensure `npm install` and `npm start` work after
merging upstream changes.

## Merging upstream PRs

Pull requests from <https://github.com/sohzm/cheating-daddy> are commonly
cherry‑picked here. When merging:

1. Inspect the diff and keep commit messages short (`feat:` / `fix:` etc.).
2. After merging, run the application locally to verify it still builds and
   functions.

## Strategy and Future Work

We plan to extend this project with ideas from the
[`transcriber`](https://github.com/Gatecrashah/transcriber) project which also
uses Electron. Key goals are:

- **Local Transcription** – integrate `whisper.cpp` to allow offline speech-to-
  text. Investigate the architecture used in `transcriber/src/main` for model
  validation and GPU acceleration.
- **Dual Audio Capture** – capture microphone and system audio simultaneously.
  `transcriber` shows one approach using a native helper for macOS and
  Electron's `getDisplayMedia` for other platforms.
- **Speaker Diarization** – explore tinydiarize for identifying speakers in mono
  audio streams.
- **Voice Activity Detection** – skip silent or low‑quality segments before
  sending to the AI service.
- **Improved Note Handling** – store transcriptions locally and associate them
  with meeting notes, similar to `transcriber`'s note management system.
- **Testing Infrastructure** – adopt Jest and React Testing Library (if React is
  introduced) to cover audio capture and transcription modules.

### TODO

1. Research and prototype local transcription using `whisper.cpp`.
2. Add dual‑stream audio capture logic for cross‑platform support.
3. Investigate speaker diarization options and integrate when feasible.
4. Plan a migration path toward a proper testing setup (Jest or similar).
5. Document security considerations for audio storage and processing.
6. Rebuild the entire UI using shadcn components.

These plans are aspirational; implement them gradually while keeping the app
functional.

## Audio processing principles

When implementing transcription features borrow the following rules from
`transcriber`:

- **16 kHz compatibility** – resample all audio before sending to whisper.cpp.
- **Dual‑stream architecture** – capture microphone and system audio on separate
  channels.
- **Speaker diarization** – integrate tinydiarize (`--tinydiarize` flag) for mono
  audio and parse `[SPEAKER_TURN]` markers to label speakers (Speaker A, B, C…).
- **Voice activity detection** – pre‑filter silent segments to improve speed.
- **Quality preservation** – keep sample fidelity and avoid blocking the UI
  during heavy processing.
- **Memory efficiency** – stream large audio files instead of loading them all at
  once.
- **Error recovery** – handle audio device failures gracefully.

## Privacy by design

- **Local processing** – transcriptions should happen locally whenever possible.
- **User control** – provide clear options for data retention and deletion.
- **Transparency** – document what is stored and where.
- **Minimal data** – only persist what is required for functionality.

## LLM plans

There are placeholder files for future LLM integration (e.g. Qwen models via
`llama.cpp`). Continue development after the core transcription pipeline is
stable and ensure tests cover this new functionality.

<img src="/src/assets/logo.png" alt="uwu" width="200"/>

# Cheating Daddy

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

- **Dual Mode Support**: Interview Mode (with live audio) & Exam Assistant Mode (screenshot + text only)
- **Smart Model Selection**: Choose between Gemini 2.5 Flash and Gemini 2.5 Pro for better accuracy
- **Live AI Assistance**: Real-time help powered by Google Gemini Live API
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Multiple Profiles**: Interview, Exam Assistant, Sales Call, Business Meeting, Presentation, Negotiation
- **VAD Audio Detection**: Detects both speaker and interviewer audio (tested on Zoom and Google Meet)
- **Beautiful Code Formatting**: Clean markdown and syntax highlighting for code blocks
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when needed
- **Global Shortcuts**: Works even when app is not focused
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)

## What's New

### v0.5.4 (Latest)

#### Major Bug Fixes
- **Fixed window overhidden bug**: Resolved window getting hidden behind other Dekstop applications. 
- **Fixed window size increasing bug**: Window no longer expands when displaying long responses or code blocks

#### Features & Improvements
- **Enhanced Interview Response Quality**:
  - Adjusted prompts for more complete technical answers (2-4 sentences instead of strict 2-3)
  - Added "ALWAYS provide complete answers" principle to prevent fragmented responses
  - Responses now balance natural human tone with technical completeness
- **VAD (Voice Activity Detection) Improvements**:
  - Reduced silence threshold from 600ms to 300ms for faster response times
  - Reduced minimum recording time from 400ms to 300ms to catch quick questions
  - Better detection of speech vs silence
- **Added Model Selection Header**: Now displays which Gemini model is being used in the UI
- **Removed Microphone Mode**: Simplified to speaker-only mode (interviewer's audio) for better performance and token management
  - Removed microphone-only mode (candidate's voice)
  - Removed "both speaker & microphone" mode
  - Cleaned up all microphone-related code from UI and backend

#### Technical Changes
- Implemented `setupComplete` tracking for Live API session readiness
- Added session ready state checks before manual screenshot processing
- Improved manual screenshot prompt to handle various screen contexts intelligently
- Platform-specific window level configuration (Windows: `pop-up-menu`, macOS: `screen-saver`)
- Periodic window position maintenance to stay above UWP apps

### v0.5.3

#### Features & Improvements
- Added Dual Mode for OA or tests and Interview mode
- Model Based Selection between Gemini 2.5 Flash and Gemini 2.5 Pro for OA (Online Assessments) for better accuracy
- Interview Mode uses Gemini Live API for real-time audio interaction
- Fixed text prompt sending screenshot and text together (one combined response instead of two)
- Changed restart shortcut from Ctrl+G to Ctrl+Alt+R (works globally even when app not focused)
- Fixed window repositioning bug (window stays in place on restart)
- Fixed code block overflow causing window expansion
- Cleaner UI with removed duplicate shortcut hints
- Updated all documentation with new keyboard shortcuts

#### Technical Changes
- Improved screenshot + text handling for better AI responses
- Added global shortcut support for restart functionality
- Better CSS for code wrapping and display

#### Bug Fixes
- Window no longer moves to center/top on session restart
- Long code lines now wrap instead of expanding window
- Text prompts now send with screenshot context in single request

### v0.5.2

#### Features & Improvements
- Improved Default Interface & Stealth
- Removed Export & Conversation History Feature
- Fixed some Bugs and Issues.

### v0.5.1

#### Features & Improvements
- Added VAD audio detection for both speaker and Interviewer (tested in Zoom and Google Meet)
- Nice clean code markdown formatting styling blocks for better readability
- Fixed the bug for window increasing sizing when the responses window increases (mostly for coding answers)
- Added Restart response in case context gets too large
- Added copy button for the latest response (useful for coding answers incase you want to copy it)
- Adjusted prompting to give answers in more humanized way for job interviews
- In Exam Assistant mode it will not add unnecessary comments and will provide non-plagiarized, clean code

All features are properly tested and working.

## Setup

1. **Get a Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. **Install Dependencies**: `npm install`
3. **Run the App**: `npm start`

## Usage

1. Enter your Gemini API key in the main window
2. Choose your profile and language in settings
3. Click "Start Session" to begin
4. Position the window using keyboard shortcuts
5. The AI will provide real-time assistance based on your screen and what interview asks

## Keyboard Shortcuts

### Window Movement
- `Ctrl/Cmd + Up/Down/Left/Right Arrow` - Move window in any direction

### Window Control
- `Ctrl/Cmd + M` - Toggle click-through mode (make window transparent to clicks)
- `Ctrl/Cmd + \` - Toggle window visibility / Close window or go back
- `Ctrl/Cmd + Alt + R` - Clear and restart session (works globally, even when app not focused)

### AI Actions
- `Ctrl/Cmd + Enter` - Take screenshot and ask for next step
- `Enter` - Send message to AI
- `Shift + Enter` - New line in text input

### Response Navigation
- `Ctrl/Cmd + [` - Previous response
- `Ctrl/Cmd + ]` - Next response
- `Ctrl/Cmd + Shift + Up` - Scroll response up
- `Ctrl/Cmd + Shift + Down` - Scroll response down
- `Ctrl/Cmd + Shift + C` - Copy AI response

**Note:** All shortcuts can be customized in the Settings page!

## Audio Capture

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio
- **Windows**: Loopback audio capture
- **Linux**: Microphone input

## Requirements

- Electron-compatible OS (macOS, Windows, Linux)
- Gemini API key
- Screen recording permissions

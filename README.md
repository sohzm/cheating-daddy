<img width="1299" height="424" alt="cd (1)" src="https://github.com/user-attachments/assets/b25fff4d-043d-4f38-9985-f832ae0d0f6e" />

## Recall.ai - API for desktop recording

If you’re looking for a hosted desktop recording API, consider checking out [Recall.ai](https://www.recall.ai/product/desktop-recording-sdk/?utm_source=github&utm_medium=sponsorship&utm_campaign=sohzm-cheating-daddy), an API that records Zoom, Google Meet, Microsoft Teams, in-person meetings, and more.

This project is sponsored by Recall.ai.

---

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support


A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

### AI & Model Features
- **Dual Mode Support**: Interview Mode (with live audio) & Exam Assistant Mode 
- **Multi-Model Support**:
  - **Gemini Models**: Gemini 2.0 Flash Exp (Live API), Gemini 2.5 Flash, Gemini 3 Pro Preview
  - **Groq Llama Models**: Llama 4 Maverick, Llama 4 Scout (for interview mode)
- **Model Generation Settings**: Customize Temperature, Top P, and Max Output Tokens per model
- **Per-Model Settings Persistence**: Your custom settings are saved separately for each model
- **Model-Specific Defaults**: Optimized default values based on 2025/2026 documentation
- **Live AI Assistance**: Real-time help powered by Google Gemini Live API with optimized streaming
- **Multiple Profiles**: Interview, Exam Assistant, Sales Call, Business Meeting, Presentation, Negotiation

### VAD (Voice Activity Detection)
- **Dual VAD Modes**:
  - **Automatic Smart Detection** - Continuously detects and processes speech automatically
  - **Manual Push-to-Talk** - User-controlled mic toggle for interviews with frequent pauses

### Code & Response Features
- **Enhanced Code Generation**: LeetCode-style structured answers with Approach, Intuition, Implementation, Complexity Analysis, and Algorithm sections
- **Beautiful Code Formatting**: Clean markdown and syntax highlighting for code blocks

### UI & Stealth Features
- **Transparent Overlay**: Always-on-top window with adjustable transparency
- **Click-through Mode**: Make window transparent to clicks when needed
- **Content Protection**: Hide app from screen sharing and recording software (configurable)
- **Global Shortcuts**: Works even when app is not focused
- **macOS Stealth Features**: Dock hiding, Panel window type, Screen saver level visibility

### System Features
- **Auto-Update Notifications**: Get notified when new versions are available on GitHub
- **Manual Update Check**: Check for updates anytime with the header button
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Cross-platform**: Works on macOS, Windows, and Linux

## Setup

1. **Get API Keys**:
   - **Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - **Groq API Key**: Visit [Groq Console](https://console.groq.com/keys) for Llama models
2. **Install Dependencies**: `npm install`
3. **Run the App**: `npm start`

## Usage

1. Enter your API key(s) in the main window:
   - Gemini API key for Gemini models
   - Groq API key for Llama 4 Maverick/Scout models
2. Choose your profile and language in settings
3. Select your preferred model:
   - **Interview Mode**: Gemini 2.0 Flash Exp (Live API) or Groq Llama models
   - **Exam Mode**: Gemini 2.5 Flash or Gemini 3 Pro Preview
4. Select your preferred VAD mode (Automatic or Manual) in Interview Mode
5. Click "Start Session" to begin
6. Position the window using keyboard shortcuts
7. The AI will provide real-time assistance based on your screen and what interviewer asks

## Performance & Optimizations

- **Optimized Streaming**: Response generation speed improved with caching and streaming optimizations
- **Faster Response Times**: Enhanced VAD processing for quicker audio-to-text conversion
- **Smart Rate Limiting**: Token tracking system prevents API rate limit issues
- **Session Management**: Automatic session cleanup and reset for consistent performance
- **Memory Efficient**: Single instance enforcement prevents resource conflicts

## Keyboard Shortcuts

### Window Movement
- `Ctrl/Cmd + Up/Down/Left/Right Arrow` - Move window in any direction

### Window Control
- `Ctrl/Cmd + M` - Toggle click-through mode (make window transparent to clicks)
- `Ctrl/Cmd + \` - Toggle window visibility / Close window or go back
- `Ctrl/Cmd + Alt + R` - Clear and restart session (works globally, even when app not focused)

### AI Actions
- `Ctrl/Cmd + Enter` - Take screenshot and ask for next step
- `Ctrl/Cmd + Shift + M` - Toggle microphone ON/OFF (Manual VAD mode only)
- `Enter` - Send message to AI
- `Shift + Enter` - New line in text input

### Response Navigation
- `Ctrl/Cmd + [` - Previous response
- `Ctrl/Cmd + ]` - Next response
- `Ctrl/Cmd + Shift + Up` - Scroll response up
- `Ctrl/Cmd + Shift + Down` - Scroll response down
- `Ctrl/Cmd + Shift + C` - Copy AI response

**Note:** Some shortcuts can be customized in the Settings page!

## Audio Capture

### Voice Activity Detection (VAD) Modes

**Automatic Smart Detection Mode**
- Continuously detects and processes speech in real-time
- Best for natural conversations where the interviewer speaks continuously
- Mic is always ON and listening

**Manual Push-to-Talk Mode**
- User-controlled mic toggle (Ctrl/Cmd + Shift + M)
- Captures the entire question including pauses until you toggle OFF
- Perfect for interviewers who pause frequently mid-sentence
- Generates response only after you toggle OFF

### Platform-Specific Audio

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio

## macOS Users - Audio Setup

### Requirements:
- **Apple Silicon (M1/M2/M3)**: Works natively
- **Intel Mac**: Requires Rosetta 2 (install with: `softwareupdate --install-rosetta`)

### Stealth Features (macOS):
- **Dock Hiding**: App icon hidden from Dock
- **Panel Window Type**: Hidden from Cmd+Tab and Mission Control
- **Screen Saver Level**: App remains visible even over screen savers
- **Configurable Profiles**: Ultra-Stealth, Balanced, and Visible modes

### If audio doesn't work:
1. Grant Screen Recording permission: System Settings → Privacy & Security → Screen Recording
2. After building, set permissions: `chmod +x cheating-daddy.app/Contents/Resources/SystemAudioDump`

### Platform-Specific Audio Capture:
- **Windows**: Loopback audio capture
- **Linux**: System audio or microphone input

## Requirements

- Electron-compatible OS (macOS, Windows, Linux)
- Gemini API key
- Screen recording permissions

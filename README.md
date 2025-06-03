# Cheating Daddy

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

> [!NOTE]  
> During testing it wont answer if you ask something, you need to simulate interviewer asking question, which it will answer

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

- **Multiple AI Models**: Choose between Google Gemini 2.0 Flash Live and OpenAI GPT-4 Real-time API
- **Live AI Assistance**: Real-time help powered by your preferred AI model
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when needed
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)

## Setup

1. **Choose Your AI Model**: Select between Gemini or OpenAI in the model dropdown
2. **Get an API Key**:
   - **Gemini**: Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - **OpenAI**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
3. **Install Dependencies**: `npm install`
4. **Run the App**: `npm start`

## Usage

1. Select your preferred AI model (Gemini or OpenAI) in the model dropdown
2. Enter your API key for the selected model
3. Choose your profile and language in settings
4. Click "Start Session" to begin
5. Position the window using keyboard shortcuts
6. The AI will provide real-time assistance based on your screen and what interview asks

## Keyboard Shortcuts

- **Window Movement**: `Ctrl/Cmd + Arrow Keys` - Move window
- **Click-through**: `Ctrl/Cmd + M` - Toggle mouse events
- **Close/Back**: `Ctrl/Cmd + \` - Close window or go back
- **Send Message**: `Enter` - Send text to AI

## Audio Capture

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio 
- **Windows**: Loopback audio capture
- **Linux**: Microphone input

## Requirements

- Electron-compatible OS (macOS, Windows, Linux)
- API key for your chosen model (Gemini or OpenAI)
- Screen recording permissions
- Microphone/audio permissions 
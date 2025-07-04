# Cheating Daddy

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

> [!NOTE]  
> During testing it wont answer if you ask something, you need to simulate interviewer asking question, which it will answer

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

- **Live AI Assistance**: Real-time help powered by Google Gemini 2.0 Flash Live
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when needed
- **Notion Integration**: Use content from Notion pages/databases as additional context
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)

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
- Gemini API key
- Screen recording permissions
- Microphone/audio permissions
- Notion API key (optional, for Notion integration)

## Notion Integration

### What it does
### Setting up Notion Integration

1. **Create a Notion Internal Integration**:
   - Visit the [Notion Integrations page](https://www.notion.so/my-integrations)
   - Click "+ New integration"
   - Name your integration (e.g., "Cheating Daddy Assistant")
   - Select the workspace you want to connect to
   - Under "Capabilities", ensure "Read content" is checked
   - Click "Submit" to create the integration
   - Copy your "Internal Integration Secret" (this is your Notion API key)

2. **Share your Notion pages/databases with the integration**:
   - Open a Notion page or database you want to use as context
   - Click "Share" in the top-right corner
   - Under "Invite", search for and select your integration name
   - Click "Invite"
   - Repeat for all pages/databases you want to use

3. **Configure in the app**:
   - Open the app and go to Settings
   - Scroll to the "Notion Integration" section
   - Paste your Notion API key (Internal Integration Secret)
   - Click "Test Connection" to verify connectivity
   - Click "Add Notion Page" and paste the URL of your page/database
   - Toggle the switch to enable/disable specific pages

### Usage Tips

- The app will automatically fetch the content from all enabled Notion sources before starting an AI session
- Toggle pages on/off depending on the context you need for different sessions
- For best results, use focused pages with relevant information rather than very large databases
- Content is cached to minimize API calls, but will refresh periodically

<img src="/src/assets/logo.png" alt="uwu" width="200"/>

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
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)
- **Theme Support**: Light, Dark, and System themes with real-time switching
- **Minimize Functionality**: Minimize button in assistant view for quick access
- **Centered Login**: Clean, centered login form for better first impression

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
- **Minimize Window**: Available in assistant view (top right button)

## Audio Capture

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio
- **Windows**: Loopback audio capture
- **Linux**: Microphone input

## Customization

### Theme Options
- **Light Mode**: Clean white background with black text
- **Dark Mode**: Dark background with white text
- **System Mode**: Automatically follows your OS theme preference

### Interface Layout
- **Normal Mode**: Standard interface size
- **Compact Mode**: Smaller interface for less screen space usage

### Background Transparency
- Adjustable transparency from 0% (opaque) to 100% (transparent)

### Font Size
- Adjustable font size from 12px to 32px

## Version History

### Version 1.4
- **System Tray Icon Support**: Platform-specific icons (logo.ico for Windows, logo.icns for macOS, logo.png for Linux)
- **Enhanced Theme Switching**: Visual theme previews with improved styling
- **Improved Minimize Button**: Enhanced styling and better visibility
- **Centered Login Form**: Improved visual consistency and alignment

### Version 1.3
- **Minimize Button**: Added minimize functionality to assistant view
- **Centered Login Form**: Improved visual presentation of login screen
- **Theme Switching**: Added light, dark, and system theme options
- **Enhanced Styling**: Improved UI consistency across components

### Version 1.2
- **Improved Error Handling**: Better documentation of errors and warnings
- **Enhanced UI Components**: Refined styling for better user experience
- **Bug Fixes**: Various stability improvements

### Version 1.1
- **Initial Theme Implementation**: Basic light/dark mode support
- **Minimize Functionality**: Basic window minimize feature
- **UI Improvements**: Enhanced visual design and consistency

### Version 1.0
- **Initial Release**: Core functionality with screen capture and AI assistance
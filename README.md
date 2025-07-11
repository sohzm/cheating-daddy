<img src="/src/assets/logo.png" alt="uwu" width="200"/>

# Cheating Daddy

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

> [!NOTE]  
> During testing it wont answer if you ask something, you need to simulate interviewer asking question, which it will answer

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

-   **Live AI Assistance**: Real-time help powered by Google Gemini 2.0 Flash Live
-   **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
-   **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
-   **Transparent Overlay**: Always-on-top window that can be positioned anywhere
-   **Click-through Mode**: Make window transparent to clicks when needed
-   **Cross-platform**: Works on macOS, Windows, and Linux

## Installation

### Linux

Cheating Daddy is available in multiple formats for Linux:

#### Quick Installation

```bash
# Download and run the installer script
./install-linux.sh
```

#### Manual Installation

**DEB Package (Ubuntu, Debian, Linux Mint)**

```bash
sudo dpkg -i cheating-daddy_*.deb
sudo apt-get install -f  # Fix dependencies if needed
```

**RPM Package (Fedora, RHEL, CentOS, openSUSE)**

```bash
# Fedora/RHEL/CentOS
sudo dnf install cheating-daddy_*.rpm

# openSUSE
sudo zypper install cheating-daddy_*.rpm
```

**AppImage (Universal)**

```bash
chmod +x Cheating-Daddy-*.AppImage
./Cheating-Daddy-*.AppImage
```

For detailed Linux installation instructions, see [LINUX_INSTALL.md](LINUX_INSTALL.md).

### Building from Source

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

-   **Window Movement**: `Ctrl/Cmd + Arrow Keys` - Move window
-   **Click-through**: `Ctrl/Cmd + M` - Toggle mouse events
-   **Close/Back**: `Ctrl/Cmd + \` - Close window or go back
-   **Send Message**: `Enter` - Send text to AI

## Audio Capture

-   **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio
-   **Windows**: Loopback audio capture
-   **Linux**: Microphone input

## Requirements

-   Electron-compatible OS (macOS, Windows, Linux)
-   Gemini API key
-   Screen recording permissions
-   Microphone/audio permissions

# Cheating Daddy on Steroids 🚀

<img width="1299" height="424" alt="cd (1)" src="https://github.com/user-attachments/assets/b25fff4d-043d-4f38-9985-f832ae0d0f6e" />

> **This is an enhanced fork of [sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy)** with significant improvements including multi-provider AI support, advanced audio processing, intelligent rate limiting, and a polished user experience.

---

## 🌟 What's New in This Fork (v0.5.4)

### Multi-Provider AI Engine
- **Groq Integration**: Added Groq (Llama 4 Maverick/Scout, Whisper) alongside Gemini for task-specific optimization
- **Provider Fallbacks**: Automatic fallback between providers when rate limits are hit
- **Flexible Model Selection**: Choose your preferred primary and fallback models

### Advanced Audio Pipeline
- **Audio-to-Text Mode**: New Whisper + LLM workflow for precise transcription-based responses
- **Voice Activity Detection (VAD)**: Smart silence detection with configurable thresholds
- **Manual Trigger Support**: Use `Ctrl+/` to manually trigger audio processing
- **Dual Mode Support**: Switch between Live Conversation Mode and Audio-to-Text Mode

### Intelligent Rate Limit Management
- **Proactive Tracking**: Monitors API usage per provider/model in real-time
- **Automatic Fallbacks**: Seamlessly switches to fallback provider at 90% threshold
- **Usage Statistics**: View your current usage and time until reset
- **Persistent Storage**: Rate limits tracked across sessions

### Enhanced User Experience
- **Response Navigator Sidebar**: Browse through responses and inline transcriptions
- **Toast Notification System**: Non-intrusive notifications for system events
- **Deep Profile Customization**: More control over AI behavior per profile
- **Refined UI Aesthetics**: Polished interface with improved visual hierarchy
- **Detailed Answers Mode**: Toggle for comprehensive, formatted responses

### Technical Improvements
- **Modular Provider Registry**: Clean architecture for adding new AI providers
- **Improved Error Handling**: Better error messages and graceful degradation
- **Optimized Audio Capture**: Enhanced audio processing pipeline
- **Session History**: Browse and restore previous sessions

---

## 📦 Original Features

- **Live AI Assistance**: Real-time help powered by Google Gemini 2.0 Flash Live
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when needed
- **Cross-platform**: Works on macOS, Windows, and Linux

---

## 🛠️ Setup

1. **Get API Keys**:
   - **Gemini**: [Google AI Studio](https://aistudio.google.com/apikey)
   - **Groq** (optional): [Groq Console](https://console.groq.com/keys)

2. **Install Dependencies**: 
   ```bash
   npm install
   ```

3. **Run the App**: 
   ```bash
   npm start
   ```

---

## 🎮 Usage

1. Enter your API keys in Settings (Gemini required, Groq optional for fallback)
2. Choose your profile and configure AI preferences
3. Click "Start Session" to begin
4. Position the overlay window using keyboard shortcuts
5. The AI provides real-time assistance based on your screen and audio

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Arrow Keys` | Move window |
| `Ctrl/Cmd + M` | Toggle click-through mode |
| `Ctrl/Cmd + \` | Close window or go back |
| `Ctrl + /` | Manual audio trigger (Audio-to-Text mode) |
| `Enter` | Send text message to AI |

---

## 🔊 Audio Capture

| Platform | Method |
|----------|--------|
| **macOS** | [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio |
| **Windows** | Loopback audio capture |
| **Linux** | Microphone input |

---

## 📋 Requirements

- Electron-compatible OS (macOS, Windows, Linux)
- Gemini API key (required)
- Groq API key (optional, for fallback)
- Screen recording permissions
- Microphone/audio permissions

---

## 🙏 Credits

**Original Project**: [sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy) by [sohzm](https://github.com/sohzm)

**Fork Maintained By**: [Klaus Mikaelson](https://github.com/klaus-qodes)

---

## 📄 License

GPL-3.0 License - See [LICENSE](LICENSE) for details.

---

> [!NOTE]  
> Use latest macOS and Windows versions. Older versions have limited support.

> [!NOTE]  
> During testing, it won't answer if you ask something directly. You need to simulate an interviewer asking a question, which the AI will then answer.

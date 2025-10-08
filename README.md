# 🧠 Cheating Daddy — React + Electron (by Manidhar442)

This is a forked and modified version of the Cheating Daddy Electron app.  
I migrated the frontend from **Lit** to **React** using **Vite**, integrated it with **Electron**, and successfully built a working Windows desktop application using **Electron Forge**.

---

## 🚀 My Changes (Interview Task)

- Migrated frontend from **Lit → React (Vite)**
- Added React components (`App.jsx`, `main.jsx`)
- Configured **Vite** for hot reload and fast builds
- Updated **Electron main process (`main.js`)** to load Vite in dev mode and static files in production
- Added **preload.js** for secure IPC communication
- Fixed **UTF-8 encoding** issues in CSS
- Packaged and tested **Windows .exe build** via `electron-forge make`

---

## ⚙️ How to Run

```bash
# Clone the project
git clone https://github.com/Manidhar442/cheating-daddy.git
cd cheating-daddy

# Install dependencies
npm install

# Start in development mode (Electron + Vite)
npm run start

# Build production files
npm run renderer:build

# Package desktop app for Windows
npm run make
```

✅ Works fully on Windows (tested)  
💡 Packaged output is located in `out/make/`

---

## 📸 Demo

🎥 **Loom Video:**  
[https://www.loom.com/share/2250a55394b047f4a03a41ded3e8fe15](https://www.loom.com/share/2250a55394b047f4a03a41ded3e8fe15)

🔗 **GitHub Repo:**  
[https://github.com/Manidhar442/cheating-daddy](https://github.com/Manidhar442/cheating-daddy)

---

# Original Project (Below)

<img width="1299" height="424" alt="cd (1)" src="https://github.com/user-attachments/assets/b25fff4d-043d-4f38-9985-f832ae0d0f6e" />

## Recall.ai - API for desktop recording

If you’re looking for a hosted desktop recording API, consider checking out [Recall.ai](https://www.recall.ai/product/desktop-recording-sdk/?utm_source=github&utm_medium=sponsorship&utm_campaign=sohzm-cheating-daddy), an API that records Zoom, Google Meet, Microsoft Teams, in-person meetings, and more.

This project is sponsored by Recall.ai.

---

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

> [!NOTE]  
> During testing it wont answer if you ask something, you need to simulate interviewer asking question, which it will answer

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

---

## ✨ Features

- **Live AI Assistance**: Real-time help powered by Google Gemini 2.0 Flash Live  
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses  
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation  
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere  
- **Click-through Mode**: Make window transparent to clicks when needed  
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, don’t use, just for testing rn)

---

## ⚙️ Setup

1. **Get a Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey)  
2. **Install Dependencies**: `npm install`  
3. **Run the App**: `npm start`

---

## 🧠 Usage

1. Enter your Gemini API key in the main window  
2. Choose your profile and language in settings  
3. Click “Start Session” to begin  
4. Position the window using keyboard shortcuts  
5. The AI will provide real-time assistance based on your screen and what interviewer asks

---

## ⌨️ Keyboard Shortcuts

- **Window Movement**: `Ctrl/Cmd + Arrow Keys` - Move window  
- **Click-through**: `Ctrl/Cmd + M` - Toggle mouse events  
- **Close/Back**: `Ctrl/Cmd + \` - Close window or go back  
- **Send Message**: `Enter` - Send text to AI  

---

## 🎧 Audio Capture

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio  
- **Windows**: Loopback audio capture  
- **Linux**: Microphone input  

---

## 🧩 Requirements

- Electron-compatible OS (macOS, Windows, Linux)  
- Gemini API key  
- Screen recording permissions  
- Microphone/audio permissions  

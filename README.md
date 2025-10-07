<img width="1299" height="424" alt="cd (1)" src="https://github.com/user-attachments/assets/b25fff4d-043d-4f38-9985-f832ae0d0f6e" />

# Cheating Daddy - React Edition

> 🚀 **Frontend Modernized**: This fork has been upgraded from Lit Elements to **React 18** for better maintainability and developer experience!

## 📦 Original Repository

**Forked from**: [sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy)  
**Original Author**: [@sohzm](https://github.com/sohzm)  
**Frontend Technology**: Upgraded from Lit Elements → **React 18**

## 🎯 What's Changed

### ✨ **Frontend Technology Stack**

| Aspect | Original (Lit Elements) | React Edition |
|--------|------------------------|---------------|
| **Framework** | Lit Elements | React 18 |
| **Components** | Web Components | JSX Components |
| **State** | Reactive Properties | React Hooks |
| **Styling** | CSS-in-JS (Tagged Templates) | CSS Modules + Variables |
| **Build** | Native ES Modules | Webpack + Babel |
| **Dev Experience** | Basic | Hot Reload + DevTools |
| **TypeScript** | Built-in | Configurable |
| **Bundle Size** | Smaller | Slightly Larger |
| **Performance** | Native Web Components | Virtual DOM |
| **Learning Curve** | Moderate | Familiar to React Devs |

### 🔧 **Technical Improvements**
- Modern React component architecture
- Improved developer experience with hot reload
- Better component composition and reusability
- Enhanced error boundaries and debugging
- Maintained 100% backward compatibility with Electron backend

### 📁 **New Project Structure**
```
src/
├── react/                    # New React frontend
│   ├── components/           # React components
│   │   ├── App.jsx          # Main application
│   │   ├── AppHeader.jsx    # Navigation header
│   │   └── views/           # All page views
│   ├── styles/              # Global CSS styles
│   └── index.jsx            # React entry point
├── dist/                    # Webpack build output
└── components/              # Original Lit components (preserved)
```

---

## Recall.ai - API for desktop recording

If you're looking for a hosted desktop recording API, consider checking out [Recall.ai](https://www.recall.ai/product/desktop-recording-sdk/?utm_source=github&utm_medium=sponsorship&utm_campaign=sohzm-cheating-daddy), an API that records Zoom, Google Meet, Microsoft Teams, in-person meetings, and more.

This project is sponsored by Recall.ai.

---

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

## Setup

### 🚀 **Quick Start**
1. **Get a Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. **Install Dependencies**: `npm install`
3. **Build React Frontend**: `npm run build-react`
4. **Run the App**: `npm start`

### 🛠️ **Development Commands**
```bash
# Install all dependencies
npm install

# Build React frontend (production)
npm run build-react

# Build React frontend with watch (development)
npm run dev-react

# Start Electron app
npm start

# Package app for distribution
npm run make
```

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

### 💻 **System Requirements**
- Electron-compatible OS (macOS, Windows, Linux)
- Node.js 16+ (for React 18 support)
- Gemini API key
- Screen recording permissions
- Microphone/audio permissions

### 🛠️ **Development Requirements**
- Webpack 5+
- Babel 7+ (for JSX transformation)
- React 18+
- Modern browser with ES6+ support

## ✨ React Frontend Features

### 🎨 **Component Architecture**
- **App.jsx**: Main application container with global state
- **AppHeader.jsx**: Navigation and window controls
- **MainView.jsx**: Welcome screen with API key input
- **AssistantView.jsx**: AI assistant interface
- **CustomizeView.jsx**: Settings and preferences
- **HistoryView.jsx**: Conversation history management

### 📋 **State Management**
- React Hooks for local component state
- useEffect for lifecycle management
- useRef for DOM manipulation and method exposure
- localStorage integration for persistence

### 🎨 **Styling System**
- CSS Variables for consistent theming
- Modular CSS files per component
- Preserved original design system
- Responsive layout support

## 🔄 Migration Notes

### ✅ **What's Preserved**
- ✅ All Gemini AI functionality
- ✅ Electron backend integration
- ✅ Keyboard shortcuts and window controls
- ✅ Audio/screen capture capabilities
- ✅ Cross-platform compatibility
- ✅ Original UI design and theme

### ✨ **What's Improved**
- ✨ Modern React 18 with hooks
- ✨ Better component organization
- ✨ Improved developer experience
- ✨ Enhanced debugging capabilities
- ✨ Hot reload for development
- ✨ Better error handling

## 🛠️ **Conversion Process**

The frontend was converted from Lit Elements to React while maintaining 100% functionality:

1. **Component Conversion**: Each Lit component was manually converted to React
2. **State Management**: Lit's reactive properties → React hooks
3. **Styling**: CSS-in-JS → CSS modules with preserved variables
4. **Integration**: Updated `renderer.js` cheddar object to work with React
5. **Build System**: Added Webpack + Babel for JSX compilation
6. **Testing**: Verified all functionality works identically

### 📝 **Key Technical Decisions**
- ✅ Preserved original CSS variables for consistent theming
- ✅ Maintained backward compatibility with Electron backend
- ✅ Used forwardRef for component method exposure
- ✅ Implemented React-cheddar bridge for global state
- ✅ Added proper error boundaries and loading states

## 🤝 **Contributing**

### 🎆 **Original Project**
For contributions to the core AI functionality, please visit the original repository:
[sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy)

### ⚙️ **React Frontend Improvements**
Contributions to the React frontend are welcome! Areas for improvement:
- Additional React components and views
- Performance optimizations
- Better TypeScript integration
- Enhanced error handling
- UI/UX improvements

### 📝 **Development Setup**
```bash
# Clone this repository
git clone <your-fork-url>

# Install dependencies
npm install

# Start development mode (watches React changes)
npm run dev-react

# In another terminal, start Electron
npm start
```

## 🚀 **Future Plans**

- [ ] TypeScript migration for better type safety
- [ ] Additional React component libraries integration
- [ ] Enhanced state management (Redux/Zustand)
- [ ] Improved testing suite with React Testing Library
- [ ] Better accessibility (a11y) support
- [ ] Performance monitoring and optimization

---

## 📊 **Version Information**

- **React Edition Version**: 1.0.0
- **Original Base**: cheating-daddy v0.4.0
- **React Version**: 18.2.0
- **Last Updated**: October 2025

## 🙏 **Credits & Acknowledgments**

- **Original Project**: [@sohzm](https://github.com/sohzm) - [cheating-daddy](https://github.com/sohzm/cheating-daddy)
- **React Conversion**: [@vatsa](https://github.com/vatsa) 
- **Sponsorship**: [Recall.ai](https://www.recall.ai/) for supporting the original project
- **Community**: All contributors who helped improve the original codebase

> 📝 **Note**: This fork maintains full compatibility with the original project's AI functionality while providing a modern React frontend experience.

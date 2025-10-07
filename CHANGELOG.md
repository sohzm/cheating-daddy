# Changelog

All notable changes to this project will be documented in this file.

## [React Edition 1.0.0] - 2025-10-07

### 🚀 Major Changes
- **BREAKING**: Migrated frontend from Lit Elements to React 18
- Added Webpack + Babel build system for JSX compilation
- Restructured project with new React component architecture

### ✨ Added
- React 18 with modern hooks (useState, useEffect, useRef)
- Webpack configuration for development and production builds
- Babel configuration for JSX transformation
- CSS Modules system with preserved CSS variables
- New React component structure in `src/react/`
- Development commands: `npm run build-react`, `npm run dev-react`
- forwardRef implementation for component method exposure
- React-Cheddar bridge for global state management

### 🔧 Changed
- `src/index.html` - Updated to load React bundle instead of Lit components
- `src/utils/renderer.js` - Updated cheddar object to work with React state
- `package.json` - Added React dependencies and build scripts
- Project structure - Added `src/react/` directory for new frontend

### ✅ Preserved
- All Gemini AI functionality and API integration
- Electron backend and IPC communication
- Original UI design and theme system
- Keyboard shortcuts and window controls
- Audio/screen capture capabilities
- Cross-platform compatibility
- All existing features and workflows

### 🛠️ Technical Details
- React components converted from Lit Elements:
  - `CheatingDaddyApp` → `App.jsx`
  - `AppHeader` → `AppHeader.jsx` 
  - `MainView` → `MainView.jsx`
  - All view components converted to React
- State management migrated from Lit reactive properties to React hooks
- CSS-in-JS converted to CSS modules with preserved variables
- Maintained 100% backward compatibility with Electron backend

### 📦 Dependencies Added
- react: ^18.2.0
- react-dom: ^18.2.0
- @babel/core: ^7.22.5
- @babel/preset-react: ^7.22.5
- @babel/preset-env: ^7.22.5
- babel-loader: ^9.1.2
- webpack: ^5.88.0
- webpack-cli: ^5.1.4
- style-loader: ^3.3.3
- css-loader: ^6.8.1

### 🔍 Migration Notes
- Original Lit components preserved in `src/components/` (not used)
- React bundle built to `src/dist/bundle.js`
- All original functionality verified working
- No breaking changes to user workflows or API

---

## [Original] - Based on cheating-daddy v0.4.0

This React edition is based on the original cheating-daddy project by [@sohzm](https://github.com/sohzm).

**Original Repository**: https://github.com/sohzm/cheating-daddy
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './styles/global.css';

// Wait for renderer.js to be loaded before rendering React app
const initializeApp = () => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
};

// Check if cheddar object is available (from renderer.js)
if (window.cheddar) {
    initializeApp();
} else {
    // Wait for cheddar to be available
    const checkCheddar = setInterval(() => {
        if (window.cheddar) {
            clearInterval(checkCheddar);
            initializeApp();
        }
    }, 100);
    
    // Fallback - initialize after 2 seconds even if cheddar isn't ready
    setTimeout(() => {
        clearInterval(checkCheddar);
        if (!window.cheddar) {
            console.warn('Cheddar object not found, initializing React anyway');
        }
        initializeApp();
    }, 2000);
}

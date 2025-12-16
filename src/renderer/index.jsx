import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Wait for window.cheatingDaddy to be available before rendering
function initApp() {
    if (window.cheatingDaddy) {
        console.log('✅ window.cheatingDaddy is available');
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    } else {
        console.log('⏳ Waiting for window.cheatingDaddy...');
        setTimeout(initApp, 50);
    }
}

// Start initialization
initApp();
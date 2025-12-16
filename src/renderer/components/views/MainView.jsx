import React, { useState, useEffect } from 'react';
import './MainView.css';

function MainView({ onStart, onLayoutModeChange }) {
    const [apiKey, setApiKey] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);
    const [showApiKeyError, setShowApiKeyError] = useState(false);

    // Load API key on mount
    useEffect(() => {
        const loadApiKey = async () => {
            const key = await window.cheatingDaddy.storage.getApiKey();
            setApiKey(key || '');
        };
        loadApiKey();
    }, []);

    // Listen for initialization status
    useEffect(() => {
        if (!window.electron?.ipcRenderer) return;

        const handleSessionInit = (event, isInit) => {
            setIsInitializing(isInit);
        };

        window.electron.ipcRenderer.on('session-initializing', handleSessionInit);

        return () => {
            window.electron.ipcRenderer.removeAllListeners('session-initializing');
        };
    }, []);

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeydown = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isStartShortcut = isMac
                ? e.metaKey && e.key === 'Enter'
                : e.ctrlKey && e.key === 'Enter';
    
            if (isStartShortcut && !isInitializing) {
                e.preventDefault();
                onStart();  // Call onStart directly here
            }
        };
    
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, [isInitializing, onStart]); // Add onStart to dependencies

    const handleInput = async (e) => {
        const value = e.target.value;
        setApiKey(value);
        await window.cheatingDaddy.storage.setApiKey(value);
        
        if (showApiKeyError) {
            setShowApiKeyError(false);
        }
    };

    const handleStartClick = () => {
        if (isInitializing) return;
        onStart();
    };

    const handleAPIKeyHelpClick = async () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://aistudio.google.com/apikey');
        }
    };

    const getStartButtonText = () => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const shortcut = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
        return (
            <>
                Start <span className="shortcut-hint">{shortcut}</span>
            </>
        );
    };

    return (
        <div className="main-view">
            <div className="welcome">Welcome</div>

            <div className="input-group">
                <input
                    type="password"
                    placeholder="Enter your Gemini API Key"
                    value={apiKey}
                    onChange={handleInput}
                    className={showApiKeyError ? 'api-key-error' : ''}
                />
                <button
                    onClick={handleStartClick}
                    className={`start-button ${isInitializing ? 'initializing' : ''}`}
                    disabled={isInitializing}
                >
                    {getStartButtonText()}
                </button>
            </div>
            
            <p className="description">
                don't have an api key?{' '}
                <span onClick={handleAPIKeyHelpClick} className="link">
                    get one here
                </span>
            </p>
        </div>
    );
}

export default MainView;
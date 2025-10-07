import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import './MainView.css';

const MainView = forwardRef(({
    onStart = () => {},
    onAPIKeyHelp = () => {},
    onLayoutModeChange = () => {}
}, ref) => {
    const [isInitializing, setIsInitializing] = useState(false);
    const [showApiKeyError, setShowApiKeyError] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');

    const handleKeydown = useCallback((e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isStartShortcut = isMac ? e.metaKey && e.key === 'Enter' : e.ctrlKey && e.key === 'Enter';

        if (isStartShortcut) {
            e.preventDefault();
            handleStartClick();
        }
    }, [isInitializing, onStart]);

    useEffect(() => {
        // Add keyboard event listener for Ctrl+Enter (or Cmd+Enter on Mac)
        document.addEventListener('keydown', handleKeydown);

        if (window.electron?.ipcRenderer) {
            const handleSessionInitializing = (event, isInit) => {
                setIsInitializing(isInit);
            };

            window.electron.ipcRenderer.on('session-initializing', handleSessionInitializing);

            return () => {
                window.electron.ipcRenderer.removeAllListeners('session-initializing');
                document.removeEventListener('keydown', handleKeydown);
            };
        }

        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    }, [handleKeydown]);

    // Load and apply layout mode on startup
    useEffect(() => {
        const loadLayoutMode = () => {
            const savedLayoutMode = localStorage.getItem('layoutMode');
            if (savedLayoutMode && savedLayoutMode !== 'normal') {
                onLayoutModeChange(savedLayoutMode);
            }
        };

        loadLayoutMode();

        // Resize window for this view - assuming there's a global resize function
        if (window.resizeLayout) {
            window.resizeLayout();
        }
    }, [onLayoutModeChange]);

    const handleInput = (e) => {
        const value = e.target.value;
        setApiKey(value);
        localStorage.setItem('apiKey', value);
        
        // Clear error state when user starts typing
        if (showApiKeyError) {
            setShowApiKeyError(false);
        }
    };

    const handleStartClick = () => {
        if (isInitializing) {
            return;
        }
        onStart();
    };

    const handleAPIKeyHelpClick = () => {
        onAPIKeyHelp();
    };

    const handleResetOnboarding = () => {
        localStorage.removeItem('onboardingCompleted');
        window.location.reload();
    };

    // Method to trigger the red blink animation
    const triggerApiKeyError = () => {
        setShowApiKeyError(true);
        setTimeout(() => {
            setShowApiKeyError(false);
        }, 1000);
    };

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
        triggerApiKeyError
    }));

    const getStartButtonText = () => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        const CmdIcon = () => (
            <svg width="14px" height="14px" viewBox="0 0 24 24" strokeWidth="2" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path
                    d="M9 6C9 4.34315 7.65685 3 6 3C4.34315 3 3 4.34315 3 6C3 7.65685 4.34315 9 6 9H18C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21C16.3431 21 15 19.6569 15 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );

        const EnterIcon = () => (
            <svg width="14px" height="14px" strokeWidth="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M10.25 19.25L6.75 15.75L10.25 12.25"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M6.75 15.75H12.75C14.9591 15.75 16.75 13.9591 16.75 11.75V4.75"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );

        if (isMac) {
            return (
                <>
                    Start Session <span className="shortcut-icons"><CmdIcon /><EnterIcon /></span>
                </>
            );
        } else {
            return (
                <>
                    Start Session <span className="shortcut-icons">Ctrl<EnterIcon /></span>
                </>
            );
        }
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
                >
                    {getStartButtonText()}
                </button>
            </div>
            
            <p className="description">
                dont have an api key?{' '}
                <span onClick={handleAPIKeyHelpClick} className="link">
                    get one here
                </span>
            </p>
        </div>
    );
});

// Add display name for debugging
MainView.displayName = 'MainView';

export default MainView;

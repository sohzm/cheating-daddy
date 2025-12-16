import React, { useState, useEffect } from 'react';
import './AppHeader.css';

function AppHeader({
    currentView,
    statusText,
    startTime,
    isClickThrough,
    onCustomizeClick,
    onHelpClick,
    onHistoryClick,
    onClose,
    onBack
}) {
    const [elapsedTime, setElapsedTime] = useState('');
    const [updateAvailable, setUpdateAvailable] = useState(false);

    // Update timer every second
    useEffect(() => {
        if (currentView === 'assistant' && startTime) {
            const updateTimer = () => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                if (elapsed >= 60) {
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    setElapsedTime(`${minutes}m ${seconds}s`);
                } else {
                    setElapsedTime(`${elapsed}s`);
                }
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);

            return () => clearInterval(interval);
        } else {
            setElapsedTime('');
        }
    }, [currentView, startTime]);

    // Check for updates
    useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const currentVersion = await window.cheatingDaddy.getVersion();
                const response = await fetch('https://raw.githubusercontent.com/sohzm/cheating-daddy/refs/heads/master/package.json');
                if (!response.ok) return;

                const remotePackage = await response.json();
                const remoteVersion = remotePackage.version;

                if (isNewerVersion(remoteVersion, currentVersion)) {
                    setUpdateAvailable(true);
                }
            } catch (err) {
                console.log('Update check failed:', err.message);
            }
        };

        checkForUpdates();
    }, []);

    const isNewerVersion = (remote, current) => {
        const remoteParts = remote.split('.').map(Number);
        const currentParts = current.split('.').map(Number);

        for (let i = 0; i < Math.max(remoteParts.length, currentParts.length); i++) {
            const r = remoteParts[i] || 0;
            const c = currentParts[i] || 0;
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    };

    const openUpdatePage = async () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://cheatingdaddy.com');
        }
    };

    const getViewTitle = () => {
        const titles = {
            onboarding: 'Welcome to Cheating Daddy',
            main: 'Cheating Daddy',
            customize: 'Customize',
            help: 'Help & Shortcuts',
            history: 'Conversation History',
            advanced: 'Advanced Tools',
            assistant: 'Cheating Daddy',
        };
        return titles[currentView] || 'Cheating Daddy';
    };

    const isNavigationView = () => {
        const navigationViews = ['customize', 'help', 'history', 'advanced'];
        return navigationViews.includes(currentView);
    };

    const isMac = window.cheatingDaddy?.isMacOS || navigator.platform.includes('Mac');

    return (
        <div className="header">
            <div className="header-title">{getViewTitle()}</div>
            <div className="header-actions">
                {currentView === 'assistant' && (
                    <>
                        <span>{elapsedTime}</span>
                        <span>{statusText}</span>
                        {isClickThrough && <span className="click-through-indicator">click-through</span>}
                    </>
                )}

                {currentView === 'main' && (
                    <>
                        {updateAvailable && (
                            <button className="update-button" onClick={openUpdatePage}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                    <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                                </svg>
                                Update available
                            </button>
                        )}
                        <button className="icon-button" onClick={onHistoryClick}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button className="icon-button" onClick={onCustomizeClick}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button className="icon-button" onClick={onHelpClick}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 1 0 8.94 6.94ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </>
                )}

                {currentView === 'assistant' && (
                    <>
                        <button onClick={onClose} className="button">
                            Hide&nbsp;&nbsp;<span className="key" style={{ pointerEvents: 'none' }}>{isMac ? 'Cmd' : 'Ctrl'}</span>
                            &nbsp;&nbsp;<span className="key">\</span>
                        </button>
                        <button onClick={onClose} className="icon-button window-close">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    </>
                )}

                {currentView !== 'assistant' && (
                    <button onClick={isNavigationView() ? onBack : onClose} className="icon-button window-close">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

export default AppHeader;
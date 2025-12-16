import React, { useState, useEffect } from 'react';
import AppHeader from './components/AppHeader/AppHeader';
import MainView from './components/views/MainView';
import AssistantView from './components/views/AssistantView';
import OnboardingView from './components/views/OnboardingView';
import CustomizeView from './components/views/CustomizeView';
import HelpView from './components/views/HelpView';
import HistoryView from './components/views/HistoryView';
import './App.css';

function App() {
    const [currentView, setCurrentView] = useState('main');
    const [statusText, setStatusText] = useState('');
    const [startTime, setStartTime] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [sessionActive, setSessionActive] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState('interview');
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');
    const [responses, setResponses] = useState([]);
    const [currentResponseIndex, setCurrentResponseIndex] = useState(-1);
    const [selectedScreenshotInterval, setSelectedScreenshotInterval] = useState('5');
    const [selectedImageQuality, setSelectedImageQuality] = useState('medium');
    const [layoutMode, setLayoutMode] = useState('normal');
    const [isClickThrough, setIsClickThrough] = useState(false);
    const [storageLoaded, setStorageLoaded] = useState(false);

    // Load from storage on mount
    useEffect(() => {
        const loadStorage = async () => {
            try {
                const config = await window.cheatingDaddy.storage.getConfig();
                const prefs = await window.cheatingDaddy.storage.getPreferences();

                setCurrentView(config.onboarded ? 'main' : 'onboarding');
                setSelectedProfile(prefs.selectedProfile || 'interview');
                setSelectedLanguage(prefs.selectedLanguage || 'en-US');
                setSelectedScreenshotInterval(prefs.selectedScreenshotInterval || '5');
                setSelectedImageQuality(prefs.selectedImageQuality || 'medium');
                setLayoutMode(config.layout || 'normal');

                // Apply background appearance
                applyBackgroundAppearance(
                    prefs.backgroundColor || '#1e1e1e',
                    prefs.backgroundTransparency || 0.8
                );

                setStorageLoaded(true);
            } catch (error) {
                console.error('Error loading from storage:', error);
                setStorageLoaded(true);
            }
        };

        loadStorage();
    }, []);

    // Set up IPC listeners
    useEffect(() => {
        if (!window.require) return;

        const { ipcRenderer } = window.require('electron');

        const handleNewResponse = (_, response) => {
            setResponses(prev => [...prev, response]);
            setCurrentResponseIndex(prev => prev + 1);
        };

        const handleUpdateResponse = (_, response) => {
            setResponses(prev => {
                if (prev.length === 0) return [response];
                return [...prev.slice(0, -1), response];
            });
        };

        const handleUpdateStatus = (_, status) => {
            setStatusText(status);
        };

        const handleClickThroughToggled = (_, isEnabled) => {
            setIsClickThrough(isEnabled);
        };

        ipcRenderer.on('new-response', handleNewResponse);
        ipcRenderer.on('update-response', handleUpdateResponse);
        ipcRenderer.on('update-status', handleUpdateStatus);
        ipcRenderer.on('click-through-toggled', handleClickThroughToggled);

        return () => {
            ipcRenderer.removeAllListeners('new-response');
            ipcRenderer.removeAllListeners('update-response');
            ipcRenderer.removeAllListeners('update-status');
            ipcRenderer.removeAllListeners('click-through-toggled');
        };
    }, []);

    // Update layout mode
    useEffect(() => {
        if (layoutMode === 'compact') {
            document.documentElement.classList.add('compact-layout');
        } else {
            document.documentElement.classList.remove('compact-layout');
        }
    }, [layoutMode]);

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16)
              }
            : { r: 30, g: 30, b: 30 };
    };

    const lightenColor = (rgb, amount) => ({
        r: Math.min(255, rgb.r + amount),
        g: Math.min(255, rgb.g + amount),
        b: Math.min(255, rgb.b + amount)
    });

    const applyBackgroundAppearance = (backgroundColor, alpha) => {
        const root = document.documentElement;
        const baseRgb = hexToRgb(backgroundColor);
        const secondary = lightenColor(baseRgb, 7);
        const tertiary = lightenColor(baseRgb, 15);
        const hover = lightenColor(baseRgb, 20);

        root.style.setProperty('--header-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--main-content-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-primary', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-secondary', `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        root.style.setProperty('--bg-tertiary', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--bg-hover', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
    };

    // Event handlers
    const handleStart = async () => {
        const apiKey = await window.cheatingDaddy.storage.getApiKey();
        if (!apiKey || apiKey === '') {
            // TODO: Show error
            return;
        }

        await window.cheatingDaddy.initializeGemini(selectedProfile, selectedLanguage);
        window.cheatingDaddy.startCapture(selectedScreenshotInterval, selectedImageQuality);
        setResponses([]);
        setCurrentResponseIndex(-1);
        setStartTime(Date.now());
        setCurrentView('assistant');
    };

    const handleClose = async () => {
        if (['customize', 'help', 'history'].includes(currentView)) {
            setCurrentView('main');
        } else if (currentView === 'assistant') {
            window.cheatingDaddy.stopCapture();
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('close-session');
            }
            setSessionActive(false);
            setCurrentView('main');
        } else {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('quit-application');
            }
        }
    };

    const handleProfileChange = async (profile) => {
        setSelectedProfile(profile);
        await window.cheatingDaddy.storage.updatePreference('selectedProfile', profile);
    };

    const handleLanguageChange = async (language) => {
        setSelectedLanguage(language);
        await window.cheatingDaddy.storage.updatePreference('selectedLanguage', language);
    };

    const handleLayoutModeChange = async (mode) => {
        setLayoutMode(mode);
        await window.cheatingDaddy.storage.updateConfig('layout', mode);
        
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('update-sizes');
        }
    };

    const renderView = () => {
        switch (currentView) {
            case 'onboarding':
                return (
                    <OnboardingView
                        onComplete={() => setCurrentView('main')}
                        onClose={handleClose}
                    />
                );
            case 'main':
                return (
                    <MainView
                        onStart={handleStart}
                        onLayoutModeChange={handleLayoutModeChange}
                    />
                );
            case 'assistant':
                return (
                    <AssistantView
                        responses={responses}
                        currentResponseIndex={currentResponseIndex}
                        selectedProfile={selectedProfile}
                        onResponseIndexChanged={(index) => setCurrentResponseIndex(index)}
                    />
                );
            case 'customize':
                return (
                    <CustomizeView
                        selectedProfile={selectedProfile}
                        selectedLanguage={selectedLanguage}
                        selectedScreenshotInterval={selectedScreenshotInterval}
                        selectedImageQuality={selectedImageQuality}
                        layoutMode={layoutMode}
                        onProfileChange={handleProfileChange}
                        onLanguageChange={handleLanguageChange}
                        onScreenshotIntervalChange={(interval) => setSelectedScreenshotInterval(interval)}
                        onImageQualityChange={(quality) => setSelectedImageQuality(quality)}
                        onLayoutModeChange={handleLayoutModeChange}
                    />
                );
            case 'help':
                return <HelpView />;
            case 'history':
                return <HistoryView />;
            default:
                return <div>Unknown view</div>;
        }
    };

    const getViewClassName = () => {
        const viewClassMap = {
            assistant: 'assistant-view',
            onboarding: 'onboarding-view',
            customize: 'settings-view',
            help: 'help-view',
            history: 'history-view'
        };
        return `main-content ${viewClassMap[currentView] || 'with-border'}`;
    };

    return (
        <div className="window-container">
            <div className="container">
                <AppHeader
                    currentView={currentView}
                    statusText={statusText}
                    startTime={startTime}
                    isClickThrough={isClickThrough}
                    onCustomizeClick={() => setCurrentView('customize')}
                    onHelpClick={() => setCurrentView('help')}
                    onHistoryClick={() => setCurrentView('history')}
                    onClose={handleClose}
                    onBack={() => setCurrentView('main')}
                />
                <div className={getViewClassName()}>
                    <div className="view-container">{renderView()}</div>
                </div>
            </div>
        </div>
    );
}

export default App;
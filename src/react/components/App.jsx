import React, { useState, useEffect, useRef } from 'react';
import AppHeader from './AppHeader';
import MainView from './views/MainView';
import CustomizeView from './views/CustomizeView';
import HelpView from './views/HelpView';
import HistoryView from './views/HistoryView';
import AssistantView from './views/AssistantView';
import OnboardingView from './views/OnboardingView';
import AdvancedView from './views/AdvancedView';
import './App.css';

const App = () => {
    const [currentView, setCurrentView] = useState(
        localStorage.getItem('onboardingCompleted') ? 'main' : 'onboarding'
    );
    const [statusText, setStatusText] = useState('');
    const [startTime, setStartTime] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [sessionActive, setSessionActive] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(
        localStorage.getItem('selectedProfile') || 'interview'
    );
    const [selectedLanguage, setSelectedLanguage] = useState(
        localStorage.getItem('selectedLanguage') || 'en-US'
    );
    const [selectedScreenshotInterval, setSelectedScreenshotInterval] = useState(
        localStorage.getItem('selectedScreenshotInterval') || '5'
    );
    const [selectedImageQuality, setSelectedImageQuality] = useState(
        localStorage.getItem('selectedImageQuality') || 'medium'
    );
    const [layoutMode, setLayoutMode] = useState(
        localStorage.getItem('layoutMode') || 'normal'
    );
    const [advancedMode, setAdvancedMode] = useState(
        localStorage.getItem('advancedMode') === 'true'
    );
    const [responses, setResponses] = useState([]);
    const [currentResponseIndex, setCurrentResponseIndex] = useState(-1);
    const [isClickThrough, setIsClickThrough] = useState(false);
    const [awaitingNewResponse, setAwaitingNewResponse] = useState(false);
    const [shouldAnimateResponse, setShouldAnimateResponse] = useState(false);
    const [currentResponseIsComplete, setCurrentResponseIsComplete] = useState(true);
    
    // Ref for MainView to call its methods
    const mainViewRef = useRef(null);

    // Apply layout mode to document root
    const updateLayoutMode = () => {
        if (layoutMode === 'compact') {
            document.documentElement.classList.add('compact-layout');
        } else {
            document.documentElement.classList.remove('compact-layout');
        }
    };

    useEffect(() => {
        updateLayoutMode();
    }, [layoutMode]);

    // Register with global cheddar object for Gemini integration
    useEffect(() => {
        if (window.cheddar) {
            window.cheddar.setReactAppState({
                currentView,
                layoutMode,
                setStatus: handleSetStatus,
                setResponse: handleSetResponse,
                handleStart
            });
        }
    }, [currentView, layoutMode]);

    useEffect(() => {
        // Set up IPC listeners if needed
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            const handleUpdateResponse = (_, response) => {
                handleSetResponse(response);
            };
            
            const handleUpdateStatus = (_, status) => {
                handleSetStatus(status);
            };
            
            const handleClickThroughToggled = (_, isEnabled) => {
                setIsClickThrough(isEnabled);
            };

            ipcRenderer.on('update-response', handleUpdateResponse);
            ipcRenderer.on('update-status', handleUpdateStatus);
            ipcRenderer.on('click-through-toggled', handleClickThroughToggled);

            // Cleanup
            return () => {
                ipcRenderer.removeAllListeners('update-response');
                ipcRenderer.removeAllListeners('update-status');
                ipcRenderer.removeAllListeners('click-through-toggled');
            };
        }
    }, []);

    // Notify main process of view changes
    useEffect(() => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('view-changed', currentView);
        }
    }, [currentView]);

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('selectedProfile', selectedProfile);
    }, [selectedProfile]);

    useEffect(() => {
        localStorage.setItem('selectedLanguage', selectedLanguage);
    }, [selectedLanguage]);

    useEffect(() => {
        localStorage.setItem('selectedScreenshotInterval', selectedScreenshotInterval);
    }, [selectedScreenshotInterval]);

    useEffect(() => {
        localStorage.setItem('selectedImageQuality', selectedImageQuality);
    }, [selectedImageQuality]);

    useEffect(() => {
        localStorage.setItem('layoutMode', layoutMode);
    }, [layoutMode]);

    useEffect(() => {
        localStorage.setItem('advancedMode', advancedMode.toString());
    }, [advancedMode]);

    const handleSetStatus = (text) => {
        setStatusText(text);
        
        // Mark response as complete when we get certain status messages
        if (text.includes('Ready') || text.includes('Listening') || text.includes('Error')) {
            setCurrentResponseIsComplete(true);
            console.log('[setStatus] Marked current response as complete');
        }
    };

    const handleSetResponse = (response) => {
        // Check if this looks like a filler response
        const isFillerResponse =
            response.length < 30 &&
            (response.toLowerCase().includes('hmm') ||
                response.toLowerCase().includes('okay') ||
                response.toLowerCase().includes('next') ||
                response.toLowerCase().includes('go on') ||
                response.toLowerCase().includes('continue'));

        if (awaitingNewResponse || responses.length === 0) {
            setResponses(prev => [...prev, response]);
            setCurrentResponseIndex(responses.length);
            setAwaitingNewResponse(false);
            setCurrentResponseIsComplete(false);
            console.log('[setResponse] Pushed new response:', response);
        } else if (!currentResponseIsComplete && !isFillerResponse && responses.length > 0) {
            setResponses(prev => [...prev.slice(0, prev.length - 1), response]);
            console.log('[setResponse] Updated last response:', response);
        } else {
            setResponses(prev => [...prev, response]);
            setCurrentResponseIndex(responses.length);
            setCurrentResponseIsComplete(false);
            console.log('[setResponse] Added response as new:', response);
        }
        setShouldAnimateResponse(true);
    };

    // Header event handlers
    const handleCustomizeClick = () => setCurrentView('customize');
    const handleHelpClick = () => setCurrentView('help');
    const handleHistoryClick = () => setCurrentView('history');
    const handleAdvancedClick = () => setCurrentView('advanced');

    const handleClose = async () => {
        if (currentView === 'customize' || currentView === 'help' || currentView === 'history') {
            setCurrentView('main');
        } else if (currentView === 'assistant') {
            window.cheddar?.stopCapture();

            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('close-session');
            }
            setSessionActive(false);
            setCurrentView('main');
            console.log('Session closed');
        } else {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('quit-application');
            }
        }
    };

    const handleHideToggle = async () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('toggle-window-visibility');
        }
    };

    const handleBackClick = () => setCurrentView('main');

    // Main view event handlers
    const handleStart = async () => {
        const apiKey = localStorage.getItem('apiKey')?.trim();
        if (!apiKey || apiKey === '') {
            // Trigger API key error in MainView by calling its error method
            if (mainViewRef.current && mainViewRef.current.triggerApiKeyError) {
                mainViewRef.current.triggerApiKeyError();
            }
            return;
        }

        await window.cheddar?.initializeGemini(selectedProfile, selectedLanguage);
        window.cheddar?.startCapture(selectedScreenshotInterval, selectedImageQuality);
        setResponses([]);
        setCurrentResponseIndex(-1);
        setStartTime(Date.now());
        setCurrentView('assistant');
    };

    const handleAPIKeyHelp = async () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://cheatingdaddy.com/help/api-key');
        }
    };

    const handleLayoutModeChange = async (newLayoutMode) => {
        setLayoutMode(newLayoutMode);

        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-sizes');
            } catch (error) {
                console.error('Failed to update sizes in main process:', error);
            }
        }
    };

    // Assistant view event handlers
    const handleSendText = async (message) => {
        const result = await window.cheddar?.sendTextMessage(message);

        if (!result?.success) {
            console.error('Failed to send message:', result?.error);
            handleSetStatus('Error sending message: ' + result?.error);
        } else {
            handleSetStatus('Message sent...');
            setAwaitingNewResponse(true);
        }
    };

    const handleResponseIndexChanged = (index) => {
        setCurrentResponseIndex(index);
        setShouldAnimateResponse(false);
    };

    // Onboarding event handlers
    const handleOnboardingComplete = () => setCurrentView('main');

    const renderCurrentView = () => {
        switch (currentView) {
            case 'onboarding':
                return (
                    <OnboardingView
                        onComplete={handleOnboardingComplete}
                        onClose={handleClose}
                    />
                );

            case 'main':
                return (
                    <MainView
                        ref={mainViewRef}
                        onStart={handleStart}
                        onAPIKeyHelp={handleAPIKeyHelp}
                        onLayoutModeChange={handleLayoutModeChange}
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
                        advancedMode={advancedMode}
                        onProfileChange={setSelectedProfile}
                        onLanguageChange={setSelectedLanguage}
                        onScreenshotIntervalChange={setSelectedScreenshotInterval}
                        onImageQualityChange={setSelectedImageQuality}
                        onLayoutModeChange={handleLayoutModeChange}
                        onAdvancedModeChange={setAdvancedMode}
                    />
                );

            case 'help':
                return <HelpView onExternalLinkClick={handleAPIKeyHelp} />;

            case 'history':
                return <HistoryView />;

            case 'advanced':
                return <AdvancedView />;

            case 'assistant':
                return (
                    <AssistantView
                        responses={responses}
                        currentResponseIndex={currentResponseIndex}
                        selectedProfile={selectedProfile}
                        onSendText={handleSendText}
                        shouldAnimateResponse={shouldAnimateResponse}
                        onResponseIndexChanged={handleResponseIndexChanged}
                        onResponseAnimationComplete={() => {
                            setShouldAnimateResponse(false);
                            setCurrentResponseIsComplete(true);
                            console.log('[response-animation-complete] Marked current response as complete');
                        }}
                    />
                );

            default:
                return <div>Unknown view: {currentView}</div>;
        }
    };

    const getMainContentClass = () => {
        let className = 'main-content';
        if (currentView === 'assistant') {
            className += ' assistant-view';
        } else if (currentView === 'onboarding') {
            className += ' onboarding-view';
        } else {
            className += ' with-border';
        }
        return className;
    };

    return (
        <div className="window-container">
            <div className="container">
                <AppHeader
                    currentView={currentView}
                    statusText={statusText}
                    startTime={startTime}
                    advancedMode={advancedMode}
                    onCustomizeClick={handleCustomizeClick}
                    onHelpClick={handleHelpClick}
                    onHistoryClick={handleHistoryClick}
                    onAdvancedClick={handleAdvancedClick}
                    onCloseClick={handleClose}
                    onBackClick={handleBackClick}
                    onHideToggleClick={handleHideToggle}
                    isClickThrough={isClickThrough}
                />
                <div className={getMainContentClass()}>
                    <div className="view-container">
                        {renderCurrentView()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
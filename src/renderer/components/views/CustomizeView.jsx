import React, { useState, useEffect } from 'react';
import './CustomizeView.css';

function CustomizeView({
    selectedProfile,
    selectedLanguage,
    selectedScreenshotInterval,
    selectedImageQuality,
    layoutMode,
    onProfileChange,
    onLanguageChange,
    onScreenshotIntervalChange,
    onImageQualityChange,
    onLayoutModeChange
}) {
    const [activeSection, setActiveSection] = useState('profile');
    const [keybinds, setKeybinds] = useState(getDefaultKeybinds());
    const [googleSearchEnabled, setGoogleSearchEnabled] = useState(true);
    const [backgroundTransparency, setBackgroundTransparency] = useState(0.8);
    const [fontSize, setFontSize] = useState(20);
    const [audioMode, setAudioMode] = useState('speaker_only');
    const [customPrompt, setCustomPrompt] = useState('');
    const [theme, setTheme] = useState('dark');
    const [isClearing, setIsClearing] = useState(false);
    const [clearStatusMessage, setClearStatusMessage] = useState('');
    const [clearStatusType, setClearStatusType] = useState('');

    // Load from storage on mount
    useEffect(() => {
        const loadFromStorage = async () => {
            try {
                const [prefs, loadedKeybinds] = await Promise.all([
                    window.cheatingDaddy.storage.getPreferences(),
                    window.cheatingDaddy.storage.getKeybinds()
                ]);

                setGoogleSearchEnabled(prefs.googleSearchEnabled ?? true);
                setBackgroundTransparency(prefs.backgroundTransparency ?? 0.8);
                setFontSize(prefs.fontSize ?? 20);
                setAudioMode(prefs.audioMode ?? 'speaker_only');
                setCustomPrompt(prefs.customPrompt ?? '');
                setTheme(prefs.theme ?? 'dark');

                if (loadedKeybinds) {
                    setKeybinds({ ...getDefaultKeybinds(), ...loadedKeybinds });
                }

                updateBackgroundAppearance(
                    prefs.backgroundColor || '#1e1e1e',
                    prefs.backgroundTransparency ?? 0.8
                );
                updateFontSize(prefs.fontSize ?? 20);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };

        loadFromStorage();
    }, []);

    function getDefaultKeybinds() {
        const isMac = window.cheatingDaddy?.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    const updateBackgroundAppearance = (backgroundColor, alpha) => {
        // Use theme's background color if available
        const colors = window.cheatingDaddy?.theme?.get?.(theme);
        const bgColor = colors?.background || backgroundColor;
        window.cheatingDaddy?.theme?.applyBackgrounds?.(bgColor, alpha);
    };

    const updateFontSize = (size) => {
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${size}px`);
    };

    const getProfiles = () => [
        { value: 'interview', name: 'Job Interview', description: 'Get help with answering interview questions' },
        { value: 'sales', name: 'Sales Call', description: 'Assist with sales conversations and objection handling' },
        { value: 'meeting', name: 'Business Meeting', description: 'Support for professional meetings and discussions' },
        { value: 'presentation', name: 'Presentation', description: 'Help with presentations and public speaking' },
        { value: 'negotiation', name: 'Negotiation', description: 'Guidance for business negotiations and deals' },
        { value: 'exam', name: 'Exam Assistant', description: 'Academic assistance for test-taking and exam questions' },
    ];

    const getLanguages = () => [
        { value: 'en-US', name: 'English (US)' },
        { value: 'en-GB', name: 'English (UK)' },
        { value: 'en-AU', name: 'English (Australia)' },
        { value: 'en-IN', name: 'English (India)' },
        { value: 'de-DE', name: 'German (Germany)' },
        { value: 'es-US', name: 'Spanish (United States)' },
        { value: 'es-ES', name: 'Spanish (Spain)' },
        { value: 'fr-FR', name: 'French (France)' },
        { value: 'fr-CA', name: 'French (Canada)' },
        { value: 'hi-IN', name: 'Hindi (India)' },
        { value: 'pt-BR', name: 'Portuguese (Brazil)' },
        { value: 'ar-XA', name: 'Arabic (Generic)' },
        { value: 'id-ID', name: 'Indonesian (Indonesia)' },
        { value: 'it-IT', name: 'Italian (Italy)' },
        { value: 'ja-JP', name: 'Japanese (Japan)' },
        { value: 'tr-TR', name: 'Turkish (Turkey)' },
        { value: 'vi-VN', name: 'Vietnamese (Vietnam)' },
        { value: 'bn-IN', name: 'Bengali (India)' },
        { value: 'gu-IN', name: 'Gujarati (India)' },
        { value: 'kn-IN', name: 'Kannada (India)' },
        { value: 'ml-IN', name: 'Malayalam (India)' },
        { value: 'mr-IN', name: 'Marathi (India)' },
        { value: 'ta-IN', name: 'Tamil (India)' },
        { value: 'te-IN', name: 'Telugu (India)' },
        { value: 'nl-NL', name: 'Dutch (Netherlands)' },
        { value: 'ko-KR', name: 'Korean (South Korea)' },
        { value: 'cmn-CN', name: 'Mandarin Chinese (China)' },
        { value: 'pl-PL', name: 'Polish (Poland)' },
        { value: 'ru-RU', name: 'Russian (Russia)' },
        { value: 'th-TH', name: 'Thai (Thailand)' },
    ];

    const getThemes = () => window.cheatingDaddy?.theme?.getAll?.() || [{ value: 'dark', name: 'Dark' }];

    const getProfileNames = () => ({
        interview: 'Job Interview',
        sales: 'Sales Call',
        meeting: 'Business Meeting',
        presentation: 'Presentation',
        negotiation: 'Negotiation',
        exam: 'Exam Assistant',
    });

    const handleCustomPromptInput = async (e) => {
        const value = e.target.value;
        setCustomPrompt(value);
        await window.cheatingDaddy.storage.updatePreference('customPrompt', value);
    };

    const handleAudioModeSelect = async (e) => {
        const value = e.target.value;
        setAudioMode(value);
        await window.cheatingDaddy.storage.updatePreference('audioMode', value);
    };

    const handleThemeChange = async (e) => {
        const value = e.target.value;
        setTheme(value);
        await window.cheatingDaddy?.theme?.save?.(value);
        updateBackgroundAppearance('#1e1e1e', backgroundTransparency);
    };

    const handleBackgroundTransparencyChange = async (e) => {
        const value = parseFloat(e.target.value);
        setBackgroundTransparency(value);
        await window.cheatingDaddy.storage.updatePreference('backgroundTransparency', value);
        updateBackgroundAppearance('#1e1e1e', value);
    };

    const handleFontSizeChange = async (e) => {
        const value = parseInt(e.target.value, 10);
        setFontSize(value);
        await window.cheatingDaddy.storage.updatePreference('fontSize', value);
        updateFontSize(value);
    };

    const handleGoogleSearchChange = async (e) => {
        const checked = e.target.checked;
        setGoogleSearchEnabled(checked);
        await window.cheatingDaddy.storage.updatePreference('googleSearchEnabled', checked);

        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-google-search-setting', checked);
            } catch (error) {
                console.error('Failed to notify main process:', error);
            }
        }
    };

    const saveKeybinds = async (newKeybinds) => {
        await window.cheatingDaddy.storage.setKeybinds(newKeybinds);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', newKeybinds);
        }
    };

    const handleKeybindChange = (action, value) => {
        const newKeybinds = { ...keybinds, [action]: value };
        setKeybinds(newKeybinds);
        saveKeybinds(newKeybinds);
    };

    const handleKeybindInput = (e) => {
        e.preventDefault();

        const modifiers = [];

        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        let mainKey = e.key;

        // Handle special keys
        const specialKeys = {
            ArrowUp: 'Up',
            ArrowDown: 'Down',
            ArrowLeft: 'Left',
            ArrowRight: 'Right',
            Enter: 'Enter',
            Space: 'Space',
            Backslash: '\\',
        };

        if (specialKeys[e.code]) {
            mainKey = specialKeys[e.code];
        } else if (e.key.length === 1) {
            mainKey = e.key.toUpperCase();
        }

        // Skip if only modifier keys are pressed
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }

        const keybind = [...modifiers, mainKey].join('+');
        const action = e.target.dataset.action;
        handleKeybindChange(action, keybind);
        e.target.value = keybind;
        e.target.blur();
    };

    const handleKeybindFocus = (e) => {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    };

    const resetKeybinds = async () => {
        const defaults = getDefaultKeybinds();
        setKeybinds(defaults);
        await window.cheatingDaddy.storage.setKeybinds(null);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', defaults);
        }
    };

    const clearLocalData = async () => {
        if (isClearing) return;

        setIsClearing(true);
        setClearStatusMessage('');
        setClearStatusType('');

        try {
            await window.cheatingDaddy.storage.clearAll();
            setClearStatusMessage('Successfully cleared all local data');
            setClearStatusType('success');

            setTimeout(() => {
                setClearStatusMessage('Closing application...');
                setTimeout(async () => {
                    if (window.require) {
                        const { ipcRenderer } = window.require('electron');
                        await ipcRenderer.invoke('quit-application');
                    }
                }, 1000);
            }, 2000);
        } catch (error) {
            console.error('Error clearing data:', error);
            setClearStatusMessage(`Error clearing data: ${error.message}`);
            setClearStatusType('error');
        } finally {
            setIsClearing(false);
        }
    };

    const getKeybindActions = () => [
        { key: 'moveUp', name: 'Move Window Up', description: 'Move the application window up' },
        { key: 'moveDown', name: 'Move Window Down', description: 'Move the application window down' },
        { key: 'moveLeft', name: 'Move Window Left', description: 'Move the application window left' },
        { key: 'moveRight', name: 'Move Window Right', description: 'Move the application window right' },
        { key: 'toggleVisibility', name: 'Toggle Window Visibility', description: 'Show/hide the application window' },
        { key: 'toggleClickThrough', name: 'Toggle Click-through Mode', description: 'Enable/disable click-through functionality' },
        { key: 'nextStep', name: 'Ask Next Step', description: 'Take screenshot and ask AI for the next step suggestion' },
        { key: 'previousResponse', name: 'Previous Response', description: 'Navigate to the previous AI response' },
        { key: 'nextResponse', name: 'Next Response', description: 'Navigate to the next AI response' },
        { key: 'scrollUp', name: 'Scroll Response Up', description: 'Scroll the AI response content up' },
        { key: 'scrollDown', name: 'Scroll Response Down', description: 'Scroll the AI response content down' },
    ];

    const getSidebarSections = () => [
        { id: 'profile', name: 'Profile', icon: 'user' },
        { id: 'appearance', name: 'Appearance', icon: 'display' },
        { id: 'audio', name: 'Audio', icon: 'mic' },
        { id: 'language', name: 'Language', icon: 'globe' },
        { id: 'capture', name: 'Capture', icon: 'camera' },
        { id: 'keyboard', name: 'Keyboard', icon: 'keyboard' },
        { id: 'search', name: 'Search', icon: 'search' },
        { id: 'advanced', name: 'Advanced', icon: 'warning', danger: true },
    ];

    const renderSidebarIcon = (icon) => {
        const icons = {
            user: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            ),
            mic: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            ),
            globe: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
            ),
            display: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
            ),
            camera: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                </svg>
            ),
            keyboard: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                    <path d="M6 8h.001"></path>
                    <path d="M10 8h.001"></path>
                    <path d="M14 8h.001"></path>
                    <path d="M18 8h.001"></path>
                    <path d="M8 12h.001"></path>
                    <path d="M12 12h.001"></path>
                    <path d="M16 12h.001"></path>
                    <path d="M7 16h10"></path>
                </svg>
            ),
            search: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            ),
            warning: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            ),
        };
        return icons[icon] || null;
    };

    // Render section content
    const renderProfileSection = () => {
        const profiles = getProfiles();
        const profileNames = getProfileNames();
        const currentProfile = profiles.find(p => p.value === selectedProfile);

        return (
            <div className="profile-section">
                <div className="content-header">AI Profile</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">
                            Profile Type
                            <span className="current-selection">{currentProfile?.name || 'Unknown'}</span>
                        </label>
                        <select className="form-control" value={selectedProfile} onChange={(e) => onProfileChange(e.target.value)}>
                            {profiles.map(profile => (
                                <option key={profile.value} value={profile.value}>
                                    {profile.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group expand">
                        <label className="form-label">Custom AI Instructions</label>
                        <textarea
                            className="form-control"
                            placeholder={`Add specific instructions for how you want the AI to behave during ${profileNames[selectedProfile] || 'this interaction'}...`}
                            value={customPrompt}
                            onChange={handleCustomPromptInput}
                        />
                        <div className="form-description">
                            Personalize the AI's behavior with specific instructions
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderAppearanceSection = () => {
        const themes = getThemes();
        const currentTheme = themes.find(t => t.value === theme);

        return (
            <>
                <div className="content-header">Appearance</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">
                            Theme
                            <span className="current-selection">{currentTheme?.name || 'Dark'}</span>
                        </label>
                        <select className="form-control" value={theme} onChange={handleThemeChange}>
                            {themes.map(t => (
                                <option key={t.value} value={t.value}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                        <div className="form-description">Choose a color theme for the interface</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Layout Mode
                            <span className="current-selection">{layoutMode === 'compact' ? 'Compact' : 'Normal'}</span>
                        </label>
                        <select className="form-control" value={layoutMode} onChange={(e) => onLayoutModeChange(e.target.value)}>
                            <option value="normal">Normal</option>
                            <option value="compact">Compact</option>
                        </select>
                        <div className="form-description">
                            {layoutMode === 'compact'
                                ? 'Smaller window with reduced padding'
                                : 'Standard layout with comfortable spacing'}
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="slider-container">
                            <div className="slider-header">
                                <label className="form-label">Background Transparency</label>
                                <span className="slider-value">{Math.round(backgroundTransparency * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                className="slider-input"
                                min="0"
                                max="1"
                                step="0.01"
                                value={backgroundTransparency}
                                onChange={handleBackgroundTransparencyChange}
                            />
                            <div className="slider-labels">
                                <span>Transparent</span>
                                <span>Opaque</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="slider-container">
                            <div className="slider-header">
                                <label className="form-label">Response Font Size</label>
                                <span className="slider-value">{fontSize}px</span>
                            </div>
                            <input
                                type="range"
                                className="slider-input"
                                min="12"
                                max="32"
                                step="1"
                                value={fontSize}
                                onChange={handleFontSizeChange}
                            />
                            <div className="slider-labels">
                                <span>12px</span>
                                <span>32px</span>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    const renderAudioSection = () => (
        <>
            <div className="content-header">Audio Settings</div>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Audio Mode</label>
                    <select className="form-control" value={audioMode} onChange={handleAudioModeSelect}>
                        <option value="speaker_only">Speaker Only (Interviewer)</option>
                        <option value="mic_only">Microphone Only (Me)</option>
                        <option value="both">Both Speaker & Microphone</option>
                    </select>
                    <div className="form-description">Choose which audio sources to capture for the AI.</div>
                </div>
            </div>
        </>
    );

    const renderLanguageSection = () => {
        const languages = getLanguages();
        const currentLanguage = languages.find(l => l.value === selectedLanguage);

        return (
            <>
                <div className="content-header">Language</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">
                            Speech Language
                            <span className="current-selection">{currentLanguage?.name || 'Unknown'}</span>
                        </label>
                        <select className="form-control" value={selectedLanguage} onChange={(e) => onLanguageChange(e.target.value)}>
                            {languages.map(language => (
                                <option key={language.value} value={language.value}>
                                    {language.name}
                                </option>
                            ))}
                        </select>
                        <div className="form-description">Language for speech recognition and AI responses</div>
                    </div>
                </div>
            </>
        );
    };

    const renderCaptureSection = () => (
        <>
            <div className="content-header">Screen Capture</div>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">
                        Image Quality
                        <span className="current-selection">
                            {selectedImageQuality.charAt(0).toUpperCase() + selectedImageQuality.slice(1)}
                        </span>
                    </label>
                    <select className="form-control" value={selectedImageQuality} onChange={(e) => onImageQualityChange(e.target.value)}>
                        <option value="high">High Quality</option>
                        <option value="medium">Medium Quality</option>
                        <option value="low">Low Quality</option>
                    </select>
                    <div className="form-description">
                        {selectedImageQuality === 'high'
                            ? 'Best quality, uses more tokens'
                            : selectedImageQuality === 'medium'
                              ? 'Balanced quality and token usage'
                              : 'Lower quality, uses fewer tokens'}
                    </div>
                </div>
            </div>
        </>
    );

    const renderKeyboardSection = () => (
        <>
            <div className="content-header">Keyboard Shortcuts</div>
            <div className="form-grid">
                <table className="keybinds-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Shortcut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getKeybindActions().map(action => (
                            <tr key={action.key}>
                                <td>
                                    <div className="action-name">{action.name}</div>
                                    <div className="action-description">{action.description}</div>
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="form-control keybind-input"
                                        value={keybinds[action.key]}
                                        placeholder="Press keys..."
                                        data-action={action.key}
                                        onKeyDown={handleKeybindInput}
                                        onFocus={handleKeybindFocus}
                                        readOnly
                                    />
                                </td>
                            </tr>
                        ))}
                        <tr className="table-reset-row">
                            <td colSpan="2">
                                <button className="reset-keybinds-button" onClick={resetKeybinds}>
                                    Reset to Defaults
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </>
    );

    const renderSearchSection = () => (
        <>
            <div className="content-header">Search</div>
            <div className="form-grid">
                <div className="checkbox-group">
                    <input
                        type="checkbox"
                        className="checkbox-input"
                        id="google-search-enabled"
                        checked={googleSearchEnabled}
                        onChange={handleGoogleSearchChange}
                    />
                    <label htmlFor="google-search-enabled" className="checkbox-label">
                        Enable Google Search
                    </label>
                </div>
                <div className="form-description" style={{ marginLeft: '24px', marginTop: '-8px' }}>
                    Allow the AI to search Google for up-to-date information during conversations.
                    <br />
                    <strong>Note:</strong> Changes take effect when starting a new AI session.
                </div>
            </div>
        </>
    );

    const renderAdvancedSection = () => (
        <>
            <div className="content-header" style={{ color: 'var(--error-color)' }}>Advanced</div>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--error-color)' }}>
                        Data Management
                    </label>
                    <div className="form-description" style={{ marginBottom: '12px' }}>
                        <strong>Warning:</strong> This action will permanently delete all local data including API keys,
                        preferences, and session history. This cannot be undone.
                    </div>
                    <button
                        className="danger-button"
                        onClick={clearLocalData}
                        disabled={isClearing}
                    >
                        {isClearing ? 'Clearing...' : 'Clear All Local Data'}
                    </button>
                    {clearStatusMessage && (
                        <div className={`status-message ${clearStatusType === 'success' ? 'status-success' : 'status-error'}`}>
                            {clearStatusMessage}
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'profile':
                return renderProfileSection();
            case 'appearance':
                return renderAppearanceSection();
            case 'audio':
                return renderAudioSection();
            case 'language':
                return renderLanguageSection();
            case 'capture':
                return renderCaptureSection();
            case 'keyboard':
                return renderKeyboardSection();
            case 'search':
                return renderSearchSection();
            case 'advanced':
                return renderAdvancedSection();
            default:
                return renderProfileSection();
        }
    };

    const sections = getSidebarSections();

    return (
        <div className="settings-layout">
            <nav className="settings-sidebar">
                {sections.map(section => (
                    <button
                        key={section.id}
                        className={`sidebar-item ${activeSection === section.id ? 'active' : ''} ${section.danger ? 'danger' : ''}`}
                        onClick={() => setActiveSection(section.id)}
                    >
                        {renderSidebarIcon(section.icon)}
                        <span>{section.name}</span>
                    </button>
                ))}
            </nav>
            <div className="settings-content">
                {renderSectionContent()}
            </div>
        </div>
    );
}

export default CustomizeView;
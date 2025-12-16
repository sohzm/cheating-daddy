import React, { useState, useEffect } from 'react';
import './HelpView.css';

function HelpView() {
    const [keybinds, setKeybinds] = useState(getDefaultKeybinds());

    useEffect(() => {
        const loadKeybinds = async () => {
            try {
                const loadedKeybinds = await window.cheatingDaddy.storage.getKeybinds();
                if (loadedKeybinds) {
                    setKeybinds({ ...getDefaultKeybinds(), ...loadedKeybinds });
                }
            } catch (error) {
                console.error('Error loading keybinds:', error);
            }
        };
        loadKeybinds();
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

    const formatKeybind = (keybind) => {
        return keybind.split('+').map((key, index) => (
            <span key={index} className="key">{key}</span>
        ));
    };

    const handleExternalLinkClick = async (url) => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', url);
        }
    };

    return (
        <div className="help-container">
            <div className="option-group">
                <div className="option-label">
                    <span>Community & Support</span>
                </div>
                <div className="community-links">
                    <div className="community-link" onClick={() => handleExternalLinkClick('https://cheatingdaddy.com')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 11.9976C14 9.5059 11.683 7 8.85714 7C8.52241 7 7.41904 7.00001 7.14286 7.00001C4.30254 7.00001 2 9.23752 2 11.9976C2 14.376 3.70973 16.3664 6 16.8714C6.36756 16.9525 6.75006 16.9952 7.14286 16.9952"></path>
                            <path d="M10 11.9976C10 14.4893 12.317 16.9952 15.1429 16.9952C15.4776 16.9952 16.581 16.9952 16.8571 16.9952C19.6975 16.9952 22 14.7577 22 11.9976C22 9.6192 20.2903 7.62884 18 7.12383C17.6324 7.04278 17.2499 6.99999 16.8571 6.99999"></path>
                        </svg>
                        Website
                    </div>
                    <div className="community-link" onClick={() => handleExternalLinkClick('https://github.com/sohzm/cheating-daddy')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 22.0268V19.1568C16.0375 18.68 15.9731 18.2006 15.811 17.7506C15.6489 17.3006 15.3929 16.8902 15.06 16.5468C18.2 16.1968 21.5 15.0068 21.5 9.54679C21.4997 8.15062 20.9627 6.80799 20 5.79679C20.4558 4.5753 20.4236 3.22514 19.91 2.02679C19.91 2.02679 18.73 1.67679 16 3.50679C13.708 2.88561 11.292 2.88561 8.99999 3.50679C6.26999 1.67679 5.08999 2.02679 5.08999 2.02679C4.57636 3.22514 4.54413 4.5753 4.99999 5.79679C4.03011 6.81549 3.49251 8.17026 3.49999 9.57679C3.49999 14.9968 6.79998 16.1868 9.93998 16.5768C9.61098 16.9168 9.35725 17.3222 9.19529 17.7667C9.03334 18.2112 8.96679 18.6849 8.99999 19.1568V22.0268"></path>
                            <path d="M9 20.0267C6 20.9999 3.5 20.0267 2 17.0267"></path>
                        </svg>
                        GitHub
                    </div>
                    <div className="community-link" onClick={() => handleExternalLinkClick('https://discord.gg/GCBdubnXfJ')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5.5 16C10.5 18.5 13.5 18.5 18.5 16"></path>
                            <path d="M15.5 17.5L16.5 19.5C16.5 19.5 20.6713 18.1717 22 16C22 15 22.5301 7.85339 19 5.5C17.5 4.5 15 4 15 4L14 6H12"></path>
                            <path d="M8.52832 17.5L7.52832 19.5C7.52832 19.5 3.35699 18.1717 2.02832 16C2.02832 15 1.49823 7.85339 5.02832 5.5C6.52832 4.5 9.02832 4 9.02832 4L10.0283 6H12.0283"></path>
                            <path d="M8.5 14C7.67157 14 7 13.1046 7 12C7 10.8954 7.67157 10 8.5 10C9.32843 10 10 10.8954 10 12C10 13.1046 9.32843 14 8.5 14Z"></path>
                            <path d="M15.5 14C14.6716 14 14 13.1046 14 12C14 10.8954 14.6716 10 15.5 10C16.3284 10 17 10.8954 17 12C17 13.1046 16.3284 14 15.5 14Z"></path>
                        </svg>
                        Discord
                    </div>
                </div>
            </div>

            <div className="option-group">
                <div className="option-label">
                    <span>Keyboard Shortcuts</span>
                </div>
                <div className="keyboard-section">
                    <div className="keyboard-group">
                        <div className="keyboard-group-title">Window Movement</div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Move window up</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.moveUp)}</div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Move window down</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.moveDown)}</div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Move window left</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.moveLeft)}</div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Move window right</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.moveRight)}</div>
                        </div>
                    </div>

                    <div className="keyboard-group">
                        <div className="keyboard-group-title">Window Control</div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Toggle click-through mode</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.toggleClickThrough)}</div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Toggle window visibility</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.toggleVisibility)}</div>
                        </div>
                    </div>

                    <div className="keyboard-group">
                        <div className="keyboard-group-title">AI Actions</div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Take screenshot and ask for next step</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.nextStep)}</div>
                        </div>
                    </div>

                    <div className="keyboard-group">
                        <div className="keyboard-group-title">Response Navigation</div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Previous response</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.previousResponse)}</div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Next response</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.nextResponse)}</div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Scroll response up</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.scrollUp)}</div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Scroll response down</span>
                            <div className="shortcut-keys">{formatKeybind(keybinds.scrollDown)}</div>
                        </div>
                    </div>

                    <div className="keyboard-group">
                        <div className="keyboard-group-title">Text Input</div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">Send message to AI</span>
                            <div className="shortcut-keys"><span className="key">Enter</span></div>
                        </div>
                        <div className="shortcut-item">
                            <span className="shortcut-description">New line in text input</span>
                            <div className="shortcut-keys">
                                <span className="key">Shift</span>
                                <span className="key">Enter</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="description" style={{marginTop: '12px', textAlign: 'center'}}>
                    You can customize these shortcuts in Settings.
                </div>
            </div>

            <div className="option-group">
                <div className="option-label">
                    <span>How to Use</span>
                </div>
                <div className="usage-steps">
                    <div className="usage-step">
                        <strong>Start a Session:</strong> Enter your Gemini API key and click "Start Session"
                    </div>
                    <div className="usage-step">
                        <strong>Customize:</strong> Choose your profile and language in the settings
                    </div>
                    <div className="usage-step">
                        <strong>Position Window:</strong> Use keyboard shortcuts to move the window to your desired location
                    </div>
                    <div className="usage-step">
                        <strong>Click-through Mode:</strong> Use {formatKeybind(keybinds.toggleClickThrough)} to make the window click-through
                    </div>
                    <div className="usage-step">
                        <strong>Get AI Help:</strong> The AI will analyze your screen and audio to provide assistance
                    </div>
                    <div className="usage-step">
                        <strong>Text Messages:</strong> Type questions or requests to the AI using the text input
                    </div>
                    <div className="usage-step">
                        <strong>Navigate Responses:</strong> Use {formatKeybind(keybinds.previousResponse)} and {formatKeybind(keybinds.nextResponse)} to browse through AI responses
                    </div>
                </div>
            </div>

            <div className="option-group">
                <div className="option-label">
                    <span>Supported Profiles</span>
                </div>
                <div className="profiles-grid">
                    <div className="profile-item">
                        <div className="profile-name">Job Interview</div>
                        <div className="profile-description">Get help with interview questions and responses</div>
                    </div>
                    <div className="profile-item">
                        <div className="profile-name">Sales Call</div>
                        <div className="profile-description">Assistance with sales conversations and objection handling</div>
                    </div>
                    <div className="profile-item">
                        <div className="profile-name">Business Meeting</div>
                        <div className="profile-description">Support for professional meetings and discussions</div>
                    </div>
                    <div className="profile-item">
                        <div className="profile-name">Presentation</div>
                        <div className="profile-description">Help with presentations and public speaking</div>
                    </div>
                    <div className="profile-item">
                        <div className="profile-name">Negotiation</div>
                        <div className="profile-description">Guidance for business negotiations and deals</div>
                    </div>
                    <div className="profile-item">
                        <div className="profile-name">Exam Assistant</div>
                        <div className="profile-description">Academic assistance for test-taking and exam questions</div>
                    </div>
                </div>
            </div>

            <div className="option-group">
                <div className="option-label">
                    <span>Audio Input</span>
                </div>
                <div className="description">
                    The AI listens to conversations and provides contextual assistance based on what it hears.
                </div>
            </div>
        </div>
    );
}

export default HelpView;
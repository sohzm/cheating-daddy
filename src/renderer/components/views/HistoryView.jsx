import React, { useState, useEffect } from 'react';
import './HistoryView.css';

function HistoryView() {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('conversation');

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const loadedSessions = await window.cheatingDaddy.storage.getAllSessions();
            setSessions(loadedSessions || []);
        } catch (error) {
            console.error('Error loading conversation sessions:', error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const loadSelectedSession = async (sessionId) => {
        try {
            const session = await window.cheatingDaddy.storage.getSession(sessionId);
            if (session) {
                setSelectedSession(session);
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getProfileNames = () => ({
        interview: 'Job Interview',
        sales: 'Sales Call',
        meeting: 'Business Meeting',
        presentation: 'Presentation',
        negotiation: 'Negotiation',
        exam: 'Exam Assistant',
    });

    const getSessionPreview = (session) => {
        const parts = [];
        if (session.messageCount > 0) {
            parts.push(`${session.messageCount} messages`);
        }
        if (session.screenAnalysisCount > 0) {
            parts.push(`${session.screenAnalysisCount} screen analysis`);
        }
        if (session.profile) {
            const profileNames = getProfileNames();
            parts.push(profileNames[session.profile] || session.profile);
        }
        return parts.length > 0 ? parts.join(' • ') : 'Empty session';
    };

    const handleSessionClick = (session) => {
        loadSelectedSession(session.sessionId);
    };

    const handleBackClick = () => {
        setSelectedSession(null);
        setActiveTab('conversation');
    };

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    const renderSessionsList = () => {
        if (loading) {
            return <div className="loading">Loading conversation history...</div>;
        }

        if (sessions.length === 0) {
            return (
                <div className="empty-state">
                    <div className="empty-state-title">No conversations yet</div>
                    <div>Start a session to see your conversation history here</div>
                </div>
            );
        }

        return (
            <div className="sessions-list">
                {sessions.map(session => (
                    <div
                        key={session.sessionId}
                        className="session-item"
                        onClick={() => handleSessionClick(session)}
                    >
                        <div className="session-header">
                            <div className="session-date">{formatDate(session.createdAt)}</div>
                            <div className="session-time">{formatTime(session.createdAt)}</div>
                        </div>
                        <div className="session-preview">{getSessionPreview(session)}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderContextContent = () => {
        const { profile, customPrompt } = selectedSession;
        const profileNames = getProfileNames();

        if (!profile && !customPrompt) {
            return <div className="empty-state">No profile context available</div>;
        }

        return (
            <div className="session-context">
                {profile && (
                    <div className="session-context-row">
                        <span className="context-label">Profile:</span>
                        <span className="context-value">{profileNames[profile] || profile}</span>
                    </div>
                )}
                {customPrompt && (
                    <div className="session-context-row">
                        <span className="context-label">Custom Prompt:</span>
                        <span className="custom-prompt-value">{customPrompt}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderConversationContent = () => {
        const { conversationHistory } = selectedSession;

        // Flatten the conversation turns into individual messages
        const messages = [];
        if (conversationHistory) {
            conversationHistory.forEach(turn => {
                if (turn.transcription) {
                    messages.push({
                        type: 'user',
                        content: turn.transcription,
                        timestamp: turn.timestamp,
                    });
                }
                if (turn.ai_response) {
                    messages.push({
                        type: 'ai',
                        content: turn.ai_response,
                        timestamp: turn.timestamp,
                    });
                }
            });
        }

        if (messages.length === 0) {
            return <div className="empty-state">No conversation data available</div>;
        }

        return messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
                {message.content}
            </div>
        ));
    };

    const renderScreenAnalysisContent = () => {
        const { screenAnalysisHistory } = selectedSession;

        if (!screenAnalysisHistory || screenAnalysisHistory.length === 0) {
            return <div className="empty-state">No screen analysis data available</div>;
        }

        return screenAnalysisHistory.map((analysis, index) => (
            <div key={index} className="message screen">
                <div className="analysis-meta">
                    {formatTimestamp(analysis.timestamp)} • {analysis.model || 'unknown model'}
                </div>
                {analysis.response}
            </div>
        ));
    };

    const renderConversationView = () => {
        if (!selectedSession) return null;

        const { conversationHistory, screenAnalysisHistory, profile, customPrompt } = selectedSession;
        const hasConversation = conversationHistory && conversationHistory.length > 0;
        const hasScreenAnalysis = screenAnalysisHistory && screenAnalysisHistory.length > 0;
        const hasContext = profile || customPrompt;

        return (
            <>
                <div className="back-header">
                    <button className="back-button" onClick={handleBackClick}>
                        <svg
                            width="16px"
                            height="16px"
                            strokeWidth="1.7"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            color="currentColor"
                        >
                            <path
                                d="M15 6L9 12L15 18"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                        </svg>
                        Back to Sessions
                    </button>
                    <div className="legend">
                        <div className="legend-item">
                            <div className="legend-dot user"></div>
                            <span>Them</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-dot ai"></div>
                            <span>Suggestion</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-dot screen"></div>
                            <span>Screen</span>
                        </div>
                    </div>
                </div>
                <div className="view-tabs">
                    <button
                        className={`view-tab ${activeTab === 'conversation' ? 'active' : ''}`}
                        onClick={() => handleTabClick('conversation')}
                    >
                        Conversation {hasConversation ? `(${conversationHistory.length})` : ''}
                    </button>
                    <button
                        className={`view-tab ${activeTab === 'screen' ? 'active' : ''}`}
                        onClick={() => handleTabClick('screen')}
                    >
                        Screen {hasScreenAnalysis ? `(${screenAnalysisHistory.length})` : ''}
                    </button>
                    <button
                        className={`view-tab ${activeTab === 'context' ? 'active' : ''}`}
                        onClick={() => handleTabClick('context')}
                    >
                        Context {hasContext ? '' : '(empty)'}
                    </button>
                </div>
                <div className="conversation-view">
                    {activeTab === 'conversation'
                        ? renderConversationContent()
                        : activeTab === 'screen'
                          ? renderScreenAnalysisContent()
                          : renderContextContent()}
                </div>
            </>
        );
    };

    return (
        <div className="history-container">
            {selectedSession ? renderConversationView() : renderSessionsList()}
        </div>
    );
}

export default HistoryView;
import React, { useState, useEffect, useRef } from 'react';
import './AssistantView.css';

function AssistantView({
    responses,
    currentResponseIndex,
    selectedProfile,
    onSendText,
    shouldAnimateResponse,
    onResponseIndexChanged
}) {
    const [flashCount, setFlashCount] = useState(0);
    const [flashLiteCount, setFlashLiteCount] = useState(0);
    const responseContainerRef = useRef(null);
    const textInputRef = useRef(null);

    // Load limits on mount
    useEffect(() => {
        loadLimits();
    }, []);

    // Set up IPC listeners for keyboard shortcuts
    useEffect(() => {
        if (!window.require) return;

        const { ipcRenderer } = window.require('electron');

        const handlePreviousResponse = () => {
            console.log('Received navigate-previous-response message');
            navigateToPreviousResponse();
        };

        const handleNextResponse = () => {
            console.log('Received navigate-next-response message');
            navigateToNextResponse();
        };

        const handleScrollUp = () => {
            console.log('Received scroll-response-up message');
            scrollResponseUp();
        };

        const handleScrollDown = () => {
            console.log('Received scroll-response-down message');
            scrollResponseDown();
        };

        ipcRenderer.on('navigate-previous-response', handlePreviousResponse);
        ipcRenderer.on('navigate-next-response', handleNextResponse);
        ipcRenderer.on('scroll-response-up', handleScrollUp);
        ipcRenderer.on('scroll-response-down', handleScrollDown);

        return () => {
            ipcRenderer.removeListener('navigate-previous-response', handlePreviousResponse);
            ipcRenderer.removeListener('navigate-next-response', handleNextResponse);
            ipcRenderer.removeListener('scroll-response-up', handleScrollUp);
            ipcRenderer.removeListener('scroll-response-down', handleScrollDown);
        };
    }, []);

    // Update response content when it changes
    useEffect(() => {
        updateResponseContent();
    }, [responses, currentResponseIndex]);

    const loadLimits = async () => {
        if (window.cheatingDaddy?.storage?.getTodayLimits) {
            const limits = await window.cheatingDaddy.storage.getTodayLimits();
            setFlashCount(limits.flash?.count || 0);
            setFlashLiteCount(limits.flashLite?.count || 0);
        }
    };

    const getProfileNames = () => ({
        interview: 'Job Interview',
        sales: 'Sales Call',
        meeting: 'Business Meeting',
        presentation: 'Presentation',
        negotiation: 'Negotiation',
        exam: 'Exam Assistant',
    });

    const getCurrentResponse = () => {
        const profileNames = getProfileNames();
        return responses.length > 0 && currentResponseIndex >= 0
            ? responses[currentResponseIndex]
            : `Hey, I'm listening to your ${profileNames[selectedProfile] || 'session'}?`;
    };

    const renderMarkdown = (content) => {
        if (typeof window !== 'undefined' && window.marked) {
            try {
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false,
                });
                let rendered = window.marked.parse(content);
                rendered = wrapWordsInSpans(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content;
            }
        }
        console.log('Marked not available, using plain text');
        return content;
    };

    const wrapWordsInSpans = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tagsToSkip = ['PRE'];

        function wrap(node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && !tagsToSkip.includes(node.parentNode.tagName)) {
                const words = node.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                words.forEach(word => {
                    if (word.trim()) {
                        const span = document.createElement('span');
                        span.setAttribute('data-word', '');
                        span.textContent = word;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(word));
                    }
                });
                node.parentNode.replaceChild(frag, node);
            } else if (node.nodeType === Node.ELEMENT_NODE && !tagsToSkip.includes(node.tagName)) {
                Array.from(node.childNodes).forEach(wrap);
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    };

    const updateResponseContent = () => {
        console.log('updateResponseContent called');
        if (responseContainerRef.current) {
            const currentResponse = getCurrentResponse();
            console.log('Current response:', currentResponse);
            const renderedResponse = renderMarkdown(currentResponse);
            console.log('Rendered response:', renderedResponse);
            responseContainerRef.current.innerHTML = renderedResponse;
        }
    };

    const getResponseCounter = () => {
        return responses.length > 0 ? `${currentResponseIndex + 1}/${responses.length}` : '';
    };

    const navigateToPreviousResponse = () => {
        if (currentResponseIndex > 0) {
            onResponseIndexChanged?.(currentResponseIndex - 1);
        }
    };

    const navigateToNextResponse = () => {
        if (currentResponseIndex < responses.length - 1) {
            onResponseIndexChanged?.(currentResponseIndex + 1);
        }
    };

    const scrollResponseUp = () => {
        if (responseContainerRef.current) {
            const scrollAmount = responseContainerRef.current.clientHeight * 0.3;
            responseContainerRef.current.scrollTop = Math.max(0, responseContainerRef.current.scrollTop - scrollAmount);
        }
    };

    const scrollResponseDown = () => {
        if (responseContainerRef.current) {
            const scrollAmount = responseContainerRef.current.clientHeight * 0.3;
            const maxScroll = responseContainerRef.current.scrollHeight - responseContainerRef.current.clientHeight;
            responseContainerRef.current.scrollTop = Math.min(maxScroll, responseContainerRef.current.scrollTop + scrollAmount);
        }
    };

    const handleSendText = async () => {
        if (textInputRef.current && textInputRef.current.value.trim()) {
            const message = textInputRef.current.value.trim();
            textInputRef.current.value = '';
            await onSendText(message);
        }
    };

    const handleTextKeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
        }
    };

    const getTotalUsed = () => {
        return flashCount + flashLiteCount;
    };

    const getTotalAvailable = () => {
        return 40; // 20 flash + 20 flash-lite
    };

    const handleScreenAnswer = async () => {
        if (window.captureManualScreenshot) {
            window.captureManualScreenshot();
            setTimeout(() => loadLimits(), 1000);
        }
    };

    const responseCounter = getResponseCounter();

    return (
        <div className="assistant-view">
            <div className="response-container" ref={responseContainerRef}></div>

            <div className="text-input-container">
                <button
                    className="nav-button"
                    onClick={navigateToPreviousResponse}
                    disabled={currentResponseIndex <= 0}
                >
                    <svg width="24px" height="24px" strokeWidth="1.7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                </button>

                {responses.length > 0 && <span className="response-counter">{responseCounter}</span>}

                <button
                    className="nav-button"
                    onClick={navigateToNextResponse}
                    disabled={currentResponseIndex >= responses.length - 1}
                >
                    <svg width="24px" height="24px" strokeWidth="1.7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                </button>

                <input
                    type="text"
                    ref={textInputRef}
                    placeholder="Type a message to the AI..."
                    onKeyDown={handleTextKeydown}
                />

                <div className="screen-answer-btn-wrapper">
                    <div className="tooltip">
                        <div className="tooltip-row">
                            <span className="tooltip-label">Flash</span>
                            <span className="tooltip-value">{flashCount}/20</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-label">Flash Lite</span>
                            <span className="tooltip-value">{flashLiteCount}/20</span>
                        </div>
                        <div className="tooltip-note">Resets every 24 hours</div>
                    </div>
                    <button className="screen-answer-btn" onClick={handleScreenAnswer}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                        </svg>
                        <span>Analyze screen</span>
                        <span className="usage-count">({getTotalUsed()}/{getTotalAvailable()})</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AssistantView;
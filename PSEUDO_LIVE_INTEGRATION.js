/**
 * ============================================================================
 * PSEUDO-LIVE INTERVIEW ASSISTANT - QUICK INTEGRATION GUIDE
 * ============================================================================
 * 
 * This file shows you how to integrate the pseudo-live orchestrator into
 * your Electron app. Copy these patterns into your renderer process.
 * 
 * NO MANUAL WIRING NEEDED - Everything is pre-integrated!
 * 
 * @author Senior SDE (Claude)
 * @version 2.0.0
 */

// ============================================================================
// 1. INITIALIZATION (On App Startup)
// ============================================================================

async function initializePseudoLiveSystem() {
    try {
        console.log('🚀 Initializing Pseudo-Live Interview Assistant...');
        
        // Get API key from settings
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            throw new Error('API key not configured');
        }
        
        // Get user preferences
        const vadMode = localStorage.getItem('vadMode') || 'automatic';
        const language = localStorage.getItem('language') || 'en-US';
        
        // Step 1: Enable pseudo-live mode
        const enableResult = await window.api.enablePseudoLive(true);
        if (!enableResult.success) {
            throw new Error('Failed to enable pseudo-live mode');
        }
        console.log('✅ Pseudo-live mode enabled');
        
        // Step 2: Initialize orchestrator
        const initResult = await window.api.initializePseudoLive({
            apiKey: apiKey,
            vadMode: vadMode,
            language: language,
        });
        
        if (!initResult.success) {
            throw new Error(`Initialization failed: ${initResult.error}`);
        }
        console.log('✅ Orchestrator initialized');
        
        // Step 3: Start audio capture (macOS)
        if (window.api.platform === 'darwin') {
            const audioResult = await window.api.startMacOSAudio(true, vadMode);
            if (!audioResult.success) {
                throw new Error('Failed to start audio capture');
            }
            console.log('✅ Audio capture started');
        }
        
        // Step 4: Setup event listeners
        setupPseudoLiveEventListeners();
        console.log('✅ Event listeners configured');
        
        // Step 5: Start performance monitoring
        startPerformanceMonitoring();
        console.log('✅ Performance monitoring active');
        
        console.log('🎉 Pseudo-Live Interview Assistant ready!');
        console.log('🎯 Target latency: 400-800ms end-to-end');
        
        return true;
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showErrorNotification('Failed to initialize interview assistant: ' + error.message);
        return false;
    }
}

// ============================================================================
// 2. EVENT LISTENERS (Real-Time Updates)
// ============================================================================

function setupPseudoLiveEventListeners() {
    // Partial transcript (interim results during speech)
    window.api.on('transcript-partial', (data) => {
        const { transcript, timestamp } = data;
        console.log('📝 Partial:', transcript);
        
        // Update UI with interim transcript
        updateTranscriptUI(transcript, false);
    });
    
    // Complete transcript (question fully transcribed)
    window.api.on('transcript-complete', (data) => {
        const { transcript, metadata, timestamp } = data;
        console.log('✅ Complete:', transcript);
        console.log('    Duration:', metadata.duration + 'ms');
        
        // Update UI with final transcript
        updateTranscriptUI(transcript, true);
        
        // Show "thinking" indicator
        showThinkingIndicator();
    });
    
    // Gemini processing started
    window.api.on('gemini-processing', (data) => {
        const { transcript, timestamp } = data;
        console.log('🤖 Processing question:', transcript);
        
        // Update status
        updateStatusUI('Generating answer...');
    });
    
    // Gemini response (answer stream)
    window.api.on('update-response', (response) => {
        console.log('💬 Answer:', response);
        
        // Update answer UI (streaming)
        updateAnswerUI(response);
        
        // Hide thinking indicator
        hideThinkingIndicator();
    });
    
    // VAD state changes
    window.api.on('vad-state-change', (data) => {
        const { state, message, timestamp } = data;
        console.log('🔄 VAD State:', state, '-', message);
        
        // Update status indicator
        updateVADStatusUI(state, message);
    });
    
    // Microphone toggled (manual mode)
    window.api.on('microphone-toggled', (data) => {
        const { enabled, timestamp } = data;
        console.log('🎤 Microphone:', enabled ? 'ON' : 'OFF');
        
        // Update mic button UI
        updateMicrophoneButtonUI(enabled);
    });
    
    // Orchestrator status updates
    window.api.on('orchestrator-status', (data) => {
        const { status, mode, language } = data;
        console.log('📊 Status:', status);
        
        if (status === 'active') {
            showSuccessNotification('Interview assistant active');
        } else if (status === 'stopped') {
            showInfoNotification('Interview assistant stopped');
        } else if (status === 'error') {
            showErrorNotification('Error: ' + data.error);
        }
    });
    
    // Errors
    window.api.on('orchestrator-error', (data) => {
        const { error, timestamp } = data;
        console.error('❌ Error:', error);
        
        // Show user-friendly error
        showErrorNotification('Error processing audio. Please try again.');
    });
}

// ============================================================================
// 3. PERFORMANCE MONITORING (Production Metrics)
// ============================================================================

function startPerformanceMonitoring() {
    // Check metrics every 10 seconds
    setInterval(async () => {
        try {
            const result = await window.api.getPseudoLiveMetrics();
            if (!result.success) return;
            
            const metrics = result.metrics;
            console.log('📊 Performance Metrics:');
            console.log('    • Requests:', metrics.totalRequests);
            console.log('    • Success rate:', metrics.successRate + '%');
            console.log('    • Avg latency:', metrics.avgLatency + 'ms');
            console.log('    • P50:', metrics.p50 + 'ms');
            console.log('    • P95:', metrics.p95 + 'ms');
            console.log('    • Within target:', metrics.withinTarget ? '✓' : '✗');
            
            // Update metrics UI
            updateMetricsUI(metrics);
            
            // Alert on high latency
            if (metrics.avgLatency > 1000) {
                console.warn('⚠️ High latency detected:', metrics.avgLatency + 'ms');
                showWarningNotification('High latency detected. Check your connection.');
            }
            
            // Alert on low success rate
            if (parseFloat(metrics.successRate) < 90) {
                console.warn('⚠️ Low success rate:', metrics.successRate + '%');
                showWarningNotification('Multiple errors detected. Please restart the session.');
            }
        } catch (error) {
            console.error('Error getting metrics:', error);
        }
    }, 10000); // Every 10 seconds
}

// ============================================================================
// 4. USER CONTROLS (Manual Mode)
// ============================================================================

// Toggle microphone (manual mode only)
async function toggleMicrophone(enabled) {
    try {
        const result = await window.api.togglePseudoLiveMicrophone(enabled);
        if (!result.success) {
            throw new Error('Failed to toggle microphone');
        }
        
        console.log('🎤 Microphone', enabled ? 'ON' : 'OFF');
        updateMicrophoneButtonUI(enabled);
        
        return true;
    } catch (error) {
        console.error('Error toggling microphone:', error);
        showErrorNotification('Failed to toggle microphone: ' + error.message);
        return false;
    }
}

// Switch VAD mode
async function switchVADMode(newMode) {
    try {
        const result = await window.api.updatePseudoLiveVADMode(newMode);
        if (!result.success) {
            throw new Error('Failed to update VAD mode');
        }
        
        console.log('🔄 VAD mode updated to:', newMode);
        showSuccessNotification('VAD mode: ' + newMode);
        
        // Save preference
        localStorage.setItem('vadMode', newMode);
        
        return true;
    } catch (error) {
        console.error('Error updating VAD mode:', error);
        showErrorNotification('Failed to update VAD mode: ' + error.message);
        return false;
    }
}

// Change language
async function changeLanguage(languageCode) {
    try {
        const result = await window.api.updatePseudoLiveLanguage(languageCode);
        if (!result.success) {
            throw new Error('Failed to update language');
        }
        
        console.log('🌍 Language updated to:', languageCode);
        showSuccessNotification('Language: ' + languageCode);
        
        // Save preference
        localStorage.setItem('language', languageCode);
        
        return true;
    } catch (error) {
        console.error('Error updating language:', error);
        showErrorNotification('Failed to update language: ' + error.message);
        return false;
    }
}

// Get current status
async function getSystemStatus() {
    try {
        const result = await window.api.getPseudoLiveStatus();
        if (!result.success) {
            throw new Error('Failed to get status');
        }
        
        const status = result.status;
        console.log('📊 System Status:');
        console.log('    • Active:', status.isActive);
        console.log('    • VAD Mode:', status.vadMode);
        console.log('    • Language:', status.language);
        console.log('    • VAD State:', status.vadState);
        console.log('    • Circuit Breaker:', status.circuitBreaker.state);
        
        return status;
    } catch (error) {
        console.error('Error getting status:', error);
        return null;
    }
}

// ============================================================================
// 5. CLEANUP (On App Shutdown)
// ============================================================================

async function shutdownPseudoLiveSystem() {
    try {
        console.log('🛑 Shutting down Pseudo-Live Interview Assistant...');
        
        // Stop orchestrator
        const result = await window.api.stopPseudoLive();
        if (!result.success) {
            console.error('Failed to stop orchestrator:', result.error);
        }
        
        // Stop audio capture
        if (window.api.platform === 'darwin') {
            await window.api.stopMacOSAudio();
        }
        
        console.log('✅ Shutdown complete');
        return true;
    } catch (error) {
        console.error('❌ Shutdown error:', error);
        return false;
    }
}

// Register cleanup on window close
window.addEventListener('beforeunload', async (e) => {
    await shutdownPseudoLiveSystem();
});

// ============================================================================
// 6. UI UPDATE FUNCTIONS (Customize These)
// ============================================================================

function updateTranscriptUI(transcript, isFinal) {
    const transcriptElement = document.getElementById('transcript');
    if (!transcriptElement) return;
    
    transcriptElement.textContent = transcript;
    transcriptElement.className = isFinal ? 'transcript-final' : 'transcript-partial';
}

function updateAnswerUI(answer) {
    const answerElement = document.getElementById('answer');
    if (!answerElement) return;
    
    answerElement.textContent = answer;
}

function updateStatusUI(status) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    statusElement.textContent = status;
}

function updateVADStatusUI(state, message) {
    const vadStatusElement = document.getElementById('vad-status');
    if (!vadStatusElement) return;
    
    vadStatusElement.textContent = message;
    vadStatusElement.className = 'vad-status-' + state.toLowerCase();
}

function updateMicrophoneButtonUI(enabled) {
    const micButton = document.getElementById('mic-button');
    if (!micButton) return;
    
    micButton.textContent = enabled ? '🎤 Mic ON' : '🔴 Mic OFF';
    micButton.className = enabled ? 'mic-on' : 'mic-off';
}

function updateMetricsUI(metrics) {
    const metricsElement = document.getElementById('metrics');
    if (!metricsElement) return;
    
    metricsElement.innerHTML = `
        <div class="metric">
            <span class="metric-label">Requests:</span>
            <span class="metric-value">${metrics.totalRequests}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Success Rate:</span>
            <span class="metric-value">${metrics.successRate}%</span>
        </div>
        <div class="metric">
            <span class="metric-label">Avg Latency:</span>
            <span class="metric-value">${metrics.avgLatency}ms</span>
        </div>
        <div class="metric">
            <span class="metric-label">P95:</span>
            <span class="metric-value">${metrics.p95}ms</span>
        </div>
    `;
}

function showThinkingIndicator() {
    const indicator = document.getElementById('thinking-indicator');
    if (indicator) indicator.style.display = 'block';
}

function hideThinkingIndicator() {
    const indicator = document.getElementById('thinking-indicator');
    if (indicator) indicator.style.display = 'none';
}

function showSuccessNotification(message) {
    console.log('✅', message);
    // Add your notification UI here
}

function showErrorNotification(message) {
    console.error('❌', message);
    // Add your notification UI here
}

function showWarningNotification(message) {
    console.warn('⚠️', message);
    // Add your notification UI here
}

function showInfoNotification(message) {
    console.log('ℹ️', message);
    // Add your notification UI here
}

// ============================================================================
// 7. EXAMPLE USAGE
// ============================================================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎬 Initializing interview assistant...');
    
    const success = await initializePseudoLiveSystem();
    if (success) {
        console.log('🎉 Ready for interviews!');
    } else {
        console.error('Failed to initialize. Please check your settings.');
    }
});

// Example: Manual mode microphone button
document.getElementById('mic-button')?.addEventListener('click', async () => {
    const currentState = document.getElementById('mic-button').classList.contains('mic-on');
    await toggleMicrophone(!currentState);
});

// Example: VAD mode selector
document.getElementById('vad-mode-select')?.addEventListener('change', async (e) => {
    await switchVADMode(e.target.value);
});

// Example: Language selector
document.getElementById('language-select')?.addEventListener('change', async (e) => {
    await changeLanguage(e.target.value);
});

// Example: Status button
document.getElementById('status-button')?.addEventListener('click', async () => {
    const status = await getSystemStatus();
    if (status) {
        alert(JSON.stringify(status, null, 2));
    }
});

// ============================================================================
// 8. ADVANCED FEATURES
// ============================================================================

// Auto-restart on failure
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;

window.api.on('orchestrator-error', async (data) => {
    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++;
        console.log(`Attempting auto-restart (${restartAttempts}/${MAX_RESTART_ATTEMPTS})...`);
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
        
        const success = await initializePseudoLiveSystem();
        if (success) {
            console.log('✅ Auto-restart successful');
            restartAttempts = 0; // Reset counter
        }
    } else {
        console.error('❌ Max restart attempts reached. Manual intervention required.');
        showErrorNotification('System failed to recover. Please restart the application.');
    }
});

// Health check
setInterval(async () => {
    const status = await getSystemStatus();
    if (status && !status.isActive) {
        console.warn('⚠️ System inactive. Consider restarting.');
    }
}, 60000); // Every minute

// ============================================================================
// THAT'S IT! NO MANUAL WIRING NEEDED.
// 
// The orchestrator is fully integrated with:
// ✅ Audio capture (SystemAudioDump)
// ✅ VAD processor (speech detection)
// ✅ STT service (Gemini native)
// ✅ Gemini API (answer generation)
// ✅ Error handling (circuit breaker)
// ✅ Performance monitoring (real-time metrics)
// ✅ Event system (real-time updates)
// 
// Just call initializePseudoLiveSystem() and you're good to go!
// ============================================================================

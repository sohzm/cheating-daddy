/**
 * Integration Guide: Pseudo-Live Interview Assistant
 * 
 * This file documents how to integrate the pseudo-live architecture into gemini.js
 * 
 * Architecture: Audio → VAD → Streaming STT → Gemini
 * Target Latency: 400-800ms end-to-end
 * 
 * Integration Points:
 * 1. Replace Live API calls with pseudo-live orchestrator
 * 2. Connect SystemAudioDump → Orchestrator
 * 3. Connect Orchestrator → Gemini session
 * 4. Update UI event handlers
 */

// ============================================================================
// INTEGRATION STEP 1: Add imports to gemini.js
// ============================================================================

// Add these imports at the top of gemini.js:
const { PseudoLiveOrchestrator } = require('./pseudoLiveOrchestrator');

// ============================================================================
// INTEGRATION STEP 2: Initialize orchestrator
// ============================================================================

// Add this variable at the module level in gemini.js:
let pseudoLiveOrchestrator = null;

// ============================================================================
// INTEGRATION STEP 3: Modify initializeGeminiSession function
// ============================================================================

// In initializeGeminiSession, after creating the Gemini session, initialize orchestrator:

/*
async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnection = false, mode = 'interview', model = 'gemini-2.5-flash') {
    // ... existing code ...
    
    if (mode === 'interview') {
        // REPLACE Live API code with pseudo-live orchestrator
        
        // Clean up existing orchestrator if any
        if (pseudoLiveOrchestrator) {
            pseudoLiveOrchestrator.destroy();
        }
        
        // Initialize pseudo-live orchestrator
        pseudoLiveOrchestrator = new PseudoLiveOrchestrator(
            geminiSessionRef,
            sendToRenderer
        );
        
        // Get VAD settings from localStorage
        const vadEnabled = await getStoredSetting('vadEnabled', 'true') === 'true';
        const vadMode = await getStoredSetting('vadMode', 'automatic');
        
        // Initialize the complete pipeline: VAD → STT → Gemini
        await pseudoLiveOrchestrator.initialize(apiKey, vadMode, language);
        
        console.log('✅ [GEMINI] Pseudo-live pipeline initialized');
        console.log('    Architecture: Audio → VAD → STT → Gemini');
        console.log('    Target latency: 400-800ms');
        
        // Create a session object that mimics Live API interface
        session = {
            mode: 'pseudo-live',
            orchestrator: pseudoLiveOrchestrator,
            isClosed: false,
            
            async sendRealtimeInput(input) {
                if (this.isClosed) return;
                
                // Handle text input (from user typing)
                if (input.text) {
                    const genaiClient = new GoogleGenerativeAI(apiKey);
                    const model = genaiClient.getGenerativeModel({ 
                        model: 'gemini-2.5-flash',
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                    });
                    
                    const result = await model.generateContent(input.text);
                    const response = result.response.text();
                    
                    sendToRenderer('update-response', response);
                }
                
                // Audio input is handled automatically by orchestrator
                // No need to manually send audio chunks
            },
            
            async close() {
                this.isClosed = true;
                if (this.orchestrator) {
                    this.orchestrator.stop();
                }
            }
        };
        
        isSessionReady = true;
        sendToRenderer('update-status', 'Listening...');
    }
    
    // ... rest of existing code ...
}
*/

// ============================================================================
// INTEGRATION STEP 4: Modify startMacOSAudioCapture function
// ============================================================================

// In startMacOSAudioCapture, route audio to orchestrator instead of Gemini:

/*
systemAudioProc.stdout.on('data', data => {
    audioBuffer = Buffer.concat([audioBuffer, data]);

    while (audioBuffer.length >= CHUNK_SIZE) {
        const chunk = audioBuffer.slice(0, CHUNK_SIZE);
        audioBuffer = audioBuffer.slice(CHUNK_SIZE);

        const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk;

        // REPLACE VAD processing with orchestrator
        if (pseudoLiveOrchestrator && pseudoLiveOrchestrator.isActive) {
            // Convert PCM buffer to Float32Array for orchestrator
            const float32Audio = convertPCMBufferToFloat32(monoChunk);
            
            // Send to orchestrator (which handles VAD → STT → Gemini)
            pseudoLiveOrchestrator.processAudioFrame(float32Audio);
        }

        if (process.env.DEBUG_AUDIO) {
            console.log(`Processed audio chunk: ${chunk.length} bytes`);
            saveDebugAudio(monoChunk, 'system_audio');
        }
    }
});
*/

// ============================================================================
// INTEGRATION STEP 5: Update IPC handlers
// ============================================================================

// Add these IPC handlers to setupGeminiIpcHandlers:

/*
// Handle microphone toggle (for manual VAD mode)
ipcMain.handle('toggle-microphone', async (event, enabled) => {
    try {
        if (pseudoLiveOrchestrator) {
            pseudoLiveOrchestrator.toggleMicrophone(enabled);
            return { success: true, enabled };
        }
        return { success: false, error: 'Orchestrator not initialized' };
    } catch (error) {
        console.error('Error toggling microphone:', error);
        return { success: false, error: error.message };
    }
});

// Handle VAD mode update
ipcMain.handle('update-vad-mode', async (event, vadMode) => {
    try {
        if (pseudoLiveOrchestrator) {
            pseudoLiveOrchestrator.updateVADMode(vadMode);
            return { success: true, mode: vadMode };
        }
        return { success: false, error: 'Orchestrator not initialized' };
    } catch (error) {
        console.error('Error updating VAD mode:', error);
        return { success: false, error: error.message };
    }
});

// Handle language update
ipcMain.handle('update-interview-language', async (event, languageCode) => {
    try {
        if (pseudoLiveOrchestrator) {
            pseudoLiveOrchestrator.updateLanguage(languageCode);
            return { success: true, language: languageCode };
        }
        return { success: false, error: 'Orchestrator not initialized' };
    } catch (error) {
        console.error('Error updating language:', error);
        return { success: false, error: error.message };
    }
});

// Get orchestrator status and metrics
ipcMain.handle('get-orchestrator-status', async (event) => {
    try {
        if (pseudoLiveOrchestrator) {
            const status = pseudoLiveOrchestrator.getStatus();
            return { success: true, status };
        }
        return { success: false, error: 'Orchestrator not initialized' };
    } catch (error) {
        console.error('Error getting orchestrator status:', error);
        return { success: false, error: error.message };
    }
});
*/

// ============================================================================
// INTEGRATION STEP 6: Update stopMacOSAudioCapture function
// ============================================================================

// In stopMacOSAudioCapture, clean up orchestrator:

/*
function stopMacOSAudioCapture() {
    // Clean up orchestrator
    if (pseudoLiveOrchestrator) {
        pseudoLiveOrchestrator.destroy();
        pseudoLiveOrchestrator = null;
        console.log('[GEMINI] Pseudo-live orchestrator destroyed');
    }

    if (systemAudioProc) {
        console.log('Stopping SystemAudioDump...');
        systemAudioProc.kill('SIGTERM');
        systemAudioProc = null;
    }
}
*/

// ============================================================================
// BENEFITS OF THIS ARCHITECTURE
// ============================================================================

/*
 * 1. NO LIVE API DEPENDENCY
 *    - Works with ANY Gemini model (2.5 Flash, 2.5 Pro, etc.)
 *    - Not gated by Live API access restrictions
 *    - Can upgrade to Live API later with minimal changes
 * 
 * 2. PRODUCTION-STABLE
 *    - Proper error handling and recovery
 *    - Metrics tracking for performance monitoring
 *    - Modular architecture (easy to debug/maintain)
 * 
 * 3. NEAR REAL-TIME PERFORMANCE
 *    - Target: 400-800ms end-to-end latency
 *    - Breakdown:
 *      - Audio capture: 10-50ms
 *      - VAD processing: 10-50ms
 *      - Streaming STT: 100-300ms
 *      - Gemini response: 200-500ms
 * 
 * 4. BETTER USER EXPERIENCE
 *    - Proper VAD for accurate speech detection
 *    - Clean question boundaries (no partial/interrupted transcripts)
 *    - Manual mode support for push-to-talk
 *    - Real-time UI feedback (partial transcripts, status updates)
 * 
 * 5. SCALABLE AND MAINTAINABLE
 *    - Each component (VAD, STT, Orchestrator) is independent
 *    - Easy to swap STT providers (Google → Azure → AWS)
 *    - Clear separation of concerns
 *    - Comprehensive logging for debugging
 */

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/*
 * Before deploying to production:
 * 
 * 1. Test automatic VAD mode:
 *    - Verify speech detection works reliably
 *    - Check silence threshold is appropriate (600ms)
 *    - Ensure questions are not cut off prematurely
 * 
 * 2. Test manual VAD mode:
 *    - Verify push-to-talk functionality
 *    - Check microphone toggle works correctly
 *    - Ensure audio is committed when mic is turned off
 * 
 * 3. Test latency targets:
 *    - Monitor end-to-end latency (should be 400-800ms)
 *    - Check STT latency (should be 100-300ms)
 *    - Verify Gemini response time (should be 200-500ms)
 * 
 * 4. Test error handling:
 *    - Simulate network failures
 *    - Test API key expiration
 *    - Verify graceful degradation
 * 
 * 5. Test edge cases:
 *    - Very short questions (<200ms)
 *    - Very long questions (>30s)
 *    - Rapid-fire questions
 *    - Background noise
 *    - Multiple speakers
 * 
 * 6. Test language support:
 *    - Verify all supported languages work
 *    - Check language switching during session
 *    - Test multilingual input
 */

module.exports = {
    // Integration notes only - no exports needed
};

const { GoogleGenAI } = require('@google/genai');
const { ipcRenderer } = require('electron');
const { sendToPeers } = require('./networking');  // Hook for sending AI to devices

let conversationHistory = [];

// Example AI generation (hook to your GUI input)
function saveConversationTurn(transcription, aiResponse) {
  conversationHistory.push({ transcription, aiResponse });
  sendToPeers({ content: aiResponse }, null, 'ai_response');  // Send to devices
  ipcRenderer.send('update-gui-response', aiResponse);  // Relay to React GUI
}

// Existing Gemini logic...

module.exports = { saveConversationTurn };

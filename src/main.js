const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeRandomProcessNames } = require('./processRandomizer');
const { createWindow } = require('./window');
const { startDCFServices, discoverPeers, validateConfig, monitorPerformance, sendToPeers } = require('./networking');

// Startup
app.whenReady().then(() => {
  initializeRandomProcessNames();
  const mainWindow = createWindow();
  validateConfig();
  startDCFServices();
  discoverPeers();
  monitorPerformance();
});

// IPC for GUI hooks (easy to call from React)
ipcMain.handle('dcf-discover-peers', async () => {
  discoverPeers();
  return { success: true, message: 'Discovery started' };
});

ipcMain.handle('dcf-send-to-peers', async (event, { payload, recipient, type }) => {
  try {
    await sendToPeers(payload, recipient, type);
    return { success: true, message: 'Data sent' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Relay events to renderer (e.g., for React state updates)
ipcMain.on('peer-discovered', (event, address) => {
  event.sender.send('dcf-peer-discovered', address);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

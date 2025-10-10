const { BrowserWindow } = require('electron');

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

module.exports = {
    sendToRenderer
};

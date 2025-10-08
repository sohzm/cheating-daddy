const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, cb) => ipcRenderer.on(channel, (_, data) => cb(data))
});
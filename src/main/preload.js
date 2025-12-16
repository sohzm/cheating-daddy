// Preload script - exposes safe APIs to the renderer process
const { contextBridge, ipcRenderer } = require('electron');

console.log('✅ Preload script executing...');

// Expose electron APIs to the renderer
const electronAPI = {
    ipcRenderer: {
        send: (channel, ...args) => {
            console.log(`IPC Send: ${channel}`, args);
            return ipcRenderer.send(channel, ...args);
        },
        on: (channel, func) => {
            const subscription = (event, ...args) => func(event, ...args);
            ipcRenderer.on(channel, subscription);
            return () => ipcRenderer.removeListener(channel, subscription);
        },
        once: (channel, func) => {
            ipcRenderer.once(channel, (event, ...args) => func(event, ...args));
        },
        invoke: async (channel, ...args) => {
            console.log(`IPC Invoke: ${channel}`, args);
            return await ipcRenderer.invoke(channel, ...args);
        },
        removeListener: (channel, func) => {
            return ipcRenderer.removeListener(channel, func);
        },
        removeAllListeners: (channel) => {
            return ipcRenderer.removeAllListeners(channel);
        },
    },
    process: {
        platform: process.platform,
    }
};

contextBridge.exposeInMainWorld('electron', electronAPI);

// Expose require for backward compatibility with renderer.js
contextBridge.exposeInMainWorld('require', (module) => {
    if (module === 'electron') {
        return { ipcRenderer: electronAPI.ipcRenderer };
    }
    throw new Error(`Module ${module} is not allowed`);
});

console.log('✅ Preload script complete - APIs exposed to renderer');

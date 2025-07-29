// src/main/globals.js
const { BrowserWindow, ipcMain } = require('electron');

class ElectronGlobals {
    constructor() {
        // Valores por defecto

        this._data = {
            selectedAppLanguage: 'es-ES',
            selectedProfile: 'interview',
            backgroundTransparency: 0.8,
            fontSize: 20,
            windowSettings: {},
            userPreferences: {}
        };
        
        // Listeners para cambios
        this._listeners = {};
        
        // Configurar IPC handlers
        this.setupIPC();
        
        console.log('[Main] ElectronGlobals initialized');
    }

    // Getter genérico
    get(key) {
        const value = this._data[key];
        console.log(`[Main] Getting ${key}:`, value);
        return value;
    }

    // Setter genérico
    set(key, value) {
        const oldValue = this._data[key];
        this._data[key] = value;
        
        console.log(`[Main] Setting ${key}: ${oldValue} -> ${value}`);
        
        // Notificar a todos los renderer processes
        this.notifyRenderers(key, value, oldValue);
        
        // Notificar listeners locales del main process
        this.notifyLocalListeners(key, value, oldValue);
        
        return true;
    }

    // Getters y setters específicos
    get selectedAppLanguage() {
        return this._data.selectedAppLanguage;
    }

    set selectedAppLanguage(value) {
        this.set('selectedAppLanguage', value);
    }

    get selectedProfile() {
        return this._data.selectedProfile;
    }

    set selectedProfile(value) {
        this.set('selectedProfile', value);
    }

    get backgroundTransparency() {
        return this._data.backgroundTransparency;
    }

    set backgroundTransparency(value) {
        this.set('backgroundTransparency', parseFloat(value));
    }

    get fontSize() {
        return this._data.fontSize;
    }

    set fontSize(value) {
        this.set('fontSize', parseInt(value, 10));
    }

    // Notificar a todos los renderer processes
    notifyRenderers(key, value, oldValue) {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            if (window && !window.isDestroyed()) {
                window.webContents.send('global-changed', {
                    key,
                    value,
                    oldValue,
                    timestamp: Date.now()
                });
            }
        });
    }

    // Notificar listeners del main process
    notifyLocalListeners(key, value, oldValue) {
        if (this._listeners[key]) {
            this._listeners[key].forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error(`[Main] Error in listener for ${key}:`, error);
                }
            });
        }
    }

    // Suscribirse a cambios en el main process
    onChange(key, callback) {
        if (!this._listeners[key]) {
            this._listeners[key] = [];
        }
        this._listeners[key].push(callback);
        console.log(`[Main] Listener added for ${key}`);
    }

    // Configurar IPC communication
    setupIPC() {
        // Handler para obtener valores
        ipcMain.handle('globals-get', (event, key) => {
            const value = this.get(key);
            console.log(`[Main IPC] Get request for ${key}:`, value);
            return value;
        });

        // Handler para obtener todos los valores
        ipcMain.handle('globals-get-all', (event) => {
            console.log('[Main IPC] Get all request');
            return { ...this._data };
        });

        // Handler para establecer valores
        ipcMain.handle('globals-set', (event, key, value) => {
            console.log(`[Main IPC] Set request for ${key}:`, value);
            return this.set(key, value);
        });

        // Handler para establecer múltiples valores
        ipcMain.handle('globals-set-multiple', (event, updates) => {
            console.log('[Main IPC] Set multiple request:', updates);
            Object.entries(updates).forEach(([key, value]) => {
                this.set(key, value);
            });
            return true;
        });

        console.log('[Main] IPC handlers configured');
    }

    // Obtener todos los valores
    getAll() {
        return { ...this._data };
    }

    // Para debugging
    debug() {
        console.log('[Main] Current globals state:', this._data);
        console.log('[Main] Active listeners:', Object.keys(this._listeners));
        return {
            data: this._data,
            listeners: Object.keys(this._listeners)
        };
    }
}

// Crear instancia única
const electronGlobals = new ElectronGlobals();

//Hacer disponible globalmente en el main process
global.electronGlobals = electronGlobals;
module.exports = electronGlobals;



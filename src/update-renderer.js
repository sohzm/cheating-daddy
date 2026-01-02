import { html, render } from './assets/lit-core-2.7.4.min.js';
import { UpdateDialog } from './components/dialogs/UpdateDialog.js';

const { ipcRenderer } = require('electron');

// Container for the dialog
const container = document.getElementById('update-container');

// Listen for update information
ipcRenderer.on('update-info', (event, updateInfo) => {
    console.log('Received update info in separate window:', updateInfo);

    render(html`
        <update-dialog
            .updateInfo=${updateInfo}
            .onClose=${(action) => {
            ipcRenderer.send('close-update-window', action);
        }}
        ></update-dialog>
    `, container);
});

// Optional: sync theme from main process or storage
// For now, we'll just use the default dark theme as established in update.html style

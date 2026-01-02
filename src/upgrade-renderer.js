import { html, render } from './assets/lit-core-2.7.4.min.js';
import { UpgradeDialog } from './components/dialogs/UpgradeDialog.js';

// Container for the dialog
const container = document.getElementById('upgrade-container');

// Listen for upgrade information using the secure electronAPI
window.electronAPI.onUpgradeInfo((upgradeInfo) => {
    console.log('Received upgrade info in separate window:', upgradeInfo);

    render(html`
        <upgrade-dialog
            .isFirstRun=${upgradeInfo.isFirstRun}
            .isUpgrade=${upgradeInfo.isUpgrade}
            .previousVersion=${upgradeInfo.previousVersion || ''}
            .currentVersion=${upgradeInfo.currentVersion || ''}
            .releaseNotes=${upgradeInfo.releaseNotes || []}
            .releaseChannel=${upgradeInfo.releaseChannel || ''}
            .mode=${'upgrade'}
            @dialog-complete=${(e) => {
                window.electronAPI.closeUpgradeWindow(e.detail.action);
            }}
            @dialog-error=${(e) => {
                console.error('Upgrade dialog error:', e.detail.error);
                window.electronAPI.closeUpgradeWindow('error');
            }}
        ></upgrade-dialog>
    `, container);
});

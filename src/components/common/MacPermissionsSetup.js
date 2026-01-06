import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * MacPermissionsSetup - A helper component for Mac users to grant permissions
 * Shows permission status, macOS version warnings, and provides one-click access to System Preferences
 * 
 * Uses audiotee for audio capture (Core Audio Taps API):
 * - Requires macOS 14.2+ (Sonoma)
 * - Uses NSAudioCaptureUsageDescription (NOT Screen Recording for audio)
 * - No app restart required after granting audio permission!
 * 
 * Permissions:
 * - Microphone: Required for voice input
 * - System Audio: Handled automatically by Core Audio Taps
 * - Screen Recording: Optional, for screen analysis features
 */
export class MacPermissionsSetup extends LitElement {
    static styles = css`
        :host {
            display: block;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .permissions-container {
            background: var(--bg-secondary, #1e1e1e);
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .permissions-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }

        .permissions-header svg {
            width: 20px;
            height: 20px;
            color: var(--accent-color, #00e6cc);
        }

        .permissions-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color, #e0e0e0);
        }

        .version-banner {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-size: 12px;
            line-height: 1.5;
        }

        .version-banner.error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }

        .version-banner.warning {
            background: rgba(234, 179, 8, 0.15);
            border: 1px solid rgba(234, 179, 8, 0.3);
            color: #fde047;
        }

        .version-banner.info {
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #93c5fd;
        }

        .version-banner.success {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            color: #86efac;
        }

        .version-banner strong {
            font-weight: 600;
        }

        .permission-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color, #3a3a3a);
        }

        .permission-row:last-child {
            border-bottom: none;
        }

        .permission-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .permission-name {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-color, #e0e0e0);
        }

        .permission-desc {
            font-size: 11px;
            color: var(--text-muted, #888);
        }

        .permission-status {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-granted {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .status-denied {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        .status-unknown {
            background: rgba(234, 179, 8, 0.2);
            color: #eab308;
        }

        .grant-button {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .grant-button.request {
            background: var(--accent-color, #00e6cc);
            color: #000;
        }

        .grant-button.request:hover {
            opacity: 0.9;
        }

        .grant-button.open-settings {
            background: var(--btn-secondary-bg, #333);
            color: var(--text-color, #e0e0e0);
            border: 1px solid var(--border-color, #3a3a3a);
        }

        .grant-button.open-settings:hover {
            background: var(--hover-background, #444);
        }

        .grant-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .all-granted {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: rgba(34, 197, 94, 0.1);
            border-radius: 6px;
            color: #22c55e;
            font-size: 13px;
        }

        .all-granted svg {
            width: 18px;
            height: 18px;
        }

        .refresh-button {
            margin-top: 12px;
            padding: 8px 16px;
            background: transparent;
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 4px;
            color: var(--text-secondary, #aaa);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .refresh-button:hover {
            background: var(--hover-background, #333);
            color: var(--text-color, #e0e0e0);
        }

        .not-mac {
            padding: 12px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 6px;
            color: #3b82f6;
            font-size: 12px;
        }

        .restart-note {
            margin-top: 12px;
            padding: 10px 12px;
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            border-radius: 6px;
            color: #eab308;
            font-size: 12px;
            line-height: 1.4;
        }

        .restart-note strong {
            color: #facc15;
        }

        .system-info {
            margin-top: 12px;
            padding: 10px 12px;
            background: var(--bg-tertiary, #252525);
            border-radius: 6px;
            font-size: 11px;
            color: var(--text-muted, #888);
        }

        .system-info-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
        }

        .system-info-label {
            color: var(--text-muted, #888);
        }

        .system-info-value {
            color: var(--text-color, #e0e0e0);
            font-family: monospace;
        }

        .troubleshoot-section {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-color, #3a3a3a);
        }

        .troubleshoot-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-color, #e0e0e0);
            margin-bottom: 8px;
        }

        .troubleshoot-desc {
            font-size: 11px;
            color: var(--text-muted, #888);
            margin-bottom: 12px;
            line-height: 1.4;
        }

        .command-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .command-label {
            font-size: 11px;
            color: var(--text-secondary, #aaa);
            min-width: 100px;
        }

        .command-code {
            flex: 1;
            background: var(--bg-tertiary, #252525);
            border: 1px solid var(--border-color, #3a3a3a);
            padding: 6px 10px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 10px;
            color: var(--text-color, #e0e0e0);
            overflow-x: auto;
            white-space: nowrap;
            user-select: text;
            cursor: text;
        }

        .copy-button {
            padding: 4px 8px;
            background: transparent;
            border: 1px solid var(--border-color, #3a3a3a);
            color: var(--text-secondary, #aaa);
            font-size: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .copy-button:hover {
            background: var(--hover-background, #333);
            color: var(--text-color, #e0e0e0);
        }

        .copy-button.copied {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            border-color: rgba(34, 197, 94, 0.3);
        }
    `;

    static properties = {
        permissions: { type: Object },
        versionInfo: { type: Object },
        loading: { type: Boolean },
        checking: { type: Boolean },
        copiedCommand: { type: String },
    };

    constructor() {
        super();
        this.permissions = null;
        this.versionInfo = null;
        this.loading = true;
        this.checking = false;
        this.copiedCommand = null;
    }

    async copyCommand(command, label) {
        try {
            await navigator.clipboard.writeText(command);
            this.copiedCommand = label;
            this.requestUpdate();
            setTimeout(() => {
                this.copiedCommand = null;
                this.requestUpdate();
            }, 2000);
        } catch (error) {
            console.error('[MacPermissions] Failed to copy command:', error);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this.checkAll();
    }

    async checkAll() {
        this.loading = true;
        await Promise.all([
            this.checkPermissions(),
            this.checkMacOSVersion(),
        ]);
        this.loading = false;
    }

    async checkPermissions() {
        try {
            if (window.electronAPI?.permissions?.getAll) {
                this.permissions = await window.electronAPI.permissions.getAll();
            }
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    }

    async checkMacOSVersion() {
        try {
            if (window.electronAPI?.macOS?.checkVersion) {
                this.versionInfo = await window.electronAPI.macOS.checkVersion();
                console.log('[MacPermissions] Version info:', this.versionInfo);
            }
        } catch (error) {
            console.error('Error checking macOS version:', error);
        }
    }

    async requestMicrophone() {
        try {
            console.log('[MacPermissions] Requesting microphone access...');
            const result = await window.electronAPI.permissions.request('microphone');
            console.log('[MacPermissions] Microphone request result:', result);

            // If permission was previously denied, the system won't show a dialog
            // We need to direct users to System Preferences
            if (!result) {
                // Check if it's denied (not just not-determined)
                const status = await window.electronAPI.permissions.check('microphone');
                console.log('[MacPermissions] Microphone status after request:', status);

                if (status === 'denied') {
                    // Permission was denied before - can't re-prompt, must go to settings
                    const confirmed = confirm(
                        'Microphone access was previously denied.\n\n' +
                        'To enable it, you need to:\n' +
                        '1. Open System Settings → Privacy & Security → Microphone\n' +
                        '2. Enable "Cheating Daddy On Steroids"\n' +
                        '3. Restart the app\n\n' +
                        'Would you like to open System Settings now?'
                    );
                    if (confirmed) {
                        await this.openSettings('microphone');
                    }
                }
            }

            // Wait a moment for OS to update, then refresh
            setTimeout(() => this.checkPermissions(), 500);
        } catch (error) {
            console.error('[MacPermissions] Error requesting microphone:', error);
            alert('Error requesting microphone permission. Please grant it manually in System Settings → Privacy & Security → Microphone.');
        }
    }

    async openSettings(pane) {
        try {
            console.log('[MacPermissions] Opening System Settings:', pane);
            const result = await window.electronAPI.permissions.openSystemPreferences(pane);
            console.log('[MacPermissions] Open settings result:', result);

            if (!result?.success) {
                console.error('[MacPermissions] Failed to open settings:', result?.error);
                alert(`Could not open System Settings automatically.\n\nPlease open manually:\nSystem Settings → Privacy & Security → ${pane === 'screen' ? 'Screen Recording' : 'Microphone'}`);
            } else {
                // After opening settings, start retry checking
                this.startRetryCheck(pane);
            }
        } catch (error) {
            console.error('[MacPermissions] Error opening System Settings:', error);
            alert('Could not open System Settings. Please open it manually from your Applications folder.');
        }
    }

    async startRetryCheck(type) {
        // Wait for user to potentially grant permission
        this.checking = true;

        // Retry checking for up to 30 seconds (every 2 seconds)
        const maxRetries = 15;
        const delayMs = 2000;

        for (let i = 0; i < maxRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            await this.checkPermissions();

            const status = this.permissions?.[type];
            console.log(`[MacPermissions] Retry ${i + 1}/${maxRetries}: ${type} = ${status}`);

            if (status === 'granted') {
                this.checking = false;
                return;
            }
        }

        this.checking = false;
    }

    getStatusBadge(status) {
        if (status === 'granted') {
            return html`<span class="status-badge status-granted">✓ Granted</span>`;
        } else if (status === 'denied') {
            return html`<span class="status-badge status-denied">✗ Denied</span>`;
        } else {
            return html`<span class="status-badge status-unknown">? Not Set</span>`;
        }
    }

    renderVersionBanner() {
        if (!this.versionInfo || this.versionInfo.platform !== 'darwin') {
            return '';
        }

        const { severity, title, message } = this.versionInfo;

        return html`
            <div class="version-banner ${severity}">
                <strong>${title}</strong><br>
                ${message}
            </div>
        `;
    }

    render() {
        if (this.loading) {
            return html`<div class="permissions-container">Loading permissions...</div>`;
        }

        if (!this.permissions?.isMac) {
            return html`
                <div class="permissions-container">
                    <div class="not-mac">
                        ℹ️ Permission setup is only needed on macOS. Your system handles permissions automatically.
                    </div>
                </div>
            `;
        }

        // Check if macOS version is unsupported (requires 14.2+ for Core Audio Taps)
        const versionUnsupported = this.versionInfo && !this.versionInfo.isSupported;

        // With audiotee (Core Audio Taps), we only need microphone permission
        // Audio capture permission is handled automatically by macOS when audiotee runs
        const allGranted = this.permissions.microphone === 'granted';

        return html`
            <div class="permissions-container">
                <div class="permissions-header">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span class="permissions-title">macOS Permissions</span>
                </div>

                ${this.renderVersionBanner()}

                ${versionUnsupported
                ? html`
                        <div class="restart-note">
                            ⚠️ <strong>Audio capture is not available</strong> on this macOS version. 
                            Please update to macOS 14.2 (Sonoma) or later to use system audio features.
                        </div>
                    `
                : allGranted
                    ? html`
                            <div class="all-granted">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                All permissions granted! Audio capture is ready.
                            </div>
                        `
                    : html`
                            <!-- Microphone Permission -->
                            <div class="permission-row">
                                <div class="permission-info">
                                    <span class="permission-name">🎤 Microphone</span>
                                    <span class="permission-desc">Required for voice input and audio capture</span>
                                </div>
                                <div class="permission-status">
                                    ${this.getStatusBadge(this.permissions.microphone)}
                                    ${this.permissions.microphone === 'denied'
                            ? html`
                                            <button class="grant-button open-settings" @click=${() => this.openSettings('microphone')} ?disabled=${this.checking}>
                                                ${this.checking ? 'Checking...' : 'Open Settings'}
                                            </button>
                                        `
                            : this.permissions.microphone !== 'granted'
                                ? html`
                                                <button class="grant-button request" @click=${this.requestMicrophone}>
                                                    Grant Access
                                                </button>
                                            `
                                : ''}
                                </div>
                            </div>

                            <!-- Info about audio capture -->
                            <div class="permission-row">
                                <div class="permission-info">
                                    <span class="permission-name">🔊 System Audio</span>
                                    <span class="permission-desc">Handled automatically via Core Audio Taps</span>
                                </div>
                                <div class="permission-status">
                                    <span class="status-badge status-granted">✓ Auto</span>
                                </div>
                            </div>

                            <!-- Screen Recording Permission (for screen analysis mode) -->
                            <div class="permission-row">
                                <div class="permission-info">
                                    <span class="permission-name">🖥️ Screen Recording</span>
                                    <span class="permission-desc">Optional - for screen analysis features</span>
                                </div>
                                <div class="permission-status">
                                    ${this.getStatusBadge(this.permissions.screen)}
                                    ${this.permissions.screen !== 'granted'
                            ? html`
                                            <button class="grant-button open-settings" @click=${() => this.openSettings('screen')} ?disabled=${this.checking}>
                                                ${this.checking ? 'Checking...' : 'Open Settings'}
                                            </button>
                                        `
                            : ''}
                                </div>
                            </div>
                            
                            ${this.permissions.microphone === 'denied'
                            ? html`
                                    <div class="restart-note">
                                        ⚠️ After enabling microphone in System Settings, <strong>restart the app</strong> for changes to take effect.
                                    </div>
                                `
                            : ''}
                        `}

                <button class="refresh-button" @click=${() => this.checkAll()}>
                    ↻ Refresh Status
                </button>

                ${this.versionInfo?.version ? html`
                    <div class="system-info">
                        <div class="system-info-row">
                            <span class="system-info-label">macOS Version</span>
                            <span class="system-info-value">${this.versionInfo.version}</span>
                        </div>
                    </div>
                ` : ''}

                <!-- Troubleshooting Section -->
                <div class="troubleshoot-section">
                    <div class="troubleshoot-title">Terminal Commands</div>
                    <div class="troubleshoot-desc">
                        If the app won't open or permissions are stuck, run these in Terminal:
                    </div>
                    
                    <div class="command-row">
                        <span class="command-label">App blocked:</span>
                        <code class="command-code">sudo xattr -dr com.apple.quarantine "/Applications/Cheating Daddy On Steroids.app"</code>
                        <button 
                            class="copy-button ${this.copiedCommand === 'quarantine' ? 'copied' : ''}"
                            @click=${() => this.copyCommand('sudo xattr -dr com.apple.quarantine "/Applications/Cheating Daddy On Steroids.app"', 'quarantine')}
                        >
                            ${this.copiedCommand === 'quarantine' ? '✓' : 'Copy'}
                        </button>
                    </div>
                    
                    <div class="command-row">
                        <span class="command-label">Reset mic:</span>
                        <code class="command-code">tccutil reset Microphone</code>
                        <button 
                            class="copy-button ${this.copiedCommand === 'mic' ? 'copied' : ''}"
                            @click=${() => this.copyCommand('tccutil reset Microphone', 'mic')}
                        >
                            ${this.copiedCommand === 'mic' ? '✓' : 'Copy'}
                        </button>
                    </div>
                    
                    <div class="command-row">
                        <span class="command-label">Reset screen:</span>
                        <code class="command-code">tccutil reset ScreenCapture</code>
                        <button 
                            class="copy-button ${this.copiedCommand === 'screen' ? 'copied' : ''}"
                            @click=${() => this.copyCommand('tccutil reset ScreenCapture', 'screen')}
                        >
                            ${this.copiedCommand === 'screen' ? '✓' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('mac-permissions-setup', MacPermissionsSetup);

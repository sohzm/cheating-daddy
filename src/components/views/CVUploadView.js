import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class CVUploadView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .cv-upload-container {
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 20px;
            gap: 20px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-color);
        }

        .back-button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .back-button:hover {
            background: var(--hover-background);
        }

        .upload-section {
            background: var(--card-background, rgba(255, 255, 255, 0.02));
            border: 2px dashed var(--button-border);
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .upload-section:hover {
            border-color: var(--focus-border-color);
            background: var(--hover-background);
        }

        .upload-section.dragover {
            border-color: var(--focus-border-color);
            background: var(--focus-box-shadow);
        }

        .upload-icon {
            font-size: 48px;
            margin-bottom: 16px;
            color: var(--description-color);
        }

        .upload-text {
            font-size: 16px;
            font-weight: 500;
            color: var(--text-color);
            margin-bottom: 8px;
        }

        .upload-subtext {
            font-size: 12px;
            color: var(--description-color);
            margin-bottom: 20px;
        }

        .upload-button {
            background: var(--focus-border-color);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .upload-button:hover {
            background: var(--focus-border-color);
            opacity: 0.9;
        }

        .upload-button:disabled {
            background: var(--button-background);
            color: var(--description-color);
            cursor: not-allowed;
        }

        .cv-status {
            background: var(--card-background, rgba(255, 255, 255, 0.02));
            border: 1px solid var(--button-border);
            border-radius: 8px;
            padding: 20px;
        }

        .status-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .status-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-badge.uploaded {
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
        }

        .status-badge.not-uploaded {
            background: rgba(156, 163, 175, 0.1);
            color: #9ca3af;
        }

        .status-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        }

        .status-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .status-label {
            font-size: 11px;
            color: var(--description-color);
            font-weight: 500;
        }

        .status-value {
            font-size: 12px;
            color: var(--text-color);
            font-weight: 600;
        }

        .status-actions {
            display: flex;
            gap: 8px;
        }

        .action-button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .action-button:hover {
            background: var(--hover-background);
        }

        .action-button.danger {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border-color: rgba(239, 68, 68, 0.2);
        }

        .action-button.danger:hover {
            background: rgba(239, 68, 68, 0.2);
        }

        .preview-section {
            background: var(--card-background, rgba(255, 255, 255, 0.02));
            border: 1px solid var(--button-border);
            border-radius: 8px;
            padding: 20px;
        }

        .preview-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 12px;
        }

        .preview-content {
            font-size: 11px;
            color: var(--description-color);
            line-height: 1.4;
            max-height: 200px;
            overflow-y: auto;
            background: var(--input-background);
            padding: 12px;
            border-radius: 4px;
            white-space: pre-wrap;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: var(--description-color);
            font-size: 12px;
        }

        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--button-border);
            border-top: 2px solid var(--focus-border-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-message {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 4px;
            padding: 12px;
            font-size: 12px;
            margin-top: 12px;
        }

        .success-message {
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.2);
            border-radius: 4px;
            padding: 12px;
            font-size: 12px;
            margin-top: 12px;
        }
    `;

    static properties = {
        cvStatus: { type: Object },
        isLoading: { type: Boolean },
        errorMessage: { type: String },
        successMessage: { type: String },
        cvPreview: { type: String }
    };

    constructor() {
        super();
        this.cvStatus = {};
        this.isLoading = false;
        this.errorMessage = '';
        this.successMessage = '';
        this.cvPreview = '';
    }

    firstUpdated() {
        this.loadCVStatus();
    }

    async loadCVStatus() {
        try {
            this.isLoading = true;
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                this.cvStatus = await ipcRenderer.invoke('get-cv-status');
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading CV status:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async handleUpload() {
        try {
            this.isLoading = true;
            this.errorMessage = '';
            this.successMessage = '';

            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('upload-cv-pdf');
                
                if (result.success) {
                    this.successMessage = `CV uploaded successfully: ${result.fileName}`;
                    await this.loadCVStatus();
                    await this.loadCVPreview();
                } else {
                    this.errorMessage = result.error || 'Failed to upload CV';
                }
            } else {
                this.errorMessage = 'Electron API not available';
            }
        } catch (error) {
            console.error('Error uploading CV:', error);
            this.errorMessage = 'Error uploading CV: ' + error.message;
        } finally {
            this.isLoading = false;
        }
    }

    async loadCVPreview() {
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('get-cv-context');
                if (result.success) {
                    this.cvPreview = result.context;
                }
            }
        } catch (error) {
            console.error('Error loading CV preview:', error);
        }
    }

    async handleClearCV() {
        try {
            this.isLoading = true;
            this.errorMessage = '';
            this.successMessage = '';

            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('clear-cv');
                
                if (result.success) {
                    this.successMessage = 'CV cleared successfully';
                    this.cvStatus = {};
                    this.cvPreview = '';
                } else {
                    this.errorMessage = result.error || 'Failed to clear CV';
                }
            } else {
                this.errorMessage = 'Electron API not available';
            }
        } catch (error) {
            console.error('Error clearing CV:', error);
            this.errorMessage = 'Error clearing CV: ' + error.message;
        } finally {
            this.isLoading = false;
        }
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('navigate-back', { bubbles: true, composed: true }));
    }

    render() {
        return html`
            <div class="cv-upload-container">
                <div class="header">
                    <div class="title">📄 CV/Resume Upload</div>
                    <button class="back-button" @click=${this.handleBack}>
                        ← Back
                    </button>
                </div>

                <div class="upload-section" @click=${this.handleUpload}>
                    <div class="upload-icon">📁</div>
                    <div class="upload-text">Upload your CV/Resume</div>
                    <div class="upload-subtext">Click here or drag and drop a PDF file</div>
                    <button class="upload-button" ?disabled=${this.isLoading}>
                        ${this.isLoading ? 'Uploading...' : 'Choose PDF File'}
                    </button>
                </div>

                ${this.errorMessage ? html`
                    <div class="error-message">${this.errorMessage}</div>
                ` : ''}

                ${this.successMessage ? html`
                    <div class="success-message">${this.successMessage}</div>
                ` : ''}

                ${this.cvStatus.hasCV ? html`
                    <div class="cv-status">
                        <div class="status-header">
                            <div class="status-title">CV Status</div>
                            <div class="status-badge uploaded">Uploaded</div>
                        </div>
                        
                        <div class="status-details">
                            <div class="status-item">
                                <div class="status-label">File Name</div>
                                <div class="status-value">${this.cvStatus.fileName}</div>
                            </div>
                            <div class="status-item">
                                <div class="status-label">Pages</div>
                                <div class="status-value">${this.cvStatus.pages}</div>
                            </div>
                            <div class="status-item">
                                <div class="status-label">Text Length</div>
                                <div class="status-value">${this.cvStatus.textLength} characters</div>
                            </div>
                            <div class="status-item">
                                <div class="status-label">Processed</div>
                                <div class="status-value">${this.cvStatus.processedAt ? new Date(this.cvStatus.processedAt).toLocaleString() : 'Unknown'}</div>
                            </div>
                        </div>

                        <div class="status-actions">
                            <button class="action-button" @click=${this.loadCVPreview}>
                                Preview Context
                            </button>
                            <button class="action-button danger" @click=${this.handleClearCV}>
                                Clear CV
                            </button>
                        </div>
                    </div>
                ` : html`
                    <div class="cv-status">
                        <div class="status-header">
                            <div class="status-title">CV Status</div>
                            <div class="status-badge not-uploaded">Not Uploaded</div>
                        </div>
                        <div style="color: var(--description-color); font-size: 12px;">
                            Upload your CV/Resume to get personalized interview responses based on your experience and skills.
                        </div>
                    </div>
                `}

                ${this.cvPreview ? html`
                    <div class="preview-section">
                        <div class="preview-title">CV Context Preview</div>
                        <div class="preview-content">${this.cvPreview}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('cv-upload-view', CVUploadView);

import { LitElement, html, css } from 'lit';

export class CustomProfileManager extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .profile-manager {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .profile-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }

        .profile-item {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .profile-info {
            flex: 1;
        }

        .profile-name {
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 4px;
        }

        .profile-description {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
        }

        .profile-actions {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-primary {
            background: #4f46e5;
            color: white;
        }

        .btn-primary:hover {
            background: #4338ca;
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .btn-danger {
            background: #dc2626;
            color: white;
        }

        .btn-danger:hover {
            background: #b91c1c;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: rgba(255, 255, 255, 0.6);
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: rgba(255, 255, 255, 0.6);
        }

        .error {
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            border-radius: 8px;
            padding: 12px;
            color: #fca5a5;
            margin-bottom: 16px;
        }
    `;

    static properties = {
        customProfiles: { type: Array },
        loading: { type: Boolean },
        error: { type: String },
        onCreateProfile: { type: Function },
        onEditProfile: { type: Function },
        onDeleteProfile: { type: Function },
    };

    constructor() {
        super();
        this.customProfiles = [];
        this.loading = false;
        this.error = '';
        this.onCreateProfile = () => {};
        this.onEditProfile = () => {};
        this.onDeleteProfile = () => {};
    }

    async connectedCallback() {
        super.connectedCallback();
        await this.loadCustomProfiles();
    }

    async loadCustomProfiles() {
        this.loading = true;
        this.error = '';
        
        try {
            if (window.cheddar && window.cheddar.getAllCustomProfiles) {
                this.customProfiles = await window.cheddar.getAllCustomProfiles();
            } else {
                this.error = 'Custom profile functions not available';
            }
        } catch (error) {
            console.error('Error loading custom profiles:', error);
            this.error = 'Failed to load custom profiles';
        } finally {
            this.loading = false;
        }
    }

    handleCreateProfile() {
        this.onCreateProfile();
    }

    handleEditProfile(profile) {
        this.onEditProfile(profile);
    }

    async handleDeleteProfile(profile) {
        if (confirm(`Are you sure you want to delete the profile "${profile.name}"? This action cannot be undone.`)) {
            try {
                if (window.cheddar && window.cheddar.deleteCustomProfile) {
                    await window.cheddar.deleteCustomProfile(profile.id);
                    await this.loadCustomProfiles(); // Reload the list
                    this.onDeleteProfile(profile);
                }
            } catch (error) {
                console.error('Error deleting profile:', error);
                this.error = 'Failed to delete profile';
            }
        }
    }

    async handleExportProfile(profile) {
        try {
            // Create a clean export object without internal IDs and timestamps
            const exportData = {
                name: profile.name,
                description: profile.description,
                intro: profile.intro,
                formatRequirements: profile.formatRequirements,
                searchUsage: profile.searchUsage,
                content: profile.content,
                outputInstructions: profile.outputInstructions,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `${profile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_profile.json`;
            link.click();

            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error exporting profile:', error);
            this.error = 'Failed to export profile';
        }
    }

    async handleExportAllProfiles() {
        try {
            if (this.customProfiles.length === 0) {
                this.error = 'No custom profiles to export';
                return;
            }

            const exportData = {
                profiles: this.customProfiles.map(profile => ({
                    name: profile.name,
                    description: profile.description,
                    intro: profile.intro,
                    formatRequirements: profile.formatRequirements,
                    searchUsage: profile.searchUsage,
                    content: profile.content,
                    outputInstructions: profile.outputInstructions
                })),
                exportedAt: new Date().toISOString(),
                version: '1.0',
                count: this.customProfiles.length
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `custom_profiles_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error exporting all profiles:', error);
            this.error = 'Failed to export profiles';
        }
    }

    handleImportProfiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importData = JSON.parse(text);

                // Validate import data structure
                if (!importData.version) {
                    throw new Error('Invalid file format: missing version');
                }

                let profilesToImport = [];

                if (importData.profiles && Array.isArray(importData.profiles)) {
                    // Multiple profiles export
                    profilesToImport = importData.profiles;
                } else if (importData.name && importData.intro) {
                    // Single profile export
                    profilesToImport = [importData];
                } else {
                    throw new Error('Invalid file format: no profiles found');
                }

                // Import each profile
                let importedCount = 0;
                let skippedCount = 0;

                for (const profileData of profilesToImport) {
                    try {
                        // Check if profile with same name already exists
                        const existingProfile = this.customProfiles.find(p => p.name === profileData.name);
                        if (existingProfile) {
                            const overwrite = confirm(`Profile "${profileData.name}" already exists. Do you want to overwrite it?`);
                            if (!overwrite) {
                                skippedCount++;
                                continue;
                            }
                            // Update existing profile
                            await window.cheddar.updateCustomProfile(existingProfile.id, profileData);
                        } else {
                            // Create new profile
                            await window.cheddar.createCustomProfile(profileData);
                        }
                        importedCount++;
                    } catch (error) {
                        console.error(`Error importing profile "${profileData.name}":`, error);
                        skippedCount++;
                    }
                }

                await this.loadCustomProfiles();

                if (importedCount > 0) {
                    this.error = ''; // Clear any previous errors
                    alert(`Successfully imported ${importedCount} profile(s). ${skippedCount > 0 ? `Skipped ${skippedCount} profile(s).` : ''}`);
                } else {
                    this.error = 'No profiles were imported';
                }
            } catch (error) {
                console.error('Error importing profiles:', error);
                this.error = 'Failed to import profiles: ' + error.message;
            }
        };
        input.click();
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString();
    }

    render() {
        return html`
            <div class="profile-manager">
                <div class="section-title">
                    <span>Custom Profiles</span>
                </div>

                ${this.error ? html`
                    <div class="error">
                        ${this.error}
                    </div>
                ` : ''}

                <div style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="btn btn-primary" @click=${this.handleCreateProfile}>
                        + Create New Profile
                    </button>
                    <button class="btn btn-secondary" @click=${this.handleImportProfiles}>
                        📁 Import Profiles
                    </button>
                    ${this.customProfiles.length > 0 ? html`
                        <button class="btn btn-secondary" @click=${this.handleExportAllProfiles}>
                            💾 Export All
                        </button>
                    ` : ''}
                </div>

                ${this.loading ? html`
                    <div class="loading">
                        Loading custom profiles...
                    </div>
                ` : this.customProfiles.length === 0 ? html`
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <div>No custom profiles yet</div>
                        <div style="margin-top: 8px; font-size: 14px;">
                            Create your first custom profile to get started
                        </div>
                    </div>
                ` : html`
                    <div class="profile-list">
                        ${this.customProfiles.map(profile => html`
                            <div class="profile-item">
                                <div class="profile-info">
                                    <div class="profile-name">${profile.name}</div>
                                    <div class="profile-description">
                                        ${profile.description || 'No description'}
                                        • Created ${this.formatDate(profile.created)}
                                    </div>
                                </div>
                                <div class="profile-actions">
                                    <button
                                        class="btn btn-secondary"
                                        @click=${() => this.handleEditProfile(profile)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        class="btn btn-secondary"
                                        @click=${() => this.handleExportProfile(profile)}
                                        title="Export this profile"
                                    >
                                        💾
                                    </button>
                                    <button
                                        class="btn btn-danger"
                                        @click=${() => this.handleDeleteProfile(profile)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `)}
                    </div>
                `}
            </div>
        `;
    }
}

customElements.define('custom-profile-manager', CustomProfileManager);

import { LitElement, html, css } from 'lit';

export class CustomProfileEditor extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .editor-container {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
        }

        .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .editor-title {
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #ffffff;
            margin-bottom: 8px;
        }

        .form-control {
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 14px;
            font-family: inherit;
            box-sizing: border-box;
        }

        .form-control:focus {
            outline: none;
            border-color: #4f46e5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-control::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        textarea.form-control {
            min-height: 120px;
            resize: vertical;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        .form-description {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 4px;
        }

        .section-divider {
            border: none;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 24px 0;
        }

        .section-header {
            font-size: 16px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 16px;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
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

        .btn-primary:disabled {
            background: rgba(79, 70, 229, 0.5);
            cursor: not-allowed;
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .button-group {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        }

        .error {
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            border-radius: 8px;
            padding: 12px;
            color: #fca5a5;
            margin-bottom: 16px;
        }

        .success {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 8px;
            padding: 12px;
            color: #86efac;
            margin-bottom: 16px;
        }
    `;

    static properties = {
        profile: { type: Object },
        isEditing: { type: Boolean },
        loading: { type: Boolean },
        error: { type: String },
        success: { type: String },
        onSave: { type: Function },
        onCancel: { type: Function },
    };

    constructor() {
        super();
        this.profile = this.getEmptyProfile();
        this.isEditing = false;
        this.loading = false;
        this.error = '';
        this.success = '';
        this.onSave = () => {};
        this.onCancel = () => {};
    }

    getEmptyProfile() {
        return {
            name: '',
            description: '',
            intro: '',
            formatRequirements: `**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-3 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for key points and emphasis
- Use bullet points (-) for lists when appropriate
- Focus on the most essential information only`,
            searchUsage: `**SEARCH TOOL USAGE:**
- If the user mentions **recent events, news, or current trends** (anything from the last 6 months), **ALWAYS use Google search** to get up-to-date information
- If they ask about **specific information that might have changed recently**, use Google search first
- After searching, provide a **concise, informed response** based on the real-time data`,
            content: '',
            outputInstructions: `**OUTPUT INSTRUCTIONS:**
Provide direct, actionable responses in **markdown format**. Focus on being helpful and concise. Keep responses **short and to the point**.`,
        };
    }

    updated(changedProperties) {
        if (changedProperties.has('profile') && this.profile) {
            // Ensure all required fields exist
            this.profile = { ...this.getEmptyProfile(), ...this.profile };
        }
    }

    handleInputChange(field, event) {
        this.profile = {
            ...this.profile,
            [field]: event.target.value,
        };
        this.error = '';
        this.success = '';
    }

    async handleSave() {
        // Validate required fields
        if (!this.profile.name.trim()) {
            this.error = 'Profile name is required';
            return;
        }

        if (!this.profile.intro.trim()) {
            this.error = 'Introduction section is required';
            return;
        }

        if (!this.profile.content.trim()) {
            this.error = 'Content section is required';
            return;
        }

        this.loading = true;
        this.error = '';

        try {
            await this.onSave(this.profile);
            this.success = this.isEditing ? 'Profile updated successfully!' : 'Profile created successfully!';
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                this.success = '';
            }, 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            this.error = 'Failed to save profile. Please try again.';
        } finally {
            this.loading = false;
        }
    }

    handleCancel() {
        this.onCancel();
    }

    render() {
        return html`
            <div class="editor-container">
                <div class="editor-header">
                    <div class="editor-title">
                        ${this.isEditing ? 'Edit Profile' : 'Create New Profile'}
                    </div>
                </div>

                ${this.error ? html`
                    <div class="error">
                        ${this.error}
                    </div>
                ` : ''}

                ${this.success ? html`
                    <div class="success">
                        ${this.success}
                    </div>
                ` : ''}

                <div class="form-group">
                    <label class="form-label">Profile Name *</label>
                    <input
                        type="text"
                        class="form-control"
                        placeholder="e.g., Technical Interview, Customer Support, etc."
                        .value=${this.profile.name}
                        @input=${(e) => this.handleInputChange('name', e)}
                    />
                    <div class="form-description">
                        A descriptive name for your custom profile
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input
                        type="text"
                        class="form-control"
                        placeholder="Brief description of when to use this profile"
                        .value=${this.profile.description}
                        @input=${(e) => this.handleInputChange('description', e)}
                    />
                    <div class="form-description">
                        Optional description to help you remember when to use this profile
                    </div>
                </div>

                <hr class="section-divider">

                <div class="section-header">AI Behavior Configuration</div>

                <div class="form-group">
                    <label class="form-label">Introduction *</label>
                    <textarea
                        class="form-control"
                        placeholder="Define the AI's role and primary mission..."
                        .value=${this.profile.intro}
                        @input=${(e) => this.handleInputChange('intro', e)}
                    ></textarea>
                    <div class="form-description">
                        Sets the AI's role and primary objective
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Format Requirements</label>
                    <textarea
                        class="form-control"
                        .value=${this.profile.formatRequirements}
                        @input=${(e) => this.handleInputChange('formatRequirements', e)}
                    ></textarea>
                    <div class="form-description">
                        Defines how the AI should format its responses
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Search Usage Instructions</label>
                    <textarea
                        class="form-control"
                        .value=${this.profile.searchUsage}
                        @input=${(e) => this.handleInputChange('searchUsage', e)}
                    ></textarea>
                    <div class="form-description">
                        Instructions for when and how to use Google search
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Content & Examples *</label>
                    <textarea
                        class="form-control"
                        placeholder="Provide detailed instructions, examples, and context for the AI's responses..."
                        .value=${this.profile.content}
                        @input=${(e) => this.handleInputChange('content', e)}
                        style="min-height: 200px;"
                    ></textarea>
                    <div class="form-description">
                        Main content section with detailed instructions and examples
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Output Instructions</label>
                    <textarea
                        class="form-control"
                        .value=${this.profile.outputInstructions}
                        @input=${(e) => this.handleInputChange('outputInstructions', e)}
                    ></textarea>
                    <div class="form-description">
                        Final instructions for output format and style
                    </div>
                </div>

                <div class="button-group">
                    <button 
                        class="btn btn-secondary" 
                        @click=${this.handleCancel}
                        ?disabled=${this.loading}
                    >
                        Cancel
                    </button>
                    <button 
                        class="btn btn-primary" 
                        @click=${this.handleSave}
                        ?disabled=${this.loading}
                    >
                        ${this.loading ? 'Saving...' : (this.isEditing ? 'Update Profile' : 'Create Profile')}
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('custom-profile-editor', CustomProfileEditor);

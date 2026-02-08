import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class OnboardingView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font);
            cursor: default;
            user-select: none;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :host {
            display: block;
            height: 100%;
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            overflow: hidden;
        }

        .onboarding {
            width: 100%;
            height: 100%;
            background: var(--bg-app);
            display: flex;
            flex-direction: column;
        }

        .close-button {
            position: absolute;
            top: var(--space-md);
            right: var(--space-md);
            z-index: 10;
            background: none;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--text-muted);
            transition: color var(--transition), border-color var(--transition);
        }

        .close-button:hover {
            color: var(--text-primary);
            border-color: var(--border-strong);
        }

        .close-button svg {
            width: 14px;
            height: 14px;
        }

        /* ── Slide content ── */

        .slide {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: var(--space-2xl) var(--space-xl);
            max-width: 480px;
        }

        .slide-title {
            font-size: var(--font-size-2xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            line-height: 1.2;
            margin-bottom: var(--space-md);
        }

        .slide-text {
            font-size: var(--font-size-lg);
            line-height: var(--line-height);
            color: var(--text-secondary);
            margin-bottom: var(--space-lg);
        }

        .context-input {
            width: 100%;
            min-height: 120px;
            padding: var(--space-md);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            background: var(--bg-elevated);
            color: var(--text-primary);
            font-size: var(--font-size-base);
            font-family: var(--font);
            line-height: var(--line-height);
            resize: vertical;
        }

        .context-input::placeholder {
            color: var(--text-muted);
        }

        .context-input:focus {
            outline: none;
            border-color: var(--accent);
        }

        .context-hint {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            margin-top: var(--space-sm);
        }

        /* ── Navigation ── */

        .nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-md) var(--space-xl);
            border-top: 1px solid var(--border);
            height: 56px;
        }

        .nav-btn {
            background: none;
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            transition: color var(--transition), border-color var(--transition);
        }

        .nav-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-strong);
        }

        .nav-btn:disabled {
            opacity: 0.3;
            cursor: default;
        }

        .nav-btn.primary {
            background: var(--accent);
            border-color: var(--accent);
            color: #ffffff;
        }

        .nav-btn.primary:hover {
            background: var(--accent-hover);
            border-color: var(--accent-hover);
        }

        .nav-btn svg {
            width: 14px;
            height: 14px;
        }

        .dots {
            display: flex;
            gap: var(--space-sm);
        }

        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--border-strong);
            transition: background var(--transition);
        }

        .dot.active {
            background: var(--text-primary);
        }
    `;

    static properties = {
        currentSlide: { type: Number },
        contextText: { type: String },
        onComplete: { type: Function },
        onClose: { type: Function },
    };

    constructor() {
        super();
        this.currentSlide = 0;
        this.contextText = '';
        this.onComplete = () => {};
        this.onClose = () => {};
    }

    nextSlide() {
        if (this.currentSlide < 2) {
            this.currentSlide++;
        } else {
            this.completeOnboarding();
        }
    }

    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
        }
    }

    handleContextInput(e) {
        this.contextText = e.target.value;
    }

    async handleClose() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('quit-application');
        }
    }

    async completeOnboarding() {
        if (this.contextText.trim()) {
            await cheatingDaddy.storage.updatePreference('customPrompt', this.contextText.trim());
        }
        await cheatingDaddy.storage.updateConfig('onboarded', true);
        this.onComplete();
    }

    renderSlide() {
        switch (this.currentSlide) {
            case 0:
                return html`
                    <div class="slide">
                        <div class="slide-title">Real-time AI assistance</div>
                        <div class="slide-text">
                            Listens to your conversations and watches your screen. Provides suggestions automatically during interviews, meetings, and exams.
                        </div>
                    </div>
                `;
            case 1:
                return html`
                    <div class="slide">
                        <div class="slide-title">Add your context</div>
                        <div class="slide-text">
                            Paste your resume, job description, or any relevant information. The AI uses this to give better answers.
                        </div>
                        <textarea
                            class="context-input"
                            placeholder="Paste your resume, job description, or relevant context..."
                            .value=${this.contextText}
                            @input=${this.handleContextInput}
                        ></textarea>
                        <div class="context-hint">You can always change this later in Settings.</div>
                    </div>
                `;
            case 2:
                return html`
                    <div class="slide">
                        <div class="slide-title">You're all set</div>
                        <div class="slide-text">
                            Choose a profile, enter your token, and start a session. The AI will do the rest.
                        </div>
                    </div>
                `;
        }
    }

    render() {
        const isLast = this.currentSlide === 2;

        return html`
            <div class="onboarding">
                <button class="close-button" @click=${this.handleClose} title="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>

                ${this.renderSlide()}

                <div class="nav">
                    <button class="nav-btn" @click=${this.prevSlide} ?disabled=${this.currentSlide === 0}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
                        </svg>
                    </button>

                    <div class="dots">
                        ${[0, 1, 2].map(i => html`<div class="dot ${i === this.currentSlide ? 'active' : ''}"></div>`)}
                    </div>

                    <button class="nav-btn ${isLast ? 'primary' : ''}" @click=${this.nextSlide}>
                        ${isLast ? 'Get Started' : html`
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                            </svg>
                        `}
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('onboarding-view', OnboardingView);

import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class OnboardingView extends LitElement {
    static styles = css`
        * {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
            cursor: default;
            user-select: none;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            letter-spacing: -0.2px;
            font-feature-settings: "tnum", "zero";
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

        .onboarding-container {
            position: relative;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }

        .content-card {
            background: rgba(255, 255, 255, 0.03);
            border: 0.5px solid rgba(255, 255, 255, 0.06);
            border-radius: 20px;
            padding: 40px;
            max-width: 480px;
            width: 100%;
            backdrop-filter: blur(30px) saturate(120%);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            text-align: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slide-icon {
            width: 32px;
            height: 32px;
            margin: 0 auto 20px;
            opacity: 0.8;
            display: block;
        }

        .slide-title {
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 12px;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.3;
        }

        .slide-content {
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 24px;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 400;
        }

        .context-textarea {
            width: 100%;
            height: 80px;
            padding: 12px 16px;
            border: 0.5px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.02);
            color: rgba(255, 255, 255, 0.85);
            font-size: 12px;
            font-family: inherit;
            resize: none;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 20px;
            backdrop-filter: blur(20px);
        }

        .context-textarea::placeholder {
            color: rgba(255, 255, 255, 0.3);
            font-size: 12px;
        }

        .context-textarea:focus {
            outline: none;
            border-color: rgba(0, 122, 255, 0.4);
            background: rgba(255, 255, 255, 0.04);
            box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
        }

        .feature-list {
            text-align: left;
            margin: 0 auto;
            max-width: 300px;
        }

        .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
            padding: 4px 0;
        }

        .feature-icon {
            font-size: 12px;
            margin-right: 8px;
            opacity: 0.7;
            width: 16px;
            text-align: center;
        }

        .navigation {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 40px;
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(20px);
            border-top: 0.5px solid rgba(255, 255, 255, 0.04);
        }

        .nav-button {
            background: rgba(255, 255, 255, 0.04);
            border: 0.5px solid rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.8);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            min-height: 32px;
            backdrop-filter: blur(20px);
        }

        .nav-button:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
        }

        .nav-button:active {
            transform: translateY(0);
        }

        .nav-button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .nav-button:disabled:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
            transform: none;
        }

        .progress-dots {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        }

        .dot:hover {
            background: rgba(255, 255, 255, 0.4);
        }

        .dot.active {
            background: rgba(0, 122, 255, 0.8);
            transform: scale(1.3);
        }

        .slide-counter {
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.4);
            font-weight: 400;
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

    firstUpdated() {
        // Simple initialization - no complex animations needed
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    nextSlide() {
        if (this.currentSlide < 4) {
            this.currentSlide++;
            this.requestUpdate();
        } else {
            this.completeOnboarding();
        }
    }

    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.requestUpdate();
        }
    }

    handleContextInput(e) {
        this.contextText = e.target.value;
    }

    completeOnboarding() {
        if (this.contextText.trim()) {
            localStorage.setItem('customPrompt', this.contextText.trim());
        }
        localStorage.setItem('onboardingCompleted', 'true');
        this.onComplete();
    }

    getSlideContent() {
        const slides = [
            {
                icon: 'assets/onboarding/welcome.svg',
                title: 'Welcome',
                content: 'Your intelligent assistant that understands context and provides real-time insights during conversations.',
            },
            {
                icon: 'assets/onboarding/security.svg',
                title: 'Private & Secure',
                content: 'Completely invisible to screen sharing and recording tools. Your conversations stay private.',
            },
            {
                icon: 'assets/onboarding/context.svg',
                title: 'Add Context',
                content: 'Share relevant information to help the AI provide more personalized assistance.',
                showTextarea: true,
            },
            {
                icon: 'assets/onboarding/customize.svg',
                title: 'Features',
                content: '',
                showFeatures: true,
            },
            {
                icon: 'assets/onboarding/ready.svg',
                title: 'Ready',
                content: 'Configure your API keys in settings and start getting intelligent assistance.',
            },
        ];

        return slides[this.currentSlide];
    }

    render() {
        const slide = this.getSlideContent();

        return html`
            <div class="onboarding-container">
                <div class="slide-counter">${this.currentSlide + 1}/5</div>
                
                <div class="content-card">
                    <img class="slide-icon" src="${slide.icon}" alt="${slide.title} icon" />
                    <div class="slide-title">${slide.title}</div>
                    <div class="slide-content">${slide.content}</div>

                    ${slide.showTextarea
                        ? html`
                              <textarea
                                  class="context-textarea"
                                  placeholder="Paste any relevant context or instructions here..."
                                  .value=${this.contextText}
                                  @input=${this.handleContextInput}
                              ></textarea>
                          `
                        : ''}
                    ${slide.showFeatures
                        ? html`
                              <div class="feature-list">
                                  <div class="feature-item">
                                      <span class="feature-icon">⚙</span>
                                      Customize AI behavior
                                  </div>
                                  <div class="feature-item">
                                      <span class="feature-icon">📝</span>
                                      Review conversation history
                                  </div>
                                  <div class="feature-item">
                                      <span class="feature-icon">🎯</span>
                                      Adjust capture settings
                                  </div>
                              </div>
                          `
                        : ''}
                </div>

                <div class="navigation">
                    <button class="nav-button" @click=${this.prevSlide} ?disabled=${this.currentSlide === 0}>
                        <svg width="14px" height="14px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 6L9 12L15 18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>

                    <div class="progress-dots">
                        ${[0, 1, 2, 3, 4].map(
                            index => html`
                                <div
                                    class="dot ${index === this.currentSlide ? 'active' : ''}"
                                    @click=${() => {
                                        if (index !== this.currentSlide) {
                                            this.currentSlide = index;
                                            this.requestUpdate();
                                        }
                                    }}
                                ></div>
                            `
                        )}
                    </div>

                    <button class="nav-button" @click=${this.nextSlide}>
                        ${this.currentSlide === 4
                            ? 'Start'
                            : html`
                                  <svg width="14px" height="14px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                  </svg>
                              `}
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('onboarding-view', OnboardingView);

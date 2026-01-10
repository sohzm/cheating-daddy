import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class OnboardingView extends LitElement {
    static styles = css`
        * {
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                'Segoe UI',
                Roboto,
                sans-serif;
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

        .onboarding-container {
            position: relative;
            width: 100%;
            height: 100%;
            background: #0a0a0a;
            overflow: hidden;
        }

        .gradient-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
        }

        .content-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 50px;
            z-index: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 20px 32px;
            max-width: 450px;
            color: #e5e5e5;
            overflow: hidden;
        }

        .slide-icon {
            width: 36px;
            height: 36px;
            margin-bottom: 12px;
            opacity: 0.9;
            display: block;
        }

        .slide-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #ffffff;
            line-height: 1.3;
        }

        .slide-content {
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 16px;
            color: #b8b8b8;
            font-weight: 400;
        }

        .context-textarea {
            width: 100%;
            height: 80px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: #e5e5e5;
            font-size: 13px;
            font-family: inherit;
            resize: vertical;
            transition: all 0.2s ease;
            margin-bottom: 16px;
        }

        .context-textarea::placeholder {
            color: rgba(255, 255, 255, 0.4);
            font-size: 13px;
        }

        .context-textarea:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.08);
        }

        .feature-list {
            max-width: 100%;
        }

        .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
            color: #b8b8b8;
        }

        .feature-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            opacity: 0.8;
            color: #b8b8b8;
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
            padding: 12px 20px;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            height: 50px;
            box-sizing: border-box;
        }

        .nav-button {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e5e5e5;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            min-height: 32px;
        }

        .nav-button:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .nav-button:active {
            transform: scale(0.98);
        }

        .nav-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .nav-button:disabled:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.1);
            transform: none;
        }

        .progress-dots {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transition: all 0.2s ease;
            cursor: default;
        }

        .dot:hover {
            background: rgba(255, 255, 255, 0.4);
        }

        .dot.active {
            background: rgba(255, 255, 255, 0.8);
            transform: scale(1.2);
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
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;

        // Transition properties
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionDuration = 800; // 800ms fade duration
        this.previousColorScheme = null;

        // Subtle dark color schemes for each slide
        this.colorSchemes = [
            // Slide 1 - Welcome (Very dark purple/gray)
            [
                [25, 25, 35], // Dark gray-purple
                [20, 20, 30], // Darker gray
                [30, 25, 40], // Slightly purple
                [15, 15, 25], // Very dark
                [35, 30, 45], // Muted purple
                [10, 10, 20], // Almost black
            ],
            // Slide 2 - Privacy (Dark blue-gray)
            [
                [20, 25, 35], // Dark blue-gray
                [15, 20, 30], // Darker blue-gray
                [25, 30, 40], // Slightly blue
                [10, 15, 25], // Very dark blue
                [30, 35, 45], // Muted blue
                [5, 10, 20], // Almost black
            ],
            // Slide 3 - Context (Dark neutral)
            [
                [25, 25, 25], // Neutral dark
                [20, 20, 20], // Darker neutral
                [30, 30, 30], // Light dark
                [15, 15, 15], // Very dark
                [35, 35, 35], // Lighter dark
                [10, 10, 10], // Almost black
            ],
            // Slide 4 - Features (Dark green-gray)
            [
                [20, 30, 25], // Dark green-gray
                [15, 25, 20], // Darker green-gray
                [25, 35, 30], // Slightly green
                [10, 20, 15], // Very dark green
                [30, 40, 35], // Muted green
                [5, 15, 10], // Almost black
            ],
            // Slide 5 - Complete (Dark warm gray)
            [
                [30, 25, 20], // Dark warm gray
                [25, 20, 15], // Darker warm
                [35, 30, 25], // Slightly warm
                [20, 15, 10], // Very dark warm
                [40, 35, 30], // Muted warm
                [15, 10, 5], // Almost black
            ],
        ];
    }

    firstUpdated() {
        this.canvas = this.shadowRoot.querySelector('.gradient-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.startGradientAnimation();

        // Resize window to match layout preference (same as main window)
        resizeLayout();

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const rect = this.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    startGradientAnimation() {
        if (!this.ctx) return;

        const animate = timestamp => {
            this.drawGradient(timestamp);
            this.animationId = requestAnimationFrame(animate);
        };

        animate(0);
    }

    drawGradient(timestamp) {
        if (!this.ctx || !this.canvas) return;

        const { width, height } = this.canvas;
        let colors = this.colorSchemes[this.currentSlide];

        // Handle color scheme transitions
        if (this.isTransitioning && this.previousColorScheme) {
            const elapsed = timestamp - this.transitionStartTime;
            const progress = Math.min(elapsed / this.transitionDuration, 1);

            // Use easing function for smoother transition
            const easedProgress = this.easeInOutCubic(progress);

            colors = this.interpolateColorSchemes(this.previousColorScheme, this.colorSchemes[this.currentSlide], easedProgress);

            // End transition when complete
            if (progress >= 1) {
                this.isTransitioning = false;
                this.previousColorScheme = null;
            }
        }

        const time = timestamp * 0.0005; // Much slower animation

        // Create moving gradient with subtle flow
        const flowX = Math.sin(time * 0.7) * width * 0.3;
        const flowY = Math.cos(time * 0.5) * height * 0.2;

        const gradient = this.ctx.createLinearGradient(flowX, flowY, width + flowX * 0.5, height + flowY * 0.5);

        // Very subtle color variations with movement
        colors.forEach((color, index) => {
            const offset = index / (colors.length - 1);
            const wave = Math.sin(time + index * 0.3) * 0.05; // Very subtle wave

            const r = Math.max(0, Math.min(255, color[0] + wave * 5));
            const g = Math.max(0, Math.min(255, color[1] + wave * 5));
            const b = Math.max(0, Math.min(255, color[2] + wave * 5));

            gradient.addColorStop(offset, `rgb(${r}, ${g}, ${b})`);
        });

        // Fill with moving gradient
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);

        // Add a second layer with radial gradient for more depth
        const centerX = width * 0.5 + Math.sin(time * 0.3) * width * 0.15;
        const centerY = height * 0.5 + Math.cos(time * 0.4) * height * 0.1;
        const radius = Math.max(width, height) * 0.8;

        const radialGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

        // Very subtle radial overlay
        radialGradient.addColorStop(0, `rgba(${colors[0][0] + 10}, ${colors[0][1] + 10}, ${colors[0][2] + 10}, 0.1)`);
        radialGradient.addColorStop(0.5, `rgba(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}, 0.05)`);
        radialGradient.addColorStop(
            1,
            `rgba(${colors[colors.length - 1][0]}, ${colors[colors.length - 1][1]}, ${colors[colors.length - 1][2]}, 0.03)`
        );

        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.fillStyle = radialGradient;
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.globalCompositeOperation = 'source-over';
    }

    nextSlide() {
        if (this.currentSlide < 4) {
            this.startColorTransition(this.currentSlide + 1);
        } else {
            this.completeOnboarding();
        }
    }

    prevSlide() {
        if (this.currentSlide > 0) {
            this.startColorTransition(this.currentSlide - 1);
        }
    }

    startColorTransition(newSlide) {
        this.previousColorScheme = [...this.colorSchemes[this.currentSlide]];
        this.currentSlide = newSlide;
        this.isTransitioning = true;
        this.transitionStartTime = performance.now();
    }

    // Interpolate between two color schemes
    interpolateColorSchemes(scheme1, scheme2, progress) {
        return scheme1.map((color1, index) => {
            const color2 = scheme2[index];
            return [
                color1[0] + (color2[0] - color1[0]) * progress,
                color1[1] + (color2[1] - color1[1]) * progress,
                color1[2] + (color2[2] - color1[2]) * progress,
            ];
        });
    }

    // Easing function for smooth transitions
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    handleContextInput(e) {
        this.contextText = e.target.value;
    }

    completeOnboarding() {
        if (this.contextText.trim()) {
            localStorage.setItem('customPrompt', this.contextText.trim());
        }

        // Initialize VAD settings with defaults on first run
        // This ensures VAD works immediately without needing to toggle settings
        if (localStorage.getItem('vadEnabled') === null) {
            localStorage.setItem('vadEnabled', 'true');
        }
        if (localStorage.getItem('vadMode') === null) {
            localStorage.setItem('vadMode', 'automatic');
        }

        // Force manual screenshot mode to prevent rate limits
        localStorage.setItem('selectedScreenshotInterval', 'manual');

        localStorage.setItem('onboardingCompleted', 'true');
        this.onComplete();
    }

    getSlideContent() {
        const slides = [
            {
                icon: 'assets/onboarding/welcome.svg',
                title: 'Welcome to Cheating Daddy',
                content:
                    'Your AI assistant that listens and watches, then provides intelligent suggestions automatically during interviews and also provide accurate answers in exams.',
            },
            {
                icon: 'assets/onboarding/security.svg',
                title: 'Completely Private',
                content: 'Invisible to screen sharing apps and recording software. Your secret advantage stays completely hidden from others.',
            },
            {
                icon: 'assets/onboarding/language.svg',
                title: 'Multiple Languages',
                content: 'Supports interviews and exam mode in many languages. Select your preferred language in settings to get AI responses in your native tongue.',
            },
            {
                icon: 'assets/onboarding/customize.svg',
                title: 'Additional Features',
                content: '',
                showFeatures: true,
            },
            {
                icon: 'assets/onboarding/ready.svg',
                title: 'Ready to Go',
                content: 'Add your Gemini or Groq API key in settings and start getting AI-powered assistance in real-time for interviews and exams.',
            },
        ];

        return slides[this.currentSlide];
    }

    render() {
        const slide = this.getSlideContent();

        return html`
            <div class="onboarding-container">
                <canvas class="gradient-canvas"></canvas>

                <div class="content-wrapper">
                    <img class="slide-icon" src="${slide.icon}" alt="${slide.title} icon" />
                    <div class="slide-title">${slide.title}</div>
                    <div class="slide-content">${slide.content}</div>

                    ${slide.showTextarea
                        ? html`
                              <textarea
                                  class="context-textarea"
                                  placeholder="Paste your resume, job description, or any relevant context here..."
                                  .value=${this.contextText}
                                  @input=${this.handleContextInput}
                              ></textarea>
                          `
                        : ''}
                    ${slide.showFeatures
                        ? html`
                              <div class="feature-list">
                                  <div class="feature-item">
                                      <span class="feature-icon">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                              <line x1="8" y1="21" x2="16" y2="21"></line>
                                              <line x1="12" y1="17" x2="12" y2="21"></line>
                                          </svg>
                                      </span>
                                      Multiple AI models to choose from
                                  </div>
                                  <div class="feature-item">
                                      <span class="feature-icon">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                              <circle cx="9" cy="7" r="4"></circle>
                                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                          </svg>
                                      </span>
                                      Interview and exam modes
                                  </div>
                                  <div class="feature-item">
                                      <span class="feature-icon">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                              <circle cx="12" cy="12" r="3"></circle>
                                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                          </svg>
                                      </span>
                                      Customize AI behavior and responses
                                  </div>
                              </div>
                          `
                        : ''}
                </div>

                <div class="navigation">
                    <button class="nav-button" @click=${this.prevSlide} ?disabled=${this.currentSlide === 0}>
                        <svg width="14px" height="14px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                            this.startColorTransition(index);
                                        }
                                    }}
                                ></div>
                            `
                        )}
                    </div>

                    <button class="nav-button" @click=${this.nextSlide}>
                        ${this.currentSlide === 4
                            ? 'Get Started'
                            : html`
                                  <svg width="14px" height="14px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import OnboardingStyle from '../../style/OnboardingStyle.js';

export class OnboardingView extends LitElement {
    static styles = OnboardingStyle; // Importing the styles from OnboardingStyle.js
    
    static properties = {
        currentSlide: { type: Number },
        contextText: { type: String },
        onComplete: { type: Function },
        onClose: { type: Function },
    };

    //constructor
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
        localStorage.setItem('onboardingCompleted', 'true');
        this.onComplete();
    }

    getSlideContent() {
        const slides = [
            {
                icon: 'assets/onboarding/welcome.svg',
                title: 'Welcome to Cheating Daddy',
                content:
                    'Your AI assistant that listens and watches, then provides intelligent suggestions automatically during interviews and meetings.',
            },
            {
                icon: 'assets/onboarding/security.svg',
                title: 'Completely Private',
                content: 'Invisible to screen sharing apps and recording software. Your secret advantage stays completely hidden from others.',
            },
            {
                icon: 'assets/onboarding/context.svg',
                title: 'Add Your Context',
                content: 'Share relevant information to help the AI provide better, more personalized assistance.',
                showTextarea: true,
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
                content: 'Add your Gemini API key in settings and start getting AI-powered assistance in real-time.',
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
                                      <span class="feature-icon">🎨</span>
                                      Customize AI behavior and responses
                                  </div>
                                  <div class="feature-item">
                                      <span class="feature-icon">📚</span>
                                      Review conversation history
                                  </div>
                                  <div class="feature-item">
                                      <span class="feature-icon">🔧</span>
                                      Adjust capture settings and intervals
                                  </div>
                              </div>
                          `
                        : ''}
                </div>

                <div class="navigation">
                    <button class="nav-button" @click=${this.prevSlide} ?disabled=${this.currentSlide === 0}>
                        <svg width="16px" height="16px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                  <svg width="16px" height="16px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

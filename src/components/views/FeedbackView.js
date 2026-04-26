import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

const FEEDBACK_FORM_URL = 'https://forms.gle/1JPoh81mUPkJMvje7';

export class FeedbackView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .feedback-embed {
                width: 100%;
                height: min(78vh, 900px);
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                background: var(--bg-elevated);
                overflow: hidden;
            }

            .feedback-iframe {
                width: 100%;
                height: 100%;
                border: 0;
                background: #fff;
            }
        `,
    ];

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div class="page-title">Feedback</div>

                    <section class="surface">
                        <div class="feedback-embed">
                            <iframe
                                class="feedback-iframe"
                                src=${FEEDBACK_FORM_URL}
                                title="Feedback Form"
                            ></iframe>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('feedback-view', FeedbackView);

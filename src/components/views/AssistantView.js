import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        * {
            font-family: 'Inter', sans-serif;
            cursor: default;
        }

        .response-container {
            height: calc(100% - 60px);
            overflow-y: auto;
            border-radius: 10px;
            font-size: var(--response-font-size, 18px);
            line-height: 1.6;
            background: var(--main-content-background);
            padding: 16px;
            scroll-behavior: smooth;
            user-select: text;
            cursor: text;
        }

        /* Allow text selection for all content within the response container */
        .response-container * {
            user-select: text;
            cursor: text;
        }

        /* Restore default cursor for interactive elements */
        .response-container a {
            cursor: pointer;
        }

        /* Animated word-by-word reveal */
        .response-container [data-word] {
            opacity: 0;
            filter: blur(10px);
            display: inline-block;
            transition: opacity 0.5s, filter 0.5s;
        }
        .response-container [data-word].visible {
            opacity: 1;
            filter: blur(0px);
        }

        /* Markdown styling */
        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            margin: 1.2em 0 0.6em 0;
            color: var(--text-color);
            font-weight: 600;
        }

        .response-container h1 {
            font-size: 1.8em;
        }
        .response-container h2 {
            font-size: 1.5em;
        }
        .response-container h3 {
            font-size: 1.3em;
        }
        .response-container h4 {
            font-size: 1.1em;
        }
        .response-container h5 {
            font-size: 1em;
        }
        .response-container h6 {
            font-size: 0.9em;
        }

        .response-container p {
            margin: 0.8em 0;
            color: var(--text-color);
        }

        .response-container ul,
        .response-container ol {
            margin: 0.8em 0;
            padding-left: 2em;
            color: var(--text-color);
        }

        .response-container li {
            margin: 0.4em 0;
        }

        .response-container blockquote {
            margin: 1em 0;
            padding: 0.5em 1em;
            border-left: 4px solid var(--focus-border-color);
            background: rgba(0, 122, 255, 0.1);
            font-style: italic;
        }

        .response-container code {
            background: rgba(255, 255, 255, 0.1);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.85em;
        }

        .response-container pre {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--button-border);
            border-radius: 8px;
            padding: 1.2em;
            overflow-x: auto;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-word;
            white-space: pre-wrap;
            margin: 1em 0;
            position: relative;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            max-width: 100%;
        }

        .response-container pre code {
            background: none;
            padding: 0;
            border-radius: 0;
            font-family: 'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            color: #d4d4d4;
            white-space: pre-wrap;
            word-break: break-word;
        }

        /* Enhanced code block styling with VS Code colors */
        .response-container pre.hljs {
            background: rgba(0, 0, 0, 0.2) !important;
            border: 1px solid #404040;
            color: #d4d4d4 !important;
        }

        /* VS Code Syntax Highlighting Colors */
        
        /* Keywords (blue) */
        .response-container .hljs-keyword,
        .response-container .hljs-selector-tag,
        .response-container .hljs-literal,
        .response-container .hljs-section,
        .response-container .hljs-link,
        .response-container .hljs-built_in {
            color: #569cd6 !important;
        }

        /* Strings (orange/salmon) */
        .response-container .hljs-string,
        .response-container .hljs-char,
        .response-container .hljs-template-variable,
        .response-container .hljs-template-string {
            color: #ce9178 !important;
        }

        /* Comments (green) */
        .response-container .hljs-comment,
        .response-container .hljs-quote {
            color: #6a9955 !important;
            font-style: italic;
        }

        /* Numbers (light green) */
        .response-container .hljs-number,
        .response-container .hljs-literal {
            color: #b5cea8 !important;
        }

        /* Functions (yellow) */
        .response-container .hljs-function,
        .response-container .hljs-title,
        .response-container .hljs-params,
        .response-container .hljs-name {
            color: #dcdcaa !important;
        }

        /* Variables and attributes (light blue) */
        .response-container .hljs-variable,
        .response-container .hljs-attr,
        .response-container .hljs-property,
        .response-container .hljs-attribute {
            color: #9cdcfe !important;
        }

        /* Types and classes (teal) */
        .response-container .hljs-type,
        .response-container .hljs-class,
        .response-container .hljs-title.class_,
        .response-container .hljs-tag {
            color: #4ec9b0 !important;
        }

        /* Operators and punctuation */
        .response-container .hljs-operator,
        .response-container .hljs-punctuation {
            color: #d4d4d4 !important;
        }

        /* Special elements */
        .response-container .hljs-meta,
        .response-container .hljs-meta-keyword {
            color: #569cd6 !important;
        }

        .response-container .hljs-meta-string {
            color: #ce9178 !important;
        }

        /* Regular expressions */
        .response-container .hljs-regexp {
            color: #d16969 !important;
        }

        /* Symbols and constants */
        .response-container .hljs-symbol,
        .response-container .hljs-constant {
            color: #4fc1ff !important;
        }

        /* Emphasis */
        .response-container .hljs-emphasis {
            font-style: italic;
        }

        .response-container .hljs-strong {
            font-weight: bold;
        }

        /* Language indicator */
        .response-container pre::before {
            content: attr(data-language);
            position: absolute;
            top: 0.5em;
            right: 0.8em;
            font-size: 0.7em;
            color: #858585;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 3px;
        }

        /* Language-specific enhancements */
        
        /* JavaScript/TypeScript */
        .response-container .hljs-keyword.hljs-return,
        .response-container .hljs-keyword.hljs-function,
        .response-container .hljs-keyword.hljs-const,
        .response-container .hljs-keyword.hljs-let,
        .response-container .hljs-keyword.hljs-var {
            color: #569cd6 !important;
        }

        /* Python */
        .response-container .hljs-keyword.hljs-def,
        .response-container .hljs-keyword.hljs-class,
        .response-container .hljs-keyword.hljs-import,
        .response-container .hljs-keyword.hljs-from {
            color: #569cd6 !important;
        }

        /* HTML/XML */
        .response-container .hljs-tag .hljs-name {
            color: #569cd6 !important;
        }

        .response-container .hljs-tag .hljs-attr {
            color: #9cdcfe !important;
        }

        /* CSS */
        .response-container .hljs-selector-class,
        .response-container .hljs-selector-id {
            color: #d7ba7d !important;
        }

        .response-container .hljs-property {
            color: #9cdcfe !important;
        }

        /* SQL */
        .response-container .hljs-keyword.hljs-select,
        .response-container .hljs-keyword.hljs-from,
        .response-container .hljs-keyword.hljs-where {
            color: #569cd6 !important;
        }

        /* JSON */
        .response-container .hljs-attr {
            color: #9cdcfe !important;
        }

        /* Markdown in code blocks */
        .response-container .hljs-section {
            color: #569cd6 !important;
            font-weight: bold;
        }

        .response-container .hljs-code {
            color: #ce9178 !important;
        }

        /* Better syntax highlighting for inline code */
        .response-container code:not(pre code) {
            background: rgba(255, 255, 255, 0.15);
            color: #ce9178;
            font-weight: 500;
            padding: 0.15em 0.3em;
            border-radius: 3px;
        }

        .response-container a {
            color: var(--link-color);
            text-decoration: none;
        }

        .response-container a:hover {
            text-decoration: underline;
        }

        .response-container strong,
        .response-container b {
            font-weight: 600;
            color: var(--text-color);
        }

        .response-container em,
        .response-container i {
            font-style: italic;
        }

        .response-container hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 2em 0;
        }

        .response-container table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }

        .response-container th,
        .response-container td {
            border: 1px solid var(--border-color);
            padding: 0.5em;
            text-align: left;
        }

        .response-container th {
            background: var(--input-background);
            font-weight: 600;
        }

        .response-container::-webkit-scrollbar {
            width: 8px;
        }

        .response-container::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        /* KaTeX display math styling */
        .response-container .katex-display {
            display: block;
            margin: 1em 0;
            text-align: center;
        }

        .response-container .katex {
            font-size: 1.05em;
            font-weight: bold;
        }

        .text-input-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
            align-items: center;
        }

        .text-input-container input {
            flex: 1;
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 14px;
        }

        .text-input-container input:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 3px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        .text-input-container input::placeholder {
            color: var(--placeholder-color);
        }

        .text-input-container button {
            background: transparent;
            color: var(--start-button-background);
            border: none;
            padding: 0;
            border-radius: 100px;
        }

        .text-input-container button:hover {
            background: var(--text-input-button-hover);
        }

        .nav-button {
            background: transparent;
            color: white;
            border: none;
            padding: 4px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 36px;
            height: 36px;
            justify-content: center;
        }

        .nav-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .nav-button:disabled {
            opacity: 0.3;
        }

        .nav-button svg {
            stroke: white !important;
        }

        .response-counter {
            font-size: 12px;
            color: var(--description-color);
            white-space: nowrap;
            min-width: 60px;
            text-align: center;
        }

        .save-button {
            background: transparent;
            color: var(--start-button-background);
            border: none;
            padding: 4px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 36px;
            height: 36px;
            justify-content: center;
            cursor: pointer;
        }

        .save-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .save-button.copied {
            color: #4caf50;
        }

        .save-button svg {
            stroke: currentColor !important;
        }

        .mic-toggle-button {
            background: transparent;
            border: 2px solid var(--button-border);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
            transition: all 0.2s ease;
            position: relative;
        }

        .mic-toggle-button.active {
            background: rgba(0, 122, 255, 0.3);
            border-color: #007aff;
            box-shadow: 0 0 8px rgba(0, 122, 255, 0.4);
        }

        .mic-toggle-button.inactive {
            background: rgba(255, 59, 48, 0.15);
            border-color: #ff3b30;
        }

        .mic-toggle-button.active:hover {
            background: rgba(0, 122, 255, 0.45);
            border-color: #007aff;
            box-shadow: 0 0 12px rgba(0, 122, 255, 0.7);
        }

        .mic-toggle-button.inactive:hover {
            background: rgba(255, 59, 48, 0.25);
        }

        .mic-toggle-button svg {
            width: 20px;
            height: 20px;
        }

        .mic-toggle-button.active svg {
            stroke: white !important;
        }

        .mic-toggle-button.inactive svg {
            stroke: #ff3b30 !important;
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        savedResponses: { type: Array },
        copiedFeedback: { type: Boolean },
        micEnabled: { type: Boolean },
        vadMode: { type: String },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.onSendText = () => {};
        this._lastAnimatedWordCount = 0;
        this.copiedFeedback = false;
        // Microphone starts as OFF by default (for manual mode)
        this.micEnabled = false;
        // Load VAD mode from localStorage
        this.vadMode = localStorage.getItem('vadMode') || 'automatic';
        // Load saved responses from localStorage
        try {
            this.savedResponses = JSON.parse(localStorage.getItem('savedResponses') || '[]');
        } catch (e) {
            this.savedResponses = [];
        }

        // Listen for VAD mode changes
        this.setupVADModeListener();
    }

    setupVADModeListener() {
        // Listen for localStorage changes from settings
        window.addEventListener('storage', (e) => {
            if (e.key === 'vadMode') {
                this.vadMode = e.newValue || 'automatic';

                // In automatic mode: enable mic automatically
                if (this.vadMode === 'automatic') {
                    this.micEnabled = true;
                    if (window.cheddar && window.cheddar.toggleMicrophone) {
                        window.cheddar.toggleMicrophone(true);
                    }
                }
                this.requestUpdate();
            }
        });
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };
    }

    getLocalizedGreeting() {
        const profileNames = this.getProfileNames();
        const profileName = profileNames[this.selectedProfile] || 'session';

        // Localized greetings for all supported languages
        const greetings = {
            'en-US': `Hey, I'm listening to your ${profileName}`,
            'en-GB': `Hey, I'm listening to your ${profileName}`,
            'en-AU': `Hey, I'm listening to your ${profileName}`,
            'en-IN': `Hey, I'm listening to your ${profileName}`,
            'es-ES': `Hola, estoy escuchando tu ${profileName === 'Job Interview' ? 'Entrevista de Trabajo' : profileName === 'Sales Call' ? 'Llamada de Ventas' : profileName === 'Business Meeting' ? 'Reunión de Negocios' : profileName === 'Presentation' ? 'Presentación' : profileName === 'Negotiation' ? 'Negociación' : 'Asistente de Examen'}`,
            'es-US': `Hola, estoy escuchando tu ${profileName === 'Job Interview' ? 'Entrevista de Trabajo' : profileName === 'Sales Call' ? 'Llamada de Ventas' : profileName === 'Business Meeting' ? 'Reunión de Negocios' : profileName === 'Presentation' ? 'Presentación' : profileName === 'Negotiation' ? 'Negociación' : 'Asistente de Examen'}`,
            'fr-FR': `Salut, j'écoute votre ${profileName === 'Job Interview' ? 'Entretien d\'Embauche' : profileName === 'Sales Call' ? 'Appel Commercial' : profileName === 'Business Meeting' ? 'Réunion d\'Affaires' : profileName === 'Presentation' ? 'Présentation' : profileName === 'Negotiation' ? 'Négociation' : 'Assistant d\'Examen'}`,
            'de-DE': `Hey, ich höre deinem ${profileName === 'Job Interview' ? 'Vorstellungsgespräch' : profileName === 'Sales Call' ? 'Verkaufsgespräch' : profileName === 'Business Meeting' ? 'Geschäftstreffen' : profileName === 'Presentation' ? 'Präsentation' : profileName === 'Negotiation' ? 'Verhandlung' : 'Prüfungsassistenten'} zu`,
            'it-IT': `Ciao, sto ascoltando il tuo ${profileName === 'Job Interview' ? 'Colloquio di Lavoro' : profileName === 'Sales Call' ? 'Chiamata di Vendita' : profileName === 'Business Meeting' ? 'Riunione d\'Affari' : profileName === 'Presentation' ? 'Presentazione' : profileName === 'Negotiation' ? 'Negoziazione' : 'Assistente d\'Esame'}`,
            'pt-BR': `Oi, estou ouvindo sua ${profileName === 'Job Interview' ? 'Entrevista de Emprego' : profileName === 'Sales Call' ? 'Chamada de Vendas' : profileName === 'Business Meeting' ? 'Reunião de Negócios' : profileName === 'Presentation' ? 'Apresentação' : profileName === 'Negotiation' ? 'Negociação' : 'Assistente de Exame'}`,
            'pt-PT': `Olá, estou a ouvir a tua ${profileName === 'Job Interview' ? 'Entrevista de Emprego' : profileName === 'Sales Call' ? 'Chamada de Vendas' : profileName === 'Business Meeting' ? 'Reunião de Negócios' : profileName === 'Presentation' ? 'Apresentação' : profileName === 'Negotiation' ? 'Negociação' : 'Assistente de Exame'}`,
            'ru-RU': `Привет, я слушаю ваше ${profileName === 'Job Interview' ? 'Собеседование' : profileName === 'Sales Call' ? 'Звонок по Продажам' : profileName === 'Business Meeting' ? 'Деловая Встреча' : profileName === 'Presentation' ? 'Презентация' : profileName === 'Negotiation' ? 'Переговоры' : 'Помощник на Экзамене'}`,
            'ja-JP': `こんにちは、あなたの${profileName === 'Job Interview' ? '就職面接' : profileName === 'Sales Call' ? '営業電話' : profileName === 'Business Meeting' ? 'ビジネスミーティング' : profileName === 'Presentation' ? 'プレゼンテーション' : profileName === 'Negotiation' ? '交渉' : '試験アシスタント'}を聞いています`,
            'ko-KR': `안녕하세요, 당신의 ${profileName === 'Job Interview' ? '취업 면접' : profileName === 'Sales Call' ? '영업 전화' : profileName === 'Business Meeting' ? '비즈니스 미팅' : profileName === 'Presentation' ? '프레젠테이션' : profileName === 'Negotiation' ? '협상' : '시험 도우미'}을 듣고 있습니다`,
            'zh-CN': `嗨，我正在听你的${profileName === 'Job Interview' ? '求职面试' : profileName === 'Sales Call' ? '销售电话' : profileName === 'Business Meeting' ? '商务会议' : profileName === 'Presentation' ? '演示' : profileName === 'Negotiation' ? '谈判' : '考试助手'}`,
            'zh-TW': `嗨，我正在聽你的${profileName === 'Job Interview' ? '求職面試' : profileName === 'Sales Call' ? '銷售電話' : profileName === 'Business Meeting' ? '商務會議' : profileName === 'Presentation' ? '演示' : profileName === 'Negotiation' ? '談判' : '考試助手'}`,
            'ar-SA': `مرحبا، أنا أستمع إلى ${profileName === 'Job Interview' ? 'مقابلة العمل' : profileName === 'Sales Call' ? 'مكالمة المبيعات' : profileName === 'Business Meeting' ? 'اجتماع العمل' : profileName === 'Presentation' ? 'العرض التقديمي' : profileName === 'Negotiation' ? 'المفاوضات' : 'مساعد الامتحان'} الخاص بك`,
            'hi-IN': `नमस्ते, मैं आपके ${profileName === 'Job Interview' ? 'नौकरी साक्षात्कार' : profileName === 'Sales Call' ? 'बिक्री कॉल' : profileName === 'Business Meeting' ? 'व्यावसायिक बैठक' : profileName === 'Presentation' ? 'प्रस्तुति' : profileName === 'Negotiation' ? 'बातचीत' : 'परीक्षा सहायक'} को सुन रहा हूं`,
            'nl-NL': `Hé, ik luister naar je ${profileName === 'Job Interview' ? 'Sollicitatiegesprek' : profileName === 'Sales Call' ? 'Verkoopgesprek' : profileName === 'Business Meeting' ? 'Zakelijke Vergadering' : profileName === 'Presentation' ? 'Presentatie' : profileName === 'Negotiation' ? 'Onderhandeling' : 'Examen Assistent'}`,
            'pl-PL': `Cześć, słucham twojego ${profileName === 'Job Interview' ? 'Rozmowy Kwalifikacyjnej' : profileName === 'Sales Call' ? 'Rozmowy Sprzedażowej' : profileName === 'Business Meeting' ? 'Spotkania Biznesowego' : profileName === 'Presentation' ? 'Prezentacji' : profileName === 'Negotiation' ? 'Negocjacji' : 'Asystenta Egzaminacyjnego'}`,
            'tr-TR': `Merhaba, ${profileName === 'Job Interview' ? 'İş Görüşmenizi' : profileName === 'Sales Call' ? 'Satış Görüşmenizi' : profileName === 'Business Meeting' ? 'İş Toplantınızı' : profileName === 'Presentation' ? 'Sunumunuzu' : profileName === 'Negotiation' ? 'Müzakerenizi' : 'Sınav Asistanınızı'} dinliyorum`,
            'sv-SE': `Hej, jag lyssnar på din ${profileName === 'Job Interview' ? 'Jobbintervju' : profileName === 'Sales Call' ? 'Försäljningssamtal' : profileName === 'Business Meeting' ? 'Affärsmöte' : profileName === 'Presentation' ? 'Presentation' : profileName === 'Negotiation' ? 'Förhandling' : 'Examenassistent'}`,
            'da-DK': `Hej, jeg lytter til dit ${profileName === 'Job Interview' ? 'Jobinterview' : profileName === 'Sales Call' ? 'Salgsopkald' : profileName === 'Business Meeting' ? 'Forretningsmøde' : profileName === 'Presentation' ? 'Præsentation' : profileName === 'Negotiation' ? 'Forhandling' : 'Eksamensassistent'}`,
            'fi-FI': `Hei, kuuntelen ${profileName === 'Job Interview' ? 'Työhaastatteluasi' : profileName === 'Sales Call' ? 'Myyntipuheluasi' : profileName === 'Business Meeting' ? 'Liiketapaamisesi' : profileName === 'Presentation' ? 'Esitystäsi' : profileName === 'Negotiation' ? 'Neuvotteluasi' : 'Koeavustajaasi'}`,
            'no-NO': `Hei, jeg lytter til ditt ${profileName === 'Job Interview' ? 'Jobbintervju' : profileName === 'Sales Call' ? 'Salgssamtale' : profileName === 'Business Meeting' ? 'Forretningsmøte' : profileName === 'Presentation' ? 'Presentasjon' : profileName === 'Negotiation' ? 'Forhandling' : 'Eksamensassistent'}`,
            // Thai
            'th-TH': `สวัสดี ฉันกำลังฟัง${profileName === 'Job Interview' ? 'การสัมภาษณ์งาน' : profileName === 'Sales Call' ? 'การโทรขาย' : profileName === 'Business Meeting' ? 'การประชุมธุรกิจ' : profileName === 'Presentation' ? 'การนำเสนอ' : profileName === 'Negotiation' ? 'การเจรจา' : 'ผู้ช่วยสอบ'}ของคุณ`,
            // Mandarin Chinese (alternate code)
            'cmn-CN': `嗨，我正在听你的${profileName === 'Job Interview' ? '求职面试' : profileName === 'Sales Call' ? '销售电话' : profileName === 'Business Meeting' ? '商务会议' : profileName === 'Presentation' ? '演示' : profileName === 'Negotiation' ? '谈判' : '考试助手'}`,
            // Arabic (alternate code)
            'ar-XA': `مرحبا، أنا أستمع إلى ${profileName === 'Job Interview' ? 'مقابلة العمل' : profileName === 'Sales Call' ? 'مكالمة المبيعات' : profileName === 'Business Meeting' ? 'اجتماع العمل' : profileName === 'Presentation' ? 'العرض التقديمي' : profileName === 'Negotiation' ? 'المفاوضات' : 'مساعد الامتحان'} الخاص بك`,
            // Telugu
            'te-IN': `హాయ్, నేను మీ ${profileName === 'Job Interview' ? 'ఉద్యోగ ఇంటర్వ్యూ' : profileName === 'Sales Call' ? 'సేల్స్ కాల్' : profileName === 'Business Meeting' ? 'వ్యాపార సమావేశం' : profileName === 'Presentation' ? 'ప్రెజెంటేషన్' : profileName === 'Negotiation' ? 'చర్చలు' : 'పరీక్ష సహాయకుడు'}ను వింటున్నాను`,
            // Tamil
            'ta-IN': `வணக்கம், நான் உங்கள் ${profileName === 'Job Interview' ? 'வேலை நேர்காணல்' : profileName === 'Sales Call' ? 'விற்பனை அழைப்பு' : profileName === 'Business Meeting' ? 'வணிக கூட்டம்' : profileName === 'Presentation' ? 'விளக்கக்காட்சி' : profileName === 'Negotiation' ? 'பேச்சுவார்த்தை' : 'தேர்வு உதவியாளர்'}ஐ கேட்கிறேன்`,
            // Marathi
            'mr-IN': `नमस्कार, मी तुमच्या ${profileName === 'Job Interview' ? 'नोकरी मुलाखतीला' : profileName === 'Sales Call' ? 'विक्री कॉलला' : profileName === 'Business Meeting' ? 'व्यावसायिक बैठकीला' : profileName === 'Presentation' ? 'सादरीकरणाला' : profileName === 'Negotiation' ? 'वाटाघाटीला' : 'परीक्षा सहाय्यकाला'} ऐकत आहे`,
            // Malayalam
            'ml-IN': `ഹായ്, ഞാൻ നിങ്ങളുടെ ${profileName === 'Job Interview' ? 'ജോലി അഭിമുഖം' : profileName === 'Sales Call' ? 'സെയിൽസ് കോൾ' : profileName === 'Business Meeting' ? 'ബിസിനസ് മീറ്റിംഗ്' : profileName === 'Presentation' ? 'അവതരണം' : profileName === 'Negotiation' ? 'ചർച്ച' : 'പരീക്ഷ സഹായി'} കേൾക്കുന്നു`,
            // Kannada
            'kn-IN': `ಹಾಯ್, ನಾನು ನಿಮ್ಮ ${profileName === 'Job Interview' ? 'ಉದ್ಯೋಗ ಸಂದರ್ಶನ' : profileName === 'Sales Call' ? 'ಮಾರಾಟ ಕರೆ' : profileName === 'Business Meeting' ? 'ವ್ಯಾಪಾರ ಸಭೆ' : profileName === 'Presentation' ? 'ಪ್ರಸ್ತುತಿ' : profileName === 'Negotiation' ? 'ಸಮಾಲೋಚನೆ' : 'ಪರೀಕ್ಷೆ ಸಹಾಯಕ'}ವನ್ನು ಕೇಳುತ್ತಿದ್ದೇನೆ`,
            // Gujarati
            'gu-IN': `હેલો, હું તમારા ${profileName === 'Job Interview' ? 'નોકરી ઇન્ટરવ્યુ' : profileName === 'Sales Call' ? 'સેલ્સ કોલ' : profileName === 'Business Meeting' ? 'બિઝનેસ મીટિંગ' : profileName === 'Presentation' ? 'પ્રેઝન્ટેશન' : profileName === 'Negotiation' ? 'વાટાઘાટ' : 'પરીક્ષા સહાયક'}ને સાંભળી રહ્યો છું`,
            // Bengali
            'bn-IN': `হ্যালো, আমি আপনার ${profileName === 'Job Interview' ? 'চাকরির ইন্টারভিউ' : profileName === 'Sales Call' ? 'সেলস কল' : profileName === 'Business Meeting' ? 'ব্যবসায়িক মিটিং' : profileName === 'Presentation' ? 'উপস্থাপনা' : profileName === 'Negotiation' ? 'আলোচনা' : 'পরীক্ষা সহায়ক'} শুনছি`,
            // Vietnamese
            'vi-VN': `Xin chào, tôi đang lắng nghe ${profileName === 'Job Interview' ? 'Phỏng vấn Việc làm' : profileName === 'Sales Call' ? 'Cuộc gọi Bán hàng' : profileName === 'Business Meeting' ? 'Cuộc họp Kinh doanh' : profileName === 'Presentation' ? 'Bài thuyết trình' : profileName === 'Negotiation' ? 'Đàm phán' : 'Trợ lý Thi cử'} của bạn`,
            // Indonesian
            'id-ID': `Halo, saya mendengarkan ${profileName === 'Job Interview' ? 'Wawancara Kerja' : profileName === 'Sales Call' ? 'Panggilan Penjualan' : profileName === 'Business Meeting' ? 'Rapat Bisnis' : profileName === 'Presentation' ? 'Presentasi' : profileName === 'Negotiation' ? 'Negosiasi' : 'Asisten Ujian'} Anda`,
            // French (Canada)
            'fr-CA': `Salut, j'écoute votre ${profileName === 'Job Interview' ? 'Entrevue d\'Emploi' : profileName === 'Sales Call' ? 'Appel de Vente' : profileName === 'Business Meeting' ? 'Réunion d\'Affaires' : profileName === 'Presentation' ? 'Présentation' : profileName === 'Negotiation' ? 'Négociation' : 'Assistant d\'Examen'}`,
        };

        return greetings[this.selectedLanguage] || greetings['en-US'];
    }

    getCurrentResponse() {
        return this.responses.length > 0 && this.currentResponseIndex >= 0
            ? this.responses[this.currentResponseIndex]
            : this.getLocalizedGreeting();
    }

    renderMarkdown(content) {
        // Check if marked is available
        if (typeof window !== 'undefined' && window.marked) {
            try {
                // Configure marked for better security and formatting
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false, // We trust the AI responses
                    highlight: function(code, language) {
                        // Use highlight.js for syntax highlighting if available
                        if (typeof window !== 'undefined' && window.hljs) {
                            if (language && window.hljs.getLanguage(language)) {
                                try {
                                    return window.hljs.highlight(code, { language: language }).value;
                                } catch (err) {
                                    console.warn('Error highlighting code:', err);
                                }
                            }
                            // Auto-detect language if not specified
                            try {
                                return window.hljs.highlightAuto(code).value;
                            } catch (err) {
                                console.warn('Error auto-highlighting code:', err);
                            }
                        }
                        return code; // Fallback to plain code
                    }
                });
                let rendered = window.marked.parse(content);
                rendered = this.renderLaTeX(rendered);
                rendered = this.wrapWordsInSpans(rendered);
                rendered = this.enhanceCodeBlocks(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content; // Fallback to plain text
            }
        }
        console.log('Marked not available, using plain text');
        return content; // Fallback if marked is not available
    }

    renderLaTeX(html) {
        // Check if KaTeX is available
        if (typeof window === 'undefined' || !window.katex) {
            return html;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Function to check if a node is inside a code element
            function isInsideCode(node) {
                let parent = node.parentElement;
                while (parent) {
                    if (parent.tagName === 'CODE' || parent.tagName === 'PRE') {
                        return true;
                    }
                    parent = parent.parentElement;
                }
                return false;
            }

            // Function to process LaTeX in text nodes
            function processTextNode(textNode) {
                if (isInsideCode(textNode)) {
                    return; // Skip processing if inside code
                }

                let text = textNode.textContent;
                let hasLaTeX = false;

                // Check for display math ($$...$$) or inline math ($...$)
                if (/\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$/.test(text)) {
                    hasLaTeX = true;
                }

                if (!hasLaTeX) {
                    return;
                }

                // Process display math first ($$...$$)
                text = text.replace(/\$\$([^\$]+?)\$\$/g, (match, latex) => {
                    try {
                        const rendered = window.katex.renderToString(latex.trim(), {
                            displayMode: true,
                            throwOnError: false,
                            output: 'html'
                        });
                        return `<span class="katex-display">${rendered}</span>`;
                    } catch (err) {
                        console.warn('Error rendering display LaTeX:', err);
                        return match;
                    }
                });

                // Process inline math ($...$)
                text = text.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
                    try {
                        return window.katex.renderToString(latex.trim(), {
                            displayMode: false,
                            throwOnError: false,
                            output: 'html'
                        });
                    } catch (err) {
                        console.warn('Error rendering inline LaTeX:', err);
                        return match;
                    }
                });

                // Replace the text node with the processed HTML
                if (text !== textNode.textContent) {
                    const span = document.createElement('span');
                    span.innerHTML = text;
                    textNode.parentNode.replaceChild(span, textNode);
                }
            }

            // Walk through all text nodes
            const walker = document.createTreeWalker(
                doc.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.trim()) {
                    textNodes.push(node);
                }
            }

            // Process each text node
            textNodes.forEach(processTextNode);

            return doc.body.innerHTML;
        } catch (error) {
            console.warn('Error processing LaTeX:', error);
            return html;
        }
    }

    wrapWordsInSpans(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tagsToSkip = ['PRE'];

        function wrap(node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && !tagsToSkip.includes(node.parentNode.tagName)) {
                const words = node.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                words.forEach(word => {
                    if (word.trim()) {
                        const span = document.createElement('span');
                        span.setAttribute('data-word', '');
                        span.textContent = word;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(word));
                    }
                });
                node.parentNode.replaceChild(frag, node);
            } else if (node.nodeType === Node.ELEMENT_NODE && !tagsToSkip.includes(node.tagName)) {
                Array.from(node.childNodes).forEach(wrap);
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }

    enhanceCodeBlocks(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find all pre elements and enhance them
        const preElements = doc.querySelectorAll('pre');
        preElements.forEach(pre => {
            const codeElement = pre.querySelector('code');
            if (codeElement) {
                // Extract language from class (hljs adds language-specific classes)
                const classList = Array.from(codeElement.classList);
                const languageClass = classList.find(cls => cls.startsWith('language-')) || classList.find(cls => cls !== 'hljs');
                
                if (languageClass) {
                    const language = languageClass.replace('language-', '').replace('hljs-', '');
                    if (language && language !== 'hljs') {
                        pre.setAttribute('data-language', language);
                    }
                }
                
                // Add hljs class to pre element for consistent styling
                if (codeElement.classList.contains('hljs') || classList.some(cls => cls.startsWith('language-'))) {
                    pre.classList.add('hljs');
                }
            }
        });
        
        return doc.body.innerHTML;
    }

    getResponseCounter() {
        return this.responses.length > 0 ? `${this.currentResponseIndex + 1}/${this.responses.length}` : '';
    }

    navigateToPreviousResponse() {
        if (this.currentResponseIndex > 0) {
            this.currentResponseIndex--;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
        }
    }

    navigateToNextResponse() {
        if (this.currentResponseIndex < this.responses.length - 1) {
            this.currentResponseIndex++;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
        }
    }

    scrollResponseUp() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
        }
    }

    scrollResponseDown() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
            container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + scrollAmount);
        }
    }

    loadFontSize() {
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize !== null) {
            const fontSizeValue = parseInt(fontSize, 10) || 20;
            const root = document.documentElement;
            root.style.setProperty('--response-font-size', `${fontSizeValue}px`);
        }
    }

    connectedCallback() {
        super.connectedCallback();

        // Load and apply font size
        this.loadFontSize();

        // Set up IPC listeners for keyboard shortcuts
        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            this.handlePreviousResponse = () => {
                console.log('Received navigate-previous-response message');
                this.navigateToPreviousResponse();
            };

            this.handleNextResponse = () => {
                console.log('Received navigate-next-response message');
                this.navigateToNextResponse();
            };

            this.handleScrollUp = () => {
                console.log('Received scroll-response-up message');
                this.scrollResponseUp();
            };

            this.handleScrollDown = () => {
                console.log('Received scroll-response-down message');
                this.scrollResponseDown();
            };

            this.handleCopyCodeBlocks = () => {
                console.log('Received copy-code-blocks message');
                this.copyCurrentResponse();
            };

            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);
            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
            ipcRenderer.on('copy-code-blocks', this.handleCopyCodeBlocks);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // Clean up IPC listeners
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (this.handlePreviousResponse) {
                ipcRenderer.removeListener('navigate-previous-response', this.handlePreviousResponse);
            }
            if (this.handleNextResponse) {
                ipcRenderer.removeListener('navigate-next-response', this.handleNextResponse);
            }
            if (this.handleScrollUp) {
                ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
            }
            if (this.handleScrollDown) {
                ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
            }
            if (this.handleCopyCodeBlocks) {
                ipcRenderer.removeListener('copy-code-blocks', this.handleCopyCodeBlocks);
            }
        }
    }

    async handleSendText() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput && textInput.value.trim()) {
            const message = textInput.value.trim();
            textInput.value = ''; // Clear input
            await this.onSendText(message);
        }
    }

    handleTextKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.response-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    extractCodeBlocks(text) {
        // Extract code blocks from markdown text
        const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g;
        const multiLineInlineCodeRegex = /`([^`\n]*\n[^`]*)`/g; // Only multi-line inline code
        const codeBlocks = [];

        // Extract fenced code blocks (```code```)
        let match;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const codeContent = match[1].trim();
            if (codeContent.length > 0) {
                codeBlocks.push(codeContent);
            }
        }

        // If no fenced code blocks found, try to extract only multi-line inline code
        // (This avoids copying single words like "jovezhong" but allows actual code snippets)
        if (codeBlocks.length === 0) {
            while ((match = multiLineInlineCodeRegex.exec(text)) !== null) {
                const codeContent = match[1].trim();
                if (codeContent.length > 10) { // Only extract if it's reasonably long
                    codeBlocks.push(codeContent);
                }
            }
        }

        return codeBlocks;
    }

    copyCurrentResponse() {
        const currentResponse = this.getCurrentResponse();
        if (currentResponse) {
            // Extract code blocks from the response
            const codeBlocks = this.extractCodeBlocks(currentResponse);
            
            // Determine what to copy
            let textToCopy;
            if (codeBlocks.length > 0) {
                // Copy all code blocks, separated by newlines if multiple
                textToCopy = codeBlocks.join('\n\n');
            } else {
                // Fallback to full response if no code blocks found
                textToCopy = currentResponse;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Visual feedback - temporarily change button appearance
                this.copiedFeedback = true;
                this.requestUpdate();
                setTimeout(() => {
                    this.copiedFeedback = false;
                    this.requestUpdate();
                }, 1000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    this.copiedFeedback = true;
                    this.requestUpdate();
                    setTimeout(() => {
                        this.copiedFeedback = false;
                        this.requestUpdate();
                    }, 1000);
                } catch (err) {
                    console.error('Fallback: Unable to copy', err);
                }
                document.body.removeChild(textArea);
            });
        }
    }


    firstUpdated() {
        super.firstUpdated();
        this.updateResponseContent();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('responses') || changedProperties.has('currentResponseIndex')) {
            if (changedProperties.has('currentResponseIndex')) {
                this._lastAnimatedWordCount = 0;
            }
            this.updateResponseContent();
        }
    }

    updateResponseContent() {
        console.log('updateResponseContent called');
        const container = this.shadowRoot.querySelector('#responseContainer');
        if (container) {
            const currentResponse = this.getCurrentResponse();
            console.log('Current response length:', currentResponse.length);

            // Skip animation entirely - just render the final markdown
            // This prevents markdown breaking and re-streaming issues
            const renderedResponse = this.renderMarkdown(currentResponse);
            container.innerHTML = renderedResponse;

            // Make all words visible immediately (no animation)
            const words = container.querySelectorAll('[data-word]');
            words.forEach(word => word.classList.add('visible'));
            this._lastAnimatedWordCount = words.length;

            // Auto-scroll to bottom as new content arrives
            this.scrollToBottom();
        } else {
            console.log('Response container not found');
        }
    }

    handleMicToggle() {
        this.micEnabled = !this.micEnabled;

        // Notify the renderer process about mic state change
        if (window.cheddar && window.cheddar.toggleMicrophone) {
            window.cheddar.toggleMicrophone(this.micEnabled);
        }

        console.log(`Microphone ${this.micEnabled ? 'enabled' : 'disabled'}`);
        this.requestUpdate();
    }

    render() {
        const currentResponse = this.getCurrentResponse();
        const responseCounter = this.getResponseCounter();

        return html`
            <div class="response-container" id="responseContainer"></div>

            <div class="text-input-container">
                <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.currentResponseIndex <= 0}>
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="#ffffff"
                    >
                        <path d="M15 6L9 12L15 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>

                ${this.responses.length > 0 ? html` <span class="response-counter">${responseCounter}</span> ` : ''}

                <button
                    class="save-button ${this.copiedFeedback ? 'copied' : ''}"
                    @click=${this.copyCurrentResponse}
                    title="${this.copiedFeedback ? 'Response copied!' : 'Copy this response'}"
                >
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M8 4V2C8 1.44772 8.44772 1 9 1H19C19.5523 1 20 1.44772 20 2V12C20 12.5523 19.5523 13 19 13H17V20C17 21.1046 16.1046 22 15 22H5C3.89543 22 3 21.1046 3 20V10C3 8.89543 3.89543 8 5 8H8Z"
                            stroke="currentColor"
                            stroke-width="1.7"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        ></path>
                    </svg>
                </button>

                ${this.selectedProfile !== 'exam' && this.vadMode === 'manual' ? html`
                    <button
                        class="mic-toggle-button ${this.micEnabled ? 'active' : 'inactive'}"
                        @click=${this.handleMicToggle}
                    >
                        ${this.micEnabled ? html`
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 19V23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8 23H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        ` : html`
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L23 23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M9 9V12C9 13.6569 10.3431 15 12 15C12.9762 15 13.8416 14.5425 14.4005 13.8424" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 1C10.3431 1 9 2.34315 9 4V4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M15 5.5V12C15 12.3387 14.9629 12.6686 14.8934 12.9855" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M19 10V12C19 13.9585 18.2158 15.7355 16.9347 17.0165" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M5 10V12C5 15.866 8.13401 19 12 19M12 19V23M12 19M8 23H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        `}
                    </button>
                ` : ''}

                <input type="text" id="textInput" placeholder="Type a message to the AI..." @keydown=${this.handleTextKeydown} />

                <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.currentResponseIndex >= this.responses.length - 1}>
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="#ffffff"
                    >
                        <path d="M9 6L15 12L9 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);

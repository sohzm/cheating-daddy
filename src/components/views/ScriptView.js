import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';
import { loadScript, flatTimeline, formatClock, DEFAULT_WPM } from '../../utils/scriptTimeline.js';

const STORAGE_KEY = 'cheatingDaddy.script';
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const FONT_SCALES = [0.8, 1, 1.25, 1.5, 1.75, 2];
const TICK_MS = 200;
// Where the line being read sits, as a fraction of the prompter's height.
// The user drags it; these bound the drag so the line stays on screen.
const DEFAULT_READING_LINE = 0.35;
const MIN_READING_LINE = 0.08;
const MAX_READING_LINE = 0.85;
const DASH = '—';

// Playback lives at module level so it survives switching between the
// 'script' (loader) and 'script-player' (on-screen) views, which remount
// the element.
const session = {
    name: '',
    text: '',
    wpm: DEFAULT_WPM,
    fontScale: 1,
    readingLine: DEFAULT_READING_LINE,
    speed: 1,
    parsed: null,
    flat: [],
    time: 0,
    playing: false,
    lastStamp: 0,
    controlsHidden: false,
};

function readSaved() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && typeof saved.text === 'string') {
            session.name = typeof saved.name === 'string' ? saved.name : '';
            session.text = saved.text;
            if (Number(saved.wpm) > 0) session.wpm = Number(saved.wpm);
            if (FONT_SCALES.includes(Number(saved.fontScale))) session.fontScale = Number(saved.fontScale);
            if (Number(saved.readingLine) > 0)
                session.readingLine = Math.max(MIN_READING_LINE, Math.min(MAX_READING_LINE, Number(saved.readingLine)));
        }
    } catch (e) {
        // storage unavailable or corrupt; start empty
    }
}

function writeSaved() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                name: session.name,
                text: session.text,
                wpm: session.wpm,
                fontScale: session.fontScale,
                readingLine: session.readingLine,
            })
        );
    } catch (e) {
        // ignore quota/storage errors; the script still plays this session
    }
}

function applyText(name, text) {
    session.name = name;
    session.text = text;
    session.parsed = text.trim() ? loadScript(text, { wpm: session.wpm }) : null;
    session.flat = session.parsed ? flatTimeline(session.parsed) : [];
    session.time = 0;
    session.playing = false;
}

readSaved();
if (session.text) applyText(session.name, session.text);

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// AI follow-along: settings live in the app's storage (keys in credentials),
// the last result lives here so it survives remounts like `session`.
const SYNC_MS = 10000;
const sync = {
    loaded: false,
    enabled: false,
    provider: 'claude',
    anthropicApiKey: '',
    deepseekApiKey: '',
    deepseekModel: 'deepseek-v4-flash-vision-exp',
    inFlight: false,
    status: '',
    error: false,
};

async function loadSyncSettings() {
    const storage = window.cheatingDaddy && window.cheatingDaddy.storage;
    if (!storage) return;
    const [prefs, creds] = await Promise.all([storage.getPreferences(), storage.getCredentials()]);
    sync.enabled = prefs.scriptSyncEnabled === true;
    sync.provider = prefs.scriptSyncProvider === 'deepseek' ? 'deepseek' : 'claude';
    sync.deepseekModel = prefs.deepseekVisionModel || sync.deepseekModel;
    sync.anthropicApiKey = creds.anthropicApiKey || '';
    sync.deepseekApiKey = creds.deepseekApiKey || '';
    sync.loaded = true;
}

const syncKeyField = () => (sync.provider === 'deepseek' ? 'deepseekApiKey' : 'anthropicApiKey');

/** Script text with its `backticked` file names shown as code. */
const rich = text =>
    String(text)
        .split('`')
        .map((part, i) => (i % 2 ? html`<code>${part}</code>` : part));

/** Narration in one pair of quotes, whether or not the script already quoted it. */
const quoted = text => rich(`“${String(text).replace(/^["“”]+|["“”]+$/g, '')}”`);

export class ScriptView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 0;
            }

            /* ── Loader ── */

            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: var(--bg-elevated);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 6px 12px;
                font-size: var(--font-size-sm);
                cursor: pointer;
                white-space: nowrap;
                transition:
                    border-color var(--transition),
                    background var(--transition);
            }

            .btn:hover:not(:disabled) {
                border-color: var(--border-strong);
                background: var(--bg-hover);
            }

            .btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .btn.primary {
                background: var(--accent);
                border-color: var(--accent);
                color: #fff;
            }

            .btn.primary:hover:not(:disabled) {
                background: var(--accent-hover);
                border-color: var(--accent-hover);
            }

            .row {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                flex-wrap: wrap;
            }

            .drop-zone {
                border: 1px dashed var(--border-strong);
                border-radius: var(--radius-md);
                padding: var(--space-lg);
                text-align: center;
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
                line-height: 1.5;
                transition:
                    border-color var(--transition),
                    background var(--transition);
            }

            .drop-zone.dragging {
                border-color: var(--accent);
                background: rgba(59, 130, 246, 0.06);
            }

            .drop-zone code,
            .surface code,
            .player code {
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                color: var(--text-primary);
            }

            textarea.control {
                min-height: 140px;
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                user-select: text;
                cursor: text;
            }

            input[type='file'] {
                display: none;
            }

            input.control.narrow {
                width: 90px;
            }

            .stats {
                display: flex;
                gap: var(--space-sm);
                flex-wrap: wrap;
                margin-bottom: var(--space-md);
            }

            .warning {
                color: var(--warning);
                font-size: var(--font-size-xs);
                line-height: 1.4;
                margin-bottom: var(--space-sm);
            }

            .outline {
                list-style: none;
                display: flex;
                flex-direction: column;
                gap: 2px;
                margin-bottom: var(--space-md);
            }

            .outline li {
                display: flex;
                gap: var(--space-sm);
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                padding: 4px 0;
                border-bottom: 1px solid var(--border);
            }

            .outline .at {
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                min-width: 48px;
                padding-top: 2px;
            }

            /* ── Player (heads-up teleprompter) ── */

            .player {
                position: relative;
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
                background: var(--bg-app);
            }

            .transport {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
                padding: var(--space-sm) var(--space-md) 0;
            }

            .transport .btn {
                padding: 4px 10px;
                font-size: var(--font-size-xs);
            }

            .clock {
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                color: var(--text-primary);
                margin: 0 var(--space-xs);
            }

            .clock .total {
                color: var(--text-muted);
            }

            .clock-pill {
                position: absolute;
                top: var(--space-sm);
                right: var(--space-md);
                z-index: 2;
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                cursor: pointer;
            }

            .spacer {
                flex: 1;
            }

            select.mini {
                width: auto;
                padding: 3px 24px 3px 8px;
                font-size: var(--font-size-xs);
            }

            .seek {
                margin: 6px var(--space-md) 0;
                height: 4px;
                accent-color: var(--accent);
                cursor: pointer;
            }

            .prompter {
                position: relative;
                flex: 1;
                min-height: 0;
                overflow: hidden;
                /* The fades follow the reading line so the line being read is never faded. */
                -webkit-mask-image: linear-gradient(
                    to bottom,
                    transparent 0,
                    #000 calc(var(--reading-line) * 0.6),
                    #000 max(72%, calc(var(--reading-line) + 15%)),
                    transparent 100%
                );
                mask-image: linear-gradient(
                    to bottom,
                    transparent 0,
                    #000 calc(var(--reading-line) * 0.6),
                    #000 max(72%, calc(var(--reading-line) + 15%)),
                    transparent 100%
                );
            }

            /* A 14px grab strip centred on the line; drag it to move where you read. */
            .reading-line {
                position: absolute;
                left: 0;
                right: 0;
                top: var(--reading-line);
                height: 14px;
                transform: translateY(-50%);
                cursor: ns-resize;
                touch-action: none;
            }

            .reading-line::after {
                content: '';
                position: absolute;
                left: 0;
                right: 0;
                top: 50%;
                border-top: 1px dashed rgba(59, 130, 246, 0.35);
                transition: border-color var(--transition);
            }

            .reading-line:hover::after,
            .reading-line.dragging::after {
                border-top: 1px solid var(--accent);
            }

            .reading-line::before {
                content: '';
                position: absolute;
                left: 6px;
                top: 50%;
                transform: translateY(-50%);
                border: 6px solid transparent;
                border-left: 8px solid var(--accent);
            }

            .scroll {
                position: relative;
                height: 100%;
                overflow: hidden;
            }

            .script-text {
                list-style: none;
                padding: 95vh var(--space-xl) 95vh;
            }

            .line {
                padding: calc(10px * var(--script-scale, 1)) 0;
                font-size: calc(26px * var(--script-scale, 1));
                line-height: 1.4;
                font-weight: var(--font-weight-medium);
                color: var(--text-secondary);
                opacity: 0.55;
                cursor: pointer;
                transition:
                    opacity 300ms ease,
                    color 300ms ease;
            }

            .line.past {
                opacity: 0.25;
            }

            .line.current {
                opacity: 1;
                color: var(--text-primary);
            }

            .line .scene-label {
                display: block;
                margin-bottom: 6px;
                font-size: var(--font-size-xs);
                font-weight: var(--font-weight-semibold);
                color: var(--accent);
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }

            .line .narration {
                margin-top: 4px;
                font-size: 0.85em;
                color: #93c5fd;
                font-style: italic;
            }

            .line code {
                font-size: 0.8em;
            }

            .empty {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: var(--space-md);
                color: var(--text-muted);
                font-size: var(--font-size-sm);
            }

            .sync-status {
                padding: 4px var(--space-md) 6px;
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .sync-status.error {
                color: var(--warning);
            }

            .toggle {
                display: inline-flex;
                align-items: center;
                gap: var(--space-sm);
                font-size: var(--font-size-sm);
                color: var(--text-primary);
                cursor: pointer;
            }

            .toggle input {
                accent-color: var(--accent);
                cursor: pointer;
            }

            input.control.wide {
                width: 320px;
                user-select: text;
                cursor: text;
            }

            .hint {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
            }
        `,
    ];

    static properties = {
        presenting: { type: Boolean },
        onPresent: { type: Function },
        onExit: { type: Function },
        _dragging: { state: true },
        _draft: { state: true },
        _tick: { state: true },
    };

    constructor() {
        super();
        this.presenting = false;
        this.onPresent = () => {};
        this.onExit = () => {};
        this._dragging = false;
        this._draft = '';
        this._tick = 0;
        this._interval = null;
        this._raf = 0;
        this._syncTimer = null;
        // Shortcuts only drive the on-screen player, never the loader.
        this._onKeydown = e => this.presenting && this._handleKeydown(e);
        this._onPrevBeat = () => this.presenting && this.stepBeat(-1);
        this._onNextBeat = () => this.presenting && this.stepBeat(1);
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('keydown', this._onKeydown);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('navigate-previous-response', this._onPrevBeat);
            ipcRenderer.on('navigate-next-response', this._onNextBeat);
        }
        if (this.presenting) {
            if (session.playing) this._startTicker();
            this._startScroller();
        }
        if (!sync.loaded)
            loadSyncSettings().then(
                () => this._refresh(),
                e => console.error('Could not load follow-along settings:', e)
            );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('keydown', this._onKeydown);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('navigate-previous-response', this._onPrevBeat);
            ipcRenderer.removeListener('navigate-next-response', this._onNextBeat);
        }
        this._stopTicker();
        this._stopScroller();
        this._stopSync();
        // Leaving the on-screen player always pauses; the position is kept.
        if (this.presenting) session.playing = false;
    }

    // ── Loading ──

    _load(name, text) {
        applyText(name, text);
        writeSaved();
        this._draft = '';
        this._refresh();
    }

    async _loadFile(file) {
        if (!file) return;
        try {
            const text = await file.text();
            this._load(file.name, text);
        } catch (e) {
            console.error('Could not read script file:', e);
        }
    }

    _handleDrop(e) {
        e.preventDefault();
        this._dragging = false;
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) this._loadFile(file);
    }

    _handleWpmChange(e) {
        const wpm = Number(e.target.value);
        if (!(wpm > 0)) return;
        session.wpm = wpm;
        writeSaved();
        // Only plain scripts are timed by reading speed; a play-by-play keeps its own clock.
        if (session.parsed && session.parsed.mode === 'plain') applyText(session.name, session.text);
        this._refresh();
    }

    _clear() {
        applyText('', '');
        writeSaved();
        this._refresh();
    }

    // ── AI follow-along ──

    async _saveSyncSetting(key, value) {
        const storage = window.cheatingDaddy && window.cheatingDaddy.storage;
        if (key === 'anthropicApiKey' || key === 'deepseekApiKey') {
            sync[key] = value.trim();
            if (storage) await storage.setCredentials({ [key]: sync[key] });
        } else {
            const field = { scriptSyncEnabled: 'enabled', scriptSyncProvider: 'provider', deepseekVisionModel: 'deepseekModel' }[key];
            sync[field] = value;
            if (storage) await storage.updatePreference(key, value);
        }
        sync.status = '';
        this._refresh();
    }

    _startSync() {
        this._stopSync();
        if (!this.presenting || !sync.enabled) return;
        this._syncTimer = setInterval(() => this.syncNow(), SYNC_MS);
    }

    _stopSync() {
        if (this._syncTimer) {
            clearInterval(this._syncTimer);
            this._syncTimer = null;
        }
    }

    /** Screenshot -> AI -> jump to the beat it picks. One request at a time. */
    async syncNow() {
        if (sync.inFlight || !session.flat.length || !window.require) return;
        const parsed = session.parsed;
        const timed = parsed.mode === 'timed';
        const beats = session.flat.map(entry => {
            const scene = parsed.scenes[entry.sceneN - 1];
            return {
                at: formatClock(entry.atSeconds),
                scene: scene ? (timed ? `Scene ${scene.n} — ${scene.app}` : scene.app) : '',
                action: entry.action,
                narration: entry.narration,
            };
        });
        sync.inFlight = true;
        sync.status = 'Checking your screen…';
        sync.error = false;
        this._refresh();
        try {
            const { ipcRenderer } = window.require('electron');
            const result = await ipcRenderer.invoke('script-sync:locate', { beats, currentIndex: this._currentFlatIndex() });
            if (!result.success) throw new Error(result.error);
            const { beat, confidence, reason } = result.data;
            if (confidence === 'low') {
                sync.status = `Not sure where you are — staying put (${reason})`;
            } else {
                if (beat !== this._currentFlatIndex()) this.seekTo(session.flat[beat].atSeconds);
                sync.status = `On beat ${beat + 1} of ${session.flat.length} · ${reason}`;
            }
        } catch (error) {
            sync.status = error.message;
            sync.error = true;
        } finally {
            sync.inFlight = false;
            this._refresh();
        }
    }

    // ── Playback ──

    get _total() {
        return session.parsed ? session.parsed.totalSeconds : 0;
    }

    _refresh() {
        this._tick++;
    }

    _startTicker() {
        this._stopTicker();
        session.lastStamp = Date.now();
        this._interval = setInterval(() => {
            const now = Date.now();
            session.time = Math.min(this._total, session.time + ((now - session.lastStamp) / 1000) * session.speed);
            session.lastStamp = now;
            if (session.time >= this._total) this.pause();
            this._refresh();
        }, TICK_MS);
    }

    _stopTicker() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    play() {
        if (!this._total) return;
        if (session.time >= this._total) session.time = 0;
        session.playing = true;
        this._startTicker();
        this._startSync();
        this._refresh();
    }

    pause() {
        session.playing = false;
        this._stopTicker();
        this._stopSync();
        this._refresh();
    }

    togglePlay() {
        if (session.playing) this.pause();
        else this.play();
    }

    seekTo(seconds) {
        session.time = clamp(Number(seconds) || 0, 0, this._total);
        session.lastStamp = Date.now();
        this._refresh();
    }

    /** Jump to the previous/next beat on the flat timeline. */
    stepBeat(direction) {
        const flat = session.flat;
        if (!flat.length) return;
        const idx = this._currentFlatIndex();
        if (direction > 0) {
            const next = flat[idx + 1];
            if (next) this.seekTo(next.atSeconds);
        } else {
            // Like a media player: first go back to the start of the current beat.
            const cur = flat[idx];
            if (cur && session.time - cur.atSeconds > 1.5) this.seekTo(cur.atSeconds);
            else this.seekTo(idx > 0 ? flat[idx - 1].atSeconds : 0);
        }
    }

    _setSpeed(value) {
        session.speed = Number(value) || 1;
        this._refresh();
    }

    _scaleFont(direction) {
        const i = FONT_SCALES.indexOf(session.fontScale);
        session.fontScale = FONT_SCALES[clamp(i + direction, 0, FONT_SCALES.length - 1)];
        writeSaved();
        this._refresh();
    }

    _handleKeydown(e) {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === ' ') {
            e.preventDefault();
            this.togglePlay();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (e.shiftKey) this.seekTo(session.time + 10);
            else this.stepBeat(1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (e.shiftKey) this.seekTo(session.time - 10);
            else this.stepBeat(-1);
        } else if (e.key === 'Home') {
            e.preventDefault();
            this.seekTo(0);
        } else if (e.key === '+' || e.key === '=') {
            this._scaleFont(1);
        } else if (e.key === '-') {
            this._scaleFont(-1);
        } else if ((e.key === 's' || e.key === 'S') && sync.enabled) {
            this.syncNow();
        } else if (e.key === 'h' || e.key === 'H') {
            this._toggleControls();
        }
    }

    // ── Position ──

    /** The last scene whose start the clock has reached. */
    _currentScene() {
        const scenes = session.parsed ? session.parsed.scenes : [];
        let cur = null;
        for (const sc of scenes) {
            if (session.time >= sc.startSeconds) cur = sc;
            else break;
        }
        return cur || scenes[0] || null;
    }

    /** Index into the flat timeline of the last beat the clock has passed, or -1. */
    _currentFlatIndex() {
        let idx = -1;
        for (let i = 0; i < session.flat.length; i++) {
            if (session.time >= session.flat[i].atSeconds) idx = i;
            else break;
        }
        return idx;
    }

    // ── Scrolling ──

    /** The clock between ticks, so the scroll moves every frame rather than every tick. */
    _liveTime() {
        if (!session.playing) return session.time;
        return Math.min(this._total, session.time + ((Date.now() - session.lastStamp) / 1000) * session.speed);
    }

    /** The scroll offset of every beat line, paired with the time it starts. */
    _anchors() {
        const lines = this.shadowRoot.querySelectorAll('.line');
        return Array.from(lines, (el, i) => ({ y: el.offsetTop, t: session.flat[i] ? session.flat[i].atSeconds : 0 }));
    }

    /** Time -> scroll offset: a beat glides up past the reading line while it runs, reaching it as the next beat starts. */
    _yAt(time, anchors) {
        if (!anchors.length) return 0;
        if (time <= anchors[0].t) return anchors[0].y;
        for (let i = 0; i < anchors.length - 1; i++) {
            const a = anchors[i];
            const b = anchors[i + 1];
            if (time < b.t) return b.t > a.t ? a.y + ((time - a.t) / (b.t - a.t)) * (b.y - a.y) : a.y;
        }
        return anchors[anchors.length - 1].y;
    }

    /** Scroll offset -> time, the inverse of `_yAt`, so a wheel scroll scrubs the clock. */
    _timeAt(y, anchors) {
        if (!anchors.length) return 0;
        if (y <= anchors[0].y) return anchors[0].t;
        for (let i = 0; i < anchors.length - 1; i++) {
            const a = anchors[i];
            const b = anchors[i + 1];
            if (y < b.y) return a.t + ((y - a.y) / (b.y - a.y)) * (b.t - a.t);
        }
        return anchors[anchors.length - 1].t;
    }

    _readingLine(scroll) {
        return scroll.clientHeight * session.readingLine;
    }

    // ── Moving the reading line ──

    _startLineDrag(e) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        this._lineDragging = true;
        this._refresh();
    }

    _dragLine(e) {
        if (!this._lineDragging) return;
        const rect = this.shadowRoot.querySelector('.prompter').getBoundingClientRect();
        session.readingLine = clamp((e.clientY - rect.top) / rect.height, MIN_READING_LINE, MAX_READING_LINE);
        this._refresh();
    }

    _endLineDrag() {
        if (!this._lineDragging) return;
        this._lineDragging = false;
        writeSaved();
        this._refresh();
    }

    _resetLine() {
        session.readingLine = DEFAULT_READING_LINE;
        writeSaved();
        this._refresh();
    }

    _startScroller() {
        this._stopScroller();
        const frame = () => {
            const scroll = this.shadowRoot && this.shadowRoot.querySelector('.scroll');
            if (scroll) {
                const top = this._yAt(this._liveTime(), this._anchors()) - this._readingLine(scroll);
                if (Math.abs(scroll.scrollTop - top) > 0.5) scroll.scrollTop = top;
            }
            this._raf = requestAnimationFrame(frame);
        };
        this._raf = requestAnimationFrame(frame);
    }

    _stopScroller() {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = 0;
    }

    _handleWheel(e) {
        e.preventDefault();
        const anchors = this._anchors();
        const current = this._yAt(this._liveTime(), anchors);
        this.seekTo(this._timeAt(current + e.deltaY, anchors));
    }

    _toggleControls() {
        session.controlsHidden = !session.controlsHidden;
        this._refresh();
    }

    // ── Render ──

    render() {
        return this.presenting ? this.renderPlayer() : this.renderLoader();
    }

    renderLoader() {
        const parsed = session.parsed;
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">Script</div>
                        <div class="page-subtitle">
                            Load a script and play it on screen beside your work. The window stays on top and is hidden from screen capture, so it
                            works as a private teleprompter while you record.
                        </div>
                    </div>

                    <section class="surface">
                        <div class="surface-title">Load a script</div>
                        <div class="surface-subtitle">
                            A tasksbaby <code>play_by_play_*.md</code> plays on its own clock (scenes, beats and narration). Any other text plays one
                            paragraph at a time, timed by reading speed.
                        </div>
                        <div class="form-grid">
                            <div
                                class="drop-zone ${this._dragging ? 'dragging' : ''}"
                                @dragover=${e => {
                                    e.preventDefault();
                                    this._dragging = true;
                                }}
                                @dragleave=${() => (this._dragging = false)}
                                @drop=${e => this._handleDrop(e)}
                            >
                                Drop a <code>.md</code> or <code>.txt</code> script here
                                <div class="row" style="justify-content:center;margin-top:var(--space-sm)">
                                    <button class="btn" @click=${() => this.shadowRoot.querySelector('#script-file').click()}>Choose file…</button>
                                </div>
                                <input
                                    id="script-file"
                                    type="file"
                                    accept=".md,.markdown,.txt,text/markdown,text/plain"
                                    @change=${e => {
                                        this._loadFile(e.target.files[0]);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                            <textarea
                                class="control"
                                placeholder="…or paste a script here"
                                .value=${this._draft}
                                @input=${e => (this._draft = e.target.value)}
                            ></textarea>
                            <div class="row">
                                <button class="btn" ?disabled=${!this._draft.trim()} @click=${() => this._load('Pasted script', this._draft)}>
                                    Use pasted text
                                </button>
                                <span class="spacer"></span>
                                <label class="form-label" for="wpm">Reading speed (plain text)</label>
                                <input
                                    id="wpm"
                                    class="control narrow"
                                    type="number"
                                    min="60"
                                    max="400"
                                    step="10"
                                    .value=${String(session.wpm)}
                                    @change=${e => this._handleWpmChange(e)}
                                />
                                <span class="form-help">wpm</span>
                            </div>
                        </div>
                    </section>

                    ${parsed ? this.renderLoaded(parsed) : ''} ${this.renderSyncSettings()}
                </div>
            </div>
        `;
    }

    renderSyncSettings() {
        const deepseek = sync.provider === 'deepseek';
        return html`
            <section class="surface">
                <div class="surface-title">Follow along with AI</div>
                <div class="surface-subtitle">
                    While the script plays, take a screenshot every 10 seconds and ask the AI which beat you're on, then jump the script there. The
                    script overlay itself is hidden from the screenshot. Each check sends one screenshot to the provider and is billed to your API key
                    (about 240 checks for a 40-minute script); nothing is sent while the script is paused.
                </div>
                <div class="form-grid">
                    <label class="toggle">
                        <input
                            type="checkbox"
                            .checked=${sync.enabled}
                            @change=${e => this._saveSyncSetting('scriptSyncEnabled', e.target.checked)}
                        />
                        Follow along with AI while the script plays
                    </label>
                    <div class="form-group">
                        <span class="form-label">Provider</span>
                        <select class="control" @change=${e => this._saveSyncSetting('scriptSyncProvider', e.target.value)}>
                            <option value="claude" ?selected=${!deepseek}>Claude (Anthropic)</option>
                            <option value="deepseek" ?selected=${deepseek}>DeepSeek</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <span class="form-label">${deepseek ? 'DeepSeek' : 'Claude'} API key</span>
                        <input
                            class="control wide"
                            type="password"
                            placeholder=${deepseek ? 'sk-…' : 'sk-ant-…'}
                            .value=${sync[syncKeyField()]}
                            @change=${e => this._saveSyncSetting(syncKeyField(), e.target.value)}
                        />
                    </div>
                    ${deepseek
                        ? html`
                              <div class="form-group">
                                  <span class="form-label">DeepSeek vision model</span>
                                  <input
                                      class="control wide"
                                      type="text"
                                      .value=${sync.deepseekModel}
                                      @change=${e => this._saveSyncSetting('deepseekVisionModel', e.target.value.trim())}
                                  />
                              </div>
                              <div class="form-help">
                                  DeepSeek's vision model is new and experimental; if it is renamed, put the model ID from DeepSeek's API docs here.
                              </div>
                          `
                        : ''}
                </div>
            </section>
        `;
    }

    renderLoaded(parsed) {
        const beats = session.flat.length;
        return html`
            <section class="surface">
                <div class="surface-title">${parsed.title || session.name || 'Script'}</div>
                <div class="surface-subtitle">${session.name}</div>
                <div class="stats">
                    <span class="pill">${parsed.mode === 'timed' ? 'play-by-play' : 'plain text'}</span>
                    <span class="pill">${parsed.scenes.length} scene${parsed.scenes.length === 1 ? '' : 's'}</span>
                    <span class="pill">${beats} beat${beats === 1 ? '' : 's'}</span>
                    <span class="pill">${formatClock(parsed.totalSeconds)} total</span>
                </div>
                ${parsed.warnings.map(w => html`<div class="warning">⚠ ${w}</div>`)}
                <ol class="outline">
                    ${parsed.scenes.map(
                        sc => html`
                            <li>
                                <span class="at">${formatClock(sc.startSeconds)}</span>
                                <span
                                    >${parsed.mode === 'timed' ? `Scene ${sc.n} — ` : ''}${sc.app || DASH}${sc.contribution
                                        ? `: ${sc.contribution}`
                                        : ''}</span
                                >
                            </li>
                        `
                    )}
                </ol>
                <div class="row">
                    <button class="btn primary" ?disabled=${!this._total} @click=${() => this.onPresent()}>Show on screen</button>
                    <button class="btn" @click=${() => this._clear()}>Clear</button>
                    <span class="hint"
                        >In the player: Space play/pause · ←/→ beat · Shift+←/→ 10s · scroll wheel to scrub · +/− text size · H hide controls · S
                        check screen now · drag the blue arrow to move the reading line</span
                    >
                </div>
            </section>
        `;
    }

    renderPlayer() {
        const parsed = session.parsed;
        if (!parsed || !this._total) {
            return html`
                <div class="empty">
                    No script to play.
                    <button class="btn" @click=${() => this.onExit()}>Load a script</button>
                </div>
            `;
        }

        const t = session.time;
        const total = this._total;
        const sc = this._currentScene();
        const idx = this._currentFlatIndex();
        const timed = parsed.mode === 'timed';
        const sceneLabel = n => {
            const scene = parsed.scenes[n - 1];
            if (!scene) return '';
            return timed ? `Scene ${scene.n} — ${scene.app || DASH}` : scene.app;
        };

        let lastScene = null;
        return html`
            <div class="player" style="--script-scale:${session.fontScale};--reading-line:${session.readingLine * 100}%">
                ${session.controlsHidden
                    ? html`
                          <span class="clock-pill" title="Show controls (H)" @click=${() => this._toggleControls()}>
                              ${formatClock(t)} / ${formatClock(total)}
                          </span>
                      `
                    : html`
                          <div class="transport">
                              <button class="btn primary" @click=${() => this.togglePlay()}>${session.playing ? 'Pause' : 'Play'}</button>
                              <button class="btn" title="Previous beat (←)" @click=${() => this.stepBeat(-1)}>◀</button>
                              <button class="btn" title="Next beat (→)" @click=${() => this.stepBeat(1)}>▶</button>
                              <button class="btn" title="Back to scene start" @click=${() => this.seekTo(sc ? sc.startSeconds : 0)}>
                                  Scene start
                              </button>
                              <span class="clock">${formatClock(t)} <span class="total">/ ${formatClock(total)}</span></span>
                              <span class="spacer"></span>
                              <select class="control mini" title="Scroll speed" @change=${e => this._setSpeed(e.target.value)}>
                                  ${SPEEDS.map(s => html`<option value=${s} ?selected=${s === session.speed}>${s}×</option>`)}
                              </select>
                              <button class="btn" title="Smaller text (−)" @click=${() => this._scaleFont(-1)}>A−</button>
                              <button class="btn" title="Larger text (+)" @click=${() => this._scaleFont(1)}>A+</button>
                              ${sync.enabled
                                  ? html`<button
                                        class="btn"
                                        title="Check my screen now (S)"
                                        ?disabled=${sync.inFlight}
                                        @click=${() => this.syncNow()}
                                    >
                                        ${sync.inFlight ? 'Checking…' : 'Sync'}
                                    </button>`
                                  : ''}
                              <button class="btn" title="Hide controls (H)" @click=${() => this._toggleControls()}>Hide</button>
                          </div>
                          <input
                              class="seek"
                              type="range"
                              min="0"
                              max=${total}
                              step="1"
                              .value=${String(Math.floor(t))}
                              @input=${e => this.seekTo(e.target.value)}
                              aria-label="Seek within the script"
                          />
                      `}

                <div class="prompter" @wheel=${e => this._handleWheel(e)}>
                    <div class="scroll">
                        <ol class="script-text">
                            ${session.flat.map((entry, i) => {
                                const label = entry.sceneN !== lastScene && parsed.scenes.length > 1 ? sceneLabel(entry.sceneN) : '';
                                lastScene = entry.sceneN;
                                return html`
                                    <li class="line ${i === idx ? 'current' : i < idx ? 'past' : ''}" @click=${() => this.seekTo(entry.atSeconds)}>
                                        ${label ? html`<span class="scene-label">${label}</span>` : ''} ${rich(entry.action || DASH)}
                                        ${entry.narration ? html`<div class="narration">${quoted(entry.narration)}</div>` : ''}
                                    </li>
                                `;
                            })}
                        </ol>
                    </div>
                    <div
                        class="reading-line ${this._lineDragging ? 'dragging' : ''}"
                        title="Drag to move the reading line · double-click to reset"
                        @pointerdown=${e => this._startLineDrag(e)}
                        @pointermove=${e => this._dragLine(e)}
                        @pointerup=${() => this._endLineDrag()}
                        @pointercancel=${() => this._endLineDrag()}
                        @dblclick=${() => this._resetLine()}
                    ></div>
                </div>
                ${sync.enabled && sync.status ? html`<div class="sync-status ${sync.error ? 'error' : ''}">AI · ${sync.status}</div>` : ''}
            </div>
        `;
    }
}

customElements.define('script-view', ScriptView);

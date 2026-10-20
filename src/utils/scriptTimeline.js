/**
 * scriptTimeline.js — the parser behind the Script view.
 *
 * Ported from the tasksbaby rehearsal player (`viewer/timeline.mjs`) so the two
 * apps read a `play_by_play_*.md` script the same way. Kept pure (no imports, no
 * DOM, no clock) so Node can unit-test it and the renderer can import it as-is.
 *
 * On top of the original parser this adds `parsePlainScript` / `loadScript`: a
 * script without `### Scene N` headings (a talk track, an interview answer, any
 * plain text) still plays, one beat per paragraph, timed by reading speed.
 */

// ------------------------------------------------------------------- clock
// The script's own shape is `H:MM` (variable-width hours, always two-digit
// minutes): `0:28`, `2:00`, `10:58`, `40:00`. `M:SS` is the same shape for the
// first hour, so one function round-trips every time token in the archive.

const CLOCK = /^(\d+):([0-5]\d)$/;

/** `"10:58"` -> `658`; anything that is not `H:MM` -> `null`. */
export function parseClock(value) {
    const m = String(value).match(CLOCK);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

/** `658` -> `"10:58"`. Clamps negatives/NaN to `0:00`; floors fractional seconds. */
export function formatClock(totalSeconds) {
    const n = Number(totalSeconds);
    const s = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// ------------------------------------------------------------ text helpers
const lineAt = (lines, i) => lines[i];
const anyHeading = /^#{1,6}\s/;

/** The scene body: the lines after its heading, up to the next `#`-heading. */
function bodyOf(lines, i) {
    let j = i + 1;
    while (j < lines.length && !anyHeading.test(lines[j])) j++;
    return lines.slice(i + 1, j);
}

/** `| a | b | c |` -> `['a','b','c']` (leading/trailing pipe dropped). */
function cellsOf(line) {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());
}

const isBeatRow = cells => cells.length >= 3 && CLOCK.test(cells[0]);

/**
 * splitHeading(headLine) -> { duration, rangeStart, rangeEnd, labelLine }
 *
 * `duration` is the raw duration token: `'2:00'` for a single duration, or the
 * `'<start>–<end>'` range for a range heading. `rangeStart` / `rangeEnd` are the
 * two clocks of a RANGE heading (or `null` for a single duration).
 *
 * `labelLine` is the heading with the `### ` marker and the `Scene N — ` prefix
 * stripped UNCONDITIONALLY — not only when a duration matched — and the duration
 * group removed, so a heading a duration pattern misses never keeps its prefix.
 * The duration is the LAST matching group, so an inner parenthesis in the label
 * (`Wrap + Dispatch (draft-only) (3:00)`) survives.
 */
function splitHeading(headLine) {
    const rest = String(headLine)
        .trim()
        .replace(/^#{1,6}\s+/, '')
        .replace(/^Scene\s+\d+\s*[—–-]\s*/, '')
        .trim();

    const range = [...rest.matchAll(/\((\d+:\d\d)\s*[–—-]\s*(\d+:\d\d)\)/g)];
    if (range.length) {
        const last = range[range.length - 1];
        const labelLine = (rest.slice(0, last.index) + rest.slice(last.index + last[0].length)).replace(/\s+/g, ' ').trim();
        return { duration: `${last[1]}–${last[2]}`, rangeStart: last[1], rangeEnd: last[2], labelLine };
    }

    const single = [...rest.matchAll(/\((\d+:\d\d)\)/g)];
    if (!single.length) return { duration: '', rangeStart: null, rangeEnd: null, labelLine: rest };
    const last = single[single.length - 1];
    const labelLine = (rest.slice(0, last.index) + rest.slice(last.index + last[0].length)).replace(/\s+/g, ' ').trim();
    return { duration: last[1], rangeStart: null, rangeEnd: null, labelLine };
}

/**
 * `Scene 2 — Docker: run …` -> `{ app: 'Docker', contribution: 'run …' }`.
 *
 * Three dialects, kept distinct so the archive parses exactly as before:
 *   - `App: <name> — <contribution>`: strip the `App: ` marker, then split the
 *     remainder on the em dash, so `App: Postman — test the endpoints` becomes
 *     `Postman` / `test the endpoints` (never app `'App'`).
 *   - `<App>: <contribution>`: split on the first `: `.
 *   - no colon (`Wrap + Dispatch (draft-only)`): the whole remainder is the app.
 */
function splitApp(labelLine) {
    const rest = ((labelLine.match(/^Scene\s+\d+\s*[—–-]\s*(.*)$/) || [, ''])[1] || labelLine).trim();
    if (/^App:\s+/.test(rest)) {
        const body = rest.replace(/^App:\s+/, '').trim();
        const dash = body.indexOf('—');
        if (dash >= 0) return { app: body.slice(0, dash).trim(), contribution: body.slice(dash + 1).trim() };
        return { app: body, contribution: '' };
    }
    const at = rest.indexOf(': ');
    if (at < 0) return { app: rest, contribution: '' };
    return { app: rest.slice(0, at).trim(), contribution: rest.slice(at + 2).trim() };
}

const A_NARRATION_DASH = /^[—–-]$/;

// ------------------------------------------------------------------ parse
/**
 * parseScript(text) -> { title, baseSlug, scenes, totalSeconds, warnings }
 *
 *   scene = { n, app, contribution, duration, seconds, startSeconds,
 *             checkpoint, evidence, beats }
 *   beat  = { at, atSeconds, action, narration }
 *
 * `at` is the script's own clock string; `atSeconds` is absolute seconds from the
 * recording start. `narration` is `''` when the script wrote a bare `—`.
 */
export function parseScript(text) {
    const src = String(text == null ? '' : text);
    const lines = src.split('\n');
    const warnings = [];

    const title = (src.match(/^\*\*Title:\*\*\s*(.+?)\s*$/m) || [, ''])[1] || '';
    const baseSlug = (src.match(/\*\*Base slug:\*\*\s*`([^`]+)`/) || [, ''])[1] || '';

    // --- scenes ---------------------------------------------------------------
    const scenes = [];
    const explicitStarts = []; // range start per scene, or null for a cumulative scene
    let cursor = 0;
    for (let i = 0; i < lines.length; i++) {
        const hm = lineAt(lines, i).match(/^###\s+Scene\s+(\d+)\b/);
        if (!hm) continue;
        const n = Number(hm[1]);
        const head = splitHeading(lines[i]);
        const { app, contribution } = splitApp(head.labelLine);
        const explicitStart = head.rangeStart == null ? null : parseClock(head.rangeStart);
        let seconds;
        if (head.rangeStart != null) {
            const s = parseClock(head.rangeStart);
            const e = parseClock(head.rangeEnd);
            seconds = s != null && e != null && e >= s ? e - s : null;
        } else {
            seconds = parseClock(head.duration);
        }
        if (seconds == null) warnings.push(`scene ${n} has no (H:MM) duration — its beats cannot be placed`);

        const body = bodyOf(lines, i).join('\n');
        const checkpoint = (body.match(/\*\*Checkpoint[^:]*:\*\*\s*([^\n]*)/) || [, ''])[1].trim();
        const evidence = (body.match(/\*\*Hard evidence produced:\*\*\s*([^\n]*)/) || [, ''])[1].trim();

        const beats = [];
        for (const line of bodyOf(lines, i)) {
            const t = line.trim();
            if (!t.startsWith('|')) continue;
            const cells = cellsOf(t);
            if (!isBeatRow(cells)) continue;
            const at = cells[0];
            const atSeconds = parseClock(at);
            if (atSeconds == null) continue; // CLOCK already guaranteed it; belt and braces
            const action = cells[1] || '';
            const rawNarration = cells[2] || '';
            const narration = A_NARRATION_DASH.test(rawNarration) ? '' : rawNarration;
            beats.push({ at, atSeconds, action, narration });
        }

        scenes.push({
            n,
            app,
            contribution,
            duration: head.duration,
            seconds: seconds == null ? 0 : seconds,
            startSeconds: 0, // filled below (cumulative, or the range's explicit start)
            checkpoint,
            evidence,
            beats,
        });
        explicitStarts.push(explicitStart);
        cursor = i;
    }
    void cursor;

    // Starts: a ranged scene uses its authored absolute start; a single-duration
    // scene opens where the previous scene ended. The two never fight.
    let start = 0;
    for (let k = 0; k < scenes.length; k++) {
        const sc = scenes[k];
        if (explicitStarts[k] != null) {
            sc.startSeconds = explicitStarts[k];
            start = sc.startSeconds + sc.seconds;
        } else {
            sc.startSeconds = start;
            start += sc.seconds;
        }
    }
    const summedSeconds = start;

    // --- total (the budget table is the authority) ---------------------------
    let budgetTotal = null;
    const budIdx = lines.findIndex(l => /^##\s+Total runtime budget/.test(l));
    if (budIdx >= 0) {
        for (let j = budIdx + 1; j < lines.length; j++) {
            if (anyHeading.test(lines[j])) break;
            if (!/\bTotal\b/i.test(lines[j])) continue;
            const clocks = [...lines[j].matchAll(/(\d+:\d\d)/g)];
            if (clocks.length) {
                budgetTotal = parseClock(clocks[clocks.length - 1][1]);
                break;
            }
        }
    }
    if (budgetTotal == null) {
        budgetTotal = summedSeconds;
        // A ranged last scene carries an authored end, so its total is not a guess;
        // only a single-duration script falls back to a summed estimate worth noting.
        const lastRanged = explicitStarts.length > 0 && explicitStarts[explicitStarts.length - 1] != null;
        if (scenes.length && !lastRanged) {
            warnings.push('no "## Total runtime budget" total found — using the summed scene durations');
        }
    } else if (summedSeconds !== budgetTotal) {
        warnings.push(`summed scene durations (${formatClock(summedSeconds)}) differ from the budget total (${formatClock(budgetTotal)})`);
    }

    // --- degradation warnings ------------------------------------------------
    if (!scenes.length) warnings.push('no "### Scene N" heading found — nothing to lay out');
    const beatCount = scenes.reduce((a, s) => a + s.beats.length, 0);
    if (scenes.length && beatCount === 0) {
        warnings.push('no beat rows found — degrading to scene-level timing only');
    }

    return { title, baseSlug, scenes, totalSeconds: budgetTotal, warnings };
}

// --------------------------------------------------------------- flat view
/**
 * flatTimeline(parsed) -> every beat in order, on one absolute clock:
 *   { sceneN, beatIndex, atSeconds, endSeconds, action, narration }
 *
 * A beat runs until the next beat in its own scene; a scene's final beat runs to
 * that scene's end (`startSeconds + seconds`). Because every generated scene's
 * last beat already sits exactly on the scene end, a terminal beat can be
 * zero-length — it is a boundary marker, not a padded span. No time is invented.
 */
export function flatTimeline(parsed) {
    const scenes = (parsed && parsed.scenes) || [];
    const out = [];
    for (const sc of scenes) {
        const sceneEnd = sc.startSeconds + sc.seconds;
        for (let i = 0; i < sc.beats.length; i++) {
            const b = sc.beats[i];
            const next = sc.beats[i + 1];
            out.push({
                sceneN: sc.n,
                beatIndex: i,
                atSeconds: b.atSeconds,
                endSeconds: next ? next.atSeconds : sceneEnd,
                action: b.action,
                narration: b.narration,
            });
        }
    }
    return out;
}

// ------------------------------------------------------------ plain scripts
export const DEFAULT_WPM = 150;
const MIN_BEAT_SECONDS = 3;

const wordCount = s => (String(s).match(/\S+/g) || []).length;

/** Drop the markdown a teleprompter should not show: emphasis, code ticks, list bullets. */
function plainLine(line) {
    return line
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();
}

/**
 * parsePlainScript(text, { wpm }) -> the same shape as `parseScript`, plus `mode: 'plain'`.
 *
 * Every paragraph (blank-line separated) is one beat; a markdown heading starts a
 * new scene named after it. A beat opens when the previous one has had time to be
 * read aloud at `wpm` words per minute (never less than 3 seconds), so unlike the
 * play-by-play dialect these times are ESTIMATES — `warnings` says so.
 */
export function parsePlainScript(text, { wpm = DEFAULT_WPM } = {}) {
    const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    const rate = Number(wpm) > 0 ? Number(wpm) : DEFAULT_WPM;
    const scenes = [];
    let title = '';
    let clock = 0;
    let scene = null;
    let paragraph = [];

    const openScene = name => {
        scene = {
            n: scenes.length + 1,
            app: name,
            contribution: '',
            duration: '',
            seconds: 0,
            startSeconds: clock,
            checkpoint: '',
            evidence: '',
            beats: [],
        };
        scenes.push(scene);
    };
    const flush = () => {
        const body = paragraph.map(plainLine).filter(Boolean).join(' ');
        paragraph = [];
        if (!body) return;
        if (!scene) openScene('Script');
        const seconds = Math.max(MIN_BEAT_SECONDS, Math.round((wordCount(body) / rate) * 60));
        scene.beats.push({ at: formatClock(clock), atSeconds: clock, action: body, narration: '' });
        clock += seconds;
        scene.seconds = clock - scene.startSeconds;
    };

    for (const line of src.split('\n')) {
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
            flush();
            const name = plainLine(heading[1]);
            if (!title) title = name;
            openScene(name || 'Script');
        } else if (!line.trim()) {
            flush();
        } else {
            paragraph.push(line);
        }
    }
    flush();

    // A heading with nothing under it is not a scene worth showing.
    const kept = scenes.filter(s => s.beats.length).map((s, i) => ({ ...s, n: i + 1 }));
    const warnings = kept.length
        ? [`no "### Scene N" headings — plain script, beat times estimated at ${rate} words per minute`]
        : ['the script is empty — nothing to lay out'];
    return { title, baseSlug: '', scenes: kept, totalSeconds: clock, warnings, mode: 'plain' };
}

/**
 * loadScript(text, opts) -> a parsed script with `mode`:
 *   'timed' — a play-by-play script (`### Scene N — … (H:MM)` + beat tables), read by its own clock;
 *   'plain' — anything else, via `parsePlainScript`.
 */
export function loadScript(text, opts = {}) {
    const parsed = parseScript(text);
    if (parsed.scenes.length) return { ...parsed, mode: 'timed' };
    return parsePlainScript(text, opts);
}

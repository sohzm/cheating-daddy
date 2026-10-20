import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseClock, formatClock, parseScript, parsePlainScript, loadScript, flatTimeline } from '../src/utils/scriptTimeline.js';

const PLAY_BY_PLAY = `# Play-by-Play Recording Script

**Title:** reconcile two data exports

### Scene 1 — Setup + Provenance (2:00)

| Time | Action | Narration |
|---|---|---|
| 0:30 | Cold open on a clean desktop. | — |
| 2:00 | Show the prepared inputs folder. | "Every file is already on disk." |

**Checkpoint (silent):** inputs untouched

### Scene 2 — Docker: run the service (3:00)

| Time | Action | Narration |
|---|---|---|
| 3:00 | Start the container. | — |
| 5:00 | Export the logs. | "The logs are on disk." |

**Hard evidence produced:** \`logs_r1.txt\`

### Scene 3 — Wrap + Dispatch (draft-only) (5:00–6:00)

| Time | Action | Narration |
|---|---|---|
| 6:00 | Say the close. | — |

## Total runtime budget

| Scene | Engine | Time |
|---|---|---|
| **Total** | | **~6:00** |
`;

test('clock round-trips', () => {
    assert.equal(parseClock('10:58'), 658);
    assert.equal(parseClock('nope'), null);
    assert.equal(formatClock(658), '10:58');
    assert.equal(formatClock(-3), '0:00');
});

test('a play-by-play script plays on its own clock', () => {
    const parsed = loadScript(PLAY_BY_PLAY);
    assert.equal(parsed.mode, 'timed');
    assert.equal(parsed.title, 'reconcile two data exports');
    assert.equal(parsed.totalSeconds, 360);
    assert.deepEqual(parsed.warnings, []);

    const [setup, docker, wrap] = parsed.scenes;
    assert.equal(setup.app, 'Setup + Provenance');
    assert.equal(setup.checkpoint, 'inputs untouched');
    assert.equal(setup.beats[0].narration, '');
    assert.equal(setup.beats[1].narration, '"Every file is already on disk."');
    assert.deepEqual([docker.app, docker.contribution, docker.startSeconds, docker.seconds], ['Docker', 'run the service', 120, 180]);
    assert.equal(docker.evidence, '`logs_r1.txt`');
    assert.deepEqual([wrap.app, wrap.startSeconds, wrap.seconds], ['Wrap + Dispatch (draft-only)', 300, 60]);

    const flat = flatTimeline(parsed);
    assert.equal(flat.length, 5);
    assert.deepEqual(
        flat.map(b => [b.sceneN, b.atSeconds, b.endSeconds]),
        [
            [1, 30, 120],
            [1, 120, 120],
            [2, 180, 300],
            [2, 300, 300],
            [3, 360, 360],
        ]
    );
});

test('plain text plays one paragraph at a time, timed by reading speed', () => {
    const words = n => Array.from({ length: n }, () => 'word').join(' ');
    const text = `# Intro\n\n${words(150)}\nstill the **same** paragraph\n\n- \`short\`\n\n## Close\n\nThanks.\n\n## Empty heading\n`;
    const parsed = loadScript(text, { wpm: 150 });
    assert.equal(parsed.mode, 'plain');
    assert.equal(parsed.title, 'Intro');
    assert.deepEqual(
        parsed.scenes.map(s => s.app),
        ['Intro', 'Close']
    );

    const flat = flatTimeline(parsed);
    assert.equal(flat[0].action.endsWith('still the same paragraph'), true);
    assert.equal(flat[1].action, 'short');
    // 154 words at 150 wpm -> 62s; a one-word beat still gets the 3s floor.
    assert.deepEqual(
        flat.map(b => b.atSeconds),
        [0, 62, 65]
    );
    assert.equal(parsed.totalSeconds, 68);
    assert.match(parsed.warnings[0], /150 words per minute/);
});

test('an empty script lays nothing out and says so', () => {
    const parsed = parsePlainScript('   \n\n');
    assert.equal(parsed.scenes.length, 0);
    assert.equal(parsed.totalSeconds, 0);
    assert.match(parsed.warnings[0], /empty/);
});

test('a scene heading without a duration is not placeable', () => {
    const parsed = parseScript('### Scene 1 — Setup\n\n| 0:10 | Do it. | — |\n');
    assert.equal(parsed.totalSeconds, 0);
    assert.ok(parsed.warnings.some(w => /no \(H:MM\) duration/.test(w)));
});

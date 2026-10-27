const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Returns the color as lowercase '#rrggbb' ('#rgb' is expanded), or null when the value is not a hex color.
// Used for the responseTextColor preference: null means "use the theme's text color".
function normalizeHexColor(value) {
    if (typeof value !== 'string') return null;
    const match = HEX_COLOR_RE.exec(value.trim());
    if (!match) return null;

    let hex = match[1].toLowerCase();
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(ch => ch + ch)
            .join('');
    }
    return `#${hex}`;
}

module.exports = {
    normalizeHexColor,
};

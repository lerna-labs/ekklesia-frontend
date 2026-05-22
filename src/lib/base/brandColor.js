/**
 * Read a `--brand-*` CSS variable at runtime and return a Chart.js / Canvas-
 * compatible color string. Used by chart/canvas code paths that can't consume
 * Tailwind classes — they need a concrete string at draw time.
 *
 * Falls back to the hard-coded shade so SSR / Node environments (and the
 * brief flash before the theme applier runs) don't render `null` strokes.
 *
 * Usage:
 *   ctx.strokeStyle = brandColor('brand');           // --brand     (orange-500 default)
 *   ctx.fillStyle   = brandColor('brand-hover');     // --brand-hover (orange-600 default)
 */

const FALLBACKS = {
	brand: '#F97316',
	'brand-hover': '#EA580C',
	'brand-fg': '#FFFFFF',
	'brand-soft': '#FFF7ED',
	'brand-soft-fg': '#7C2D12'
};

export function brandColor(token = 'brand') {
	if (typeof document === 'undefined') return FALLBACKS[token] || FALLBACKS.brand;
	const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
	if (!raw) return FALLBACKS[token] || FALLBACKS.brand;
	return `hsl(${raw})`;
}

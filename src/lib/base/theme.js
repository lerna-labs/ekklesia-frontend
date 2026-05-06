/**
 * Per-deployment theme applier.
 *
 * Reads the (already-merged) theme object from `$lib/content` and writes
 * the brand-visible CSS custom properties onto `document.documentElement`.
 * Anything the deployment doesn't set falls through to the defaults in
 * `src/app.css`, so partial overrides are fine.
 *
 * Schema of `content/<deployment>/theme.json` — every key optional:
 *
 *   {
 *     "primary":              "<H S% L%>",   // HSL triplet, no commas
 *     "primary-foreground":   "<H S% L%>",
 *     "secondary":            "<H S% L%>",
 *     "secondary-foreground": "<H S% L%>",
 *     "accent":               "<H S% L%>",
 *     "accent-foreground":    "<H S% L%>",
 *     "destructive":          "<H S% L%>",
 *     "destructive-foreground": "<H S% L%>",
 *     "ring":                 "<H S% L%>",
 *     "radius":               "0.5rem",
 *     "font-heading":         "Inter",       // Google Font family name
 *     "font-body":            "Inter"
 *   }
 *
 * Fonts are loaded from Google Fonts at runtime; a single <link> covering
 * both families is appended to <head> the first time the applier runs.
 */

import { content } from '$lib/content.js';

const COLOR_TOKENS = [
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'destructive-foreground',
	'ring'
];

const FONT_WEIGHTS = '400;500;600;700';
const FONT_FALLBACK =
	'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function googleFontsHref(families) {
	const unique = [...new Set(families.filter(Boolean))];
	if (!unique.length) return null;
	const params = unique
		.map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@${FONT_WEIGHTS}`)
		.join('&');
	return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function fontStack(family) {
	return `'${family}', ${FONT_FALLBACK}`;
}

export function applyTheme() {
	if (typeof document === 'undefined') return;
	const theme = content.theme || {};
	const root = document.documentElement;

	for (const token of COLOR_TOKENS) {
		if (theme[token]) root.style.setProperty(`--${token}`, theme[token]);
	}
	if (theme.radius) root.style.setProperty('--radius', theme.radius);

	const heading = theme['font-heading'];
	const body = theme['font-body'];
	if (heading) root.style.setProperty('--font-heading', fontStack(heading));
	if (body) root.style.setProperty('--font-body', fontStack(body));

	const href = googleFontsHref([heading, body]);
	if (href && !document.querySelector('link[data-theme-fonts]')) {
		const preconnect = document.createElement('link');
		preconnect.rel = 'preconnect';
		preconnect.href = 'https://fonts.gstatic.com';
		preconnect.crossOrigin = 'anonymous';
		document.head.appendChild(preconnect);

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		link.dataset.themeFonts = '';
		document.head.appendChild(link);
	}
}

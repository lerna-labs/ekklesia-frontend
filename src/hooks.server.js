/**
 * Substitutes %BRAND_*% placeholders in app.html during `vite dev`.
 * SvelteKit reads app.html at sync time and never pipes it through
 * Vite's transformIndexHtml hook, so the equivalent build-time work
 * lives in `scripts/brand-build-output.js` (production) and here (dev).
 */

import { BRAND } from '$lib/base/branding.js';

function escapeHtmlAttr(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

const url = BRAND.url.replace(/\/$/, '');
const ogImagePath = BRAND.ogImage;
const ogImageAbs = url && ogImagePath.startsWith('/') ? `${url}${ogImagePath}` : ogImagePath;

const urlMeta = url
	? `<meta property="og:url" content="${escapeHtmlAttr(url)}">\n\t<meta property="twitter:url" content="${escapeHtmlAttr(url)}">\n\t<meta property="twitter:domain" content="${escapeHtmlAttr(url.replace(/^https?:\/\//, ''))}">`
	: '';

const twitterMeta = BRAND.twitterHandle
	? `<meta name="twitter:site" content="${escapeHtmlAttr(BRAND.twitterHandle)}">\n\t<meta name="twitter:creator" content="${escapeHtmlAttr(BRAND.twitterHandle)}">`
	: '';

const replacements = {
	'%BRAND_NAME%': escapeHtmlAttr(BRAND.name),
	'%BRAND_TITLE%': escapeHtmlAttr(BRAND.title),
	'%BRAND_DESCRIPTION%': escapeHtmlAttr(BRAND.description),
	'%BRAND_OG_IMAGE%': escapeHtmlAttr(ogImageAbs),
	'%BRAND_URL_META%': urlMeta,
	'%BRAND_TWITTER_META%': twitterMeta
};

export async function handle({ event, resolve }) {
	return resolve(event, {
		transformPageChunk: ({ html }) => {
			let out = html;
			for (const [key, value] of Object.entries(replacements)) {
				out = out.replaceAll(key, value);
			}
			return out;
		}
	});
}

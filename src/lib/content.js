/**
 * Per-deployment editorial content, layered over a generic Ekklesia
 * default. Each block lives as a markdown file at:
 *
 *   content/_default/<lang>/<slot>/<slug>.md   ← generic default
 *   content/<deployment>/<lang>/<slot>/<slug>.md ← optional override
 *
 * `<lang>` is currently always `en`. When real i18n lands, the loader
 * will pick the language from a runtime store and fall back to `en`
 * for any slot the active language doesn't translate.
 *
 * Frontmatter on each file holds structured metadata (title, ctaLabel,
 * question, order, etc.); the markdown body is the rich-text portion
 * and is rendered by the existing Markdown components.
 *
 * Deployment selection is build-time via `VITE_APP_CONTENT`. Anything
 * unknown collapses to `_default`.
 */

const FALLBACK_LANG = 'en';
const ACTIVE_LANG = FALLBACK_LANG; // i18n hook — replace when language switching lands.

const DEPLOYMENT = (import.meta.env.VITE_APP_CONTENT || '_default').trim() || '_default';

// Eager glob: every markdown file in /content/** ends up bundled. Vite
// statically analyses this so unused deployment trees still ship — fine,
// the editorial corpus is tiny compared to the JS bundle.
const RAW = import.meta.glob('/content/**/*.md', {
	eager: true,
	query: '?raw',
	import: 'default'
});

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { data: {}, body: raw.replace(/^\s+/, '') };

	const [, fmBlock, body] = match;
	const data = {};

	for (const line of fmBlock.split(/\r?\n/)) {
		if (!line.trim() || line.trim().startsWith('#')) continue;
		const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!m) continue;
		const [, key, rawValue] = m;
		let value = rawValue.trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (/^-?\d+$/.test(value)) value = parseInt(value, 10);
		else if (value === 'true') value = true;
		else if (value === 'false') value = false;
		data[key] = value;
	}

	return { data, body: body.replace(/^\s+/, '') };
}

/**
 * Build a map keyed by relative path (everything after `<deployment>/<lang>/`)
 * for the given deployment + language. Missing combinations return `{}`.
 */
function collectLayer(deployment, lang) {
	const prefix = `/content/${deployment}/${lang}/`;
	const out = {};
	for (const [absPath, raw] of Object.entries(RAW)) {
		if (!absPath.startsWith(prefix)) continue;
		const rel = absPath.slice(prefix.length);
		const parsed = parseFrontmatter(raw);
		out[rel] = { ...parsed, path: absPath };
	}
	return out;
}

const defaultEn = collectLayer('_default', FALLBACK_LANG);
const defaultLang = ACTIVE_LANG === FALLBACK_LANG ? defaultEn : collectLayer('_default', ACTIVE_LANG);
const deploymentEn = DEPLOYMENT === '_default' ? {} : collectLayer(DEPLOYMENT, FALLBACK_LANG);
const deploymentLang =
	DEPLOYMENT === '_default' || ACTIVE_LANG === FALLBACK_LANG
		? deploymentEn
		: collectLayer(DEPLOYMENT, ACTIVE_LANG);

// Layer order: default-en (base) → default-lang (translation) → deployment-en
// (brand override) → deployment-lang (brand+translation override). Same-path
// files override; different paths accumulate (so deployments add new FAQs).
const merged = {
	...defaultEn,
	...defaultLang,
	...deploymentEn,
	...deploymentLang
};

function pick(prefix) {
	const out = {};
	for (const [rel, entry] of Object.entries(merged)) {
		if (!rel.startsWith(prefix)) continue;
		const slug = rel.slice(prefix.length).replace(/\.md$/, '');
		out[slug] = entry;
	}
	return out;
}

function asList(prefix) {
	return Object.values(pick(prefix)).sort((a, b) => {
		const ao = typeof a.data.order === 'number' ? a.data.order : 9999;
		const bo = typeof b.data.order === 'number' ? b.data.order : 9999;
		return ao - bo;
	});
}

const home = pick('home/');
const faqs = asList('faqs/');
const footer = pick('footer/');
const voterDirectory = pick('voter-directory/');
const errors = pick('errors/');

// Theme overrides ride the same per-deployment overlay as content. A flat
// JSON object at `content/<deployment>/theme.json` (sibling to `<lang>/`)
// overrides the corresponding CSS custom properties at boot. Partial
// overrides fall through to the defaults declared in `src/app.css`.
const THEMES = import.meta.glob('/content/*/theme.json', { eager: true, import: 'default' });
const defaultTheme = THEMES['/content/_default/theme.json'] || {};
const deploymentTheme =
	DEPLOYMENT === '_default' ? {} : THEMES[`/content/${DEPLOYMENT}/theme.json`] || {};
const theme = { ...defaultTheme, ...deploymentTheme };

export const content = {
	deployment: DEPLOYMENT,
	language: ACTIVE_LANG,
	home,
	faqs,
	footer,
	voterDirectory,
	errors,
	theme
};

/**
 * Convenience accessor: returns `{ data, body }` for a path or
 * `fallback` if the slot isn't authored. Useful in components that want
 * to defensively render only when content exists.
 */
export function getContent(path, fallback = null) {
	const entry = merged[path];
	return entry || fallback;
}

#!/usr/bin/env node
/**
 * Post-build branding pass.
 *
 * SvelteKit + adapter-static writes `build/index.html` and copies
 * `static/site.webmanifest` to `build/site.webmanifest` AFTER all of
 * Vite's plugin hooks (including closeBundle) have run. This script runs
 * after `vite build` completes and substitutes `%BRAND_*%` placeholders
 * in the emitted HTML, plus rewrites the manifest's `name` /
 * `short_name` from build-time env values.
 *
 * Defaults must stay in sync with `src/lib/base/branding.js`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

const BRAND_DEFAULTS = {
	name: 'Ekklesia',
	title: 'Ekklesia — Verifiable, Hydra-Powered Voting on Cardano',
	description:
		'Cast verifiable on-chain votes for Cardano governance. One tool for DReps, SPOs, CC members, and token holders — fast, auditable, Hydra-powered.',
	ogImage: '/social.png'
};

const mode = process.argv[2] || process.env.NODE_ENV || 'production';
const env = loadEnv(mode, process.cwd(), 'VITE_');

function escapeHtmlAttr(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

const name = env.VITE_APP_NAME || BRAND_DEFAULTS.name;
const title = env.VITE_APP_TITLE || BRAND_DEFAULTS.title;
const description = env.VITE_APP_DESCRIPTION || BRAND_DEFAULTS.description;
const ogImagePath = env.VITE_APP_OG_IMAGE || BRAND_DEFAULTS.ogImage;
const url = (env.VITE_APP_URL || '').replace(/\/$/, '');
const twitter = env.VITE_APP_TWITTER_HANDLE || '';

const ogImageAbs = url && ogImagePath.startsWith('/') ? `${url}${ogImagePath}` : ogImagePath;

const replacements = {
	'%BRAND_NAME%': escapeHtmlAttr(name),
	'%BRAND_TITLE%': escapeHtmlAttr(title),
	'%BRAND_DESCRIPTION%': escapeHtmlAttr(description),
	'%BRAND_OG_IMAGE%': escapeHtmlAttr(ogImageAbs)
};

const urlMeta = url
	? `<meta property="og:url" content="${escapeHtmlAttr(url)}">\n\t<meta property="twitter:url" content="${escapeHtmlAttr(url)}">\n\t<meta property="twitter:domain" content="${escapeHtmlAttr(url.replace(/^https?:\/\//, ''))}">`
	: '';
const twitterMeta = twitter
	? `<meta name="twitter:site" content="${escapeHtmlAttr(twitter)}">\n\t<meta name="twitter:creator" content="${escapeHtmlAttr(twitter)}">`
	: '';

function applyBranding(html) {
	let out = html;
	for (const [key, value] of Object.entries(replacements)) {
		out = out.replaceAll(key, value);
	}
	out = out.replaceAll('%BRAND_URL_META%', urlMeta);
	out = out.replaceAll('%BRAND_TWITTER_META%', twitterMeta);
	return out;
}

const indexPath = path.resolve('build/index.html');
if (fs.existsSync(indexPath)) {
	const html = fs.readFileSync(indexPath, 'utf8');
	fs.writeFileSync(indexPath, applyBranding(html));
	console.log(`[brand] rewrote ${indexPath}`);
} else {
	console.warn(`[brand] ${indexPath} not found — skipping`);
}

const buildManifest = path.resolve('build/site.webmanifest');
const sourceManifest = path.resolve('static/site.webmanifest');
if (fs.existsSync(buildManifest) && fs.existsSync(sourceManifest)) {
	const manifest = JSON.parse(fs.readFileSync(sourceManifest, 'utf8'));
	manifest.name = title;
	manifest.short_name = name;
	fs.writeFileSync(buildManifest, JSON.stringify(manifest, null, '\t') + '\n');
	console.log(`[brand] rewrote ${buildManifest}`);
}

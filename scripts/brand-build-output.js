#!/usr/bin/env node
/**
 * Post-build branding pass.
 *
 * SvelteKit + adapter-static writes `build/<mode>/index.html` and copies
 * `static/site.webmanifest` to `build/<mode>/site.webmanifest` AFTER all
 * of Vite's plugin hooks (including closeBundle) have run. This script
 * runs after `vite build` completes and does three things:
 *
 *   1. Substitutes `%BRAND_*%` placeholders in the emitted HTML.
 *   2. Rewrites the webmanifest's `name` / `short_name` from env, and
 *      its `theme_color` / `background_color` from the deployment's
 *      `theme.json` `header-background` token (so PWA chrome matches
 *      the in-app header).
 *   3. Copies per-deployment favicon-style assets from
 *      `static/brand/<deployment>/` over the build root, replacing the
 *      default Ekklesia icons. `<deployment>` is picked up from the
 *      `VITE_APP_CONTENT` env var — same key the content overlay uses.
 *
 * Pass the build mode as the first CLI arg (e.g. `node
 * scripts/brand-build-output.js preprod`) so this matches the
 * `build/<mode>` directory the SvelteKit adapter wrote to.
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
  ogImage: '/social.png',
};

// Standard favicon-style assets the SvelteKit static adapter copies to
// the build root. Each can be overridden per deployment by dropping a
// same-named file into `static/brand/<deployment>/`. Anything not on
// this list is ignored (the logo lives there too but is served at
// `/brand/<deployment>/logo.<ext>` at runtime — see Header.svelte).
const BRAND_ASSETS = [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'social.png',
];

const mode = process.argv[2] || process.env.NODE_ENV || 'production';
const env = loadEnv(mode, process.cwd(), 'VITE_');
const buildDir = path.resolve('build', mode);
const deployment = (env.VITE_APP_CONTENT || '_default').trim() || '_default';

function escapeHtmlAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// ---------- colour math (used by the OG palette derivation below) ----------

function parseHex(hex) {
  const m = String(hex || '').match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r;
  let g;
  let b;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Multiply HSL lightness by a factor; clamps to [0,1]. `factor` < 1 darkens. */
function adjustLightness(hex, factor) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  hsl.l = Math.max(0, Math.min(1, hsl.l * factor));
  return hslToHex(hsl);
}

/** WCAG sRGB relative luminance, 0 (black) → 1 (white). */
function relativeLuminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1:1 = no contrast, 21:1 = max). */
function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isLightColour(hex) {
  return relativeLuminance(hex) > 0.5;
}

/** Emit `rgba(...)` for the alpha-using palette slots (chips, overlay). */
function hexToRgba(hex, alpha) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
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
  '%BRAND_OG_IMAGE%': escapeHtmlAttr(ogImageAbs),
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

/**
 * Read the merged theme (defaults + deployment override) so we can pluck
 * a single canonical value (e.g. `header-background`) for the webmanifest.
 * Mirrors the layering in `src/lib/content.js`.
 */
function loadMergedTheme() {
  const layers = ['_default'];
  if (deployment !== '_default') layers.push(deployment);
  let merged = {};
  for (const layer of layers) {
    const themePath = path.resolve('content', layer, 'theme.json');
    if (!fs.existsSync(themePath)) continue;
    try {
      merged = { ...merged, ...JSON.parse(fs.readFileSync(themePath, 'utf8')) };
    } catch (e) {
      console.warn(`[brand] could not parse ${themePath}: ${e.message}`);
    }
  }
  return merged;
}

// ---------- index.html ----------

const indexPath = path.join(buildDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, applyBranding(html));
  console.log(`[brand] rewrote ${indexPath}`);
} else {
  console.warn(`[brand] ${indexPath} not found — skipping`);
}

// ---------- site.webmanifest ----------

const buildManifest = path.join(buildDir, 'site.webmanifest');
const sourceManifest = path.resolve('static/site.webmanifest');
if (fs.existsSync(buildManifest) && fs.existsSync(sourceManifest)) {
  const manifest = JSON.parse(fs.readFileSync(sourceManifest, 'utf8'));
  manifest.name = title;
  manifest.short_name = name;

  // Pull theme/background colour from the deployment's theme.json so
  // the PWA install card + Android task switcher chrome match the
  // in-app header. Falls through to whatever's already in the source
  // manifest if no header colour is themed.
  const theme = loadMergedTheme();
  const headerBg = theme['header-background'];
  if (headerBg) {
    manifest.theme_color = headerBg;
    manifest.background_color = headerBg;
  }

  fs.writeFileSync(buildManifest, JSON.stringify(manifest, null, '\t') + '\n');
  console.log(`[brand] rewrote ${buildManifest}`);
}

// ---------- OG palette (consumed by the backend's OG_PALETTE_FILE) ----------

/**
 * Derive the backend OG card palette from the merged frontend theme so
 * `/og/ballot/:id.png` and `/og/proposal/:id.png` render in the
 * deployment's brand colours instead of the Ekklesia defaults.
 *
 * Palette schema mirrors `DEFAULT_PALETTE` in
 * `ekklesia-backend/helper/og/ogImage.js`. Backend autoderives
 * `glowPrimary`, `glowSecondary`, `accentTop`, and `accentBottom` from
 * `brandPrimary` / `brandSecondary` when they're absent, so we leave
 * them out entirely.
 *
 * Mapping:
 *   bgFrom/bgVia/bgTo   ← header-background, with darker (or lighter
 *                          for light headers) variants for from/to so
 *                          the editorial gradient aesthetic survives
 *   brandPrimary        ← `brand` (the warm accent / glow #1)
 *   brandSecondary      ← `primary` (the filled-CTA colour / glow #2)
 *   textPrimary         ← `header-foreground` or auto white/black
 *   textSecondary       ← textPrimary at 70% alpha
 *   chipBg              ← textPrimary at 8% alpha
 *   chipBorder          ← textPrimary at 18% alpha
 *   decorativeOverlay   ← textPrimary
 *
 * The backend reads this file via `OG_PALETTE_FILE` env var. Deploys
 * should set it to the absolute path of this file in the served bundle
 * (e.g. `OG_PALETTE_FILE=/srv/ekklesia/frontend/build/production/og-palette.json`).
 */
/**
 * Maximum bgVia lightness. Anything brighter would put the gradient too
 * close in tone to brand-coloured text on top (eyebrow + wordmark dot
 * both use `brandPrimary`). The cap matches the default Ekklesia OG
 * backdrop (`#1E1E2F`, L=15%) — saturated deployments like Intersect
 * (`#0228AA`, L=34%) get darkened to a similar editorial tone, keeping
 * brand hue intact via the preserved H/S channels.
 */
const BG_VIA_MAX_LIGHTNESS = 0.16;

function deriveOgPalette(theme) {
  // Fallbacks mirror the defaults declared in `src/app.css` so the
  // derivation behaves identically whether the operator ships a
  // `content/_default/theme.json` or relies on the baked-in defaults.
  const headerBg = theme['header-background'] || '#1E1E2F';
  const brand = theme.brand || '#F97316';
  const primary = theme.primary || '#0F172A';
  const brandHover = theme['brand-hover'] || '#EA580C';

  const lightHeader = isLightColour(headerBg);

  // Cap bgVia lightness so the gradient is always editorial-dark and
  // same-hue brand text stays readable. For light-headered deployments
  // (rare) we flip into a light-bg card design instead.
  const headerRgb = parseHex(headerBg) || [30, 30, 47];
  const headerHsl = rgbToHsl(headerRgb);
  const cappedL = lightHeader
    ? Math.max(headerHsl.l, 0.84)
    : Math.min(headerHsl.l, BG_VIA_MAX_LIGHTNESS);
  const bgVia = hslToHex({ ...headerHsl, l: cappedL });

  // Asymmetric gradient stops bracketing bgVia. Mirrors the original
  // Ekklesia default ratios (bgFrom/bgVia ≈ 0.53, bgTo/bgVia ≈ 1.27).
  const fromFactor = lightHeader ? 1.06 : 0.53;
  const toFactor = lightHeader ? 0.94 : 1.27;
  const bgFrom = adjustLightness(bgVia, fromFactor);
  const bgTo = adjustLightness(bgVia, toFactor);

  // Pick brandPrimary as the highest-contrast theme colour against
  // bgVia, then brandSecondary as the next-best distinct candidate.
  // This auto-promotes a brighter colour for deployments where the
  // nominal `brand` token sits in the same hue family as the header
  // (e.g. Intersect's cardano-blue brand on tangy-blue header — too
  // close to read as the eyebrow text). Deployments where `brand`
  // already pops (e.g. default Ekklesia's orange on dark navy) keep
  // using `brand` because it ranks first on contrast.
  const candidates = [
    { name: 'brand', hex: brand },
    { name: 'primary', hex: primary },
    { name: 'brand-hover', hex: brandHover },
  ].filter((c) => c.hex);
  const ranked = candidates
    .map((c) => ({ ...c, ratio: contrastRatio(c.hex, bgVia) }))
    .sort((a, b) => b.ratio - a.ratio);
  const brandPrimary = ranked[0]?.hex || brand;
  const brandSecondary = ranked.find((r) => r.hex !== brandPrimary)?.hex || brandHover;

  const textPrimary = theme['header-foreground'] || (lightHeader ? '#0F172A' : '#FFFFFF');

  return {
    bgFrom,
    bgVia,
    bgTo,
    brandPrimary,
    brandSecondary,
    textPrimary,
    textSecondary: hexToRgba(textPrimary, 0.7) || (lightHeader ? '#475569' : '#A0A0B8'),
    chipBg: hexToRgba(textPrimary, 0.08) || 'rgba(255, 255, 255, 0.08)',
    chipBorder: hexToRgba(textPrimary, 0.18) || 'rgba(255, 255, 255, 0.18)',
    decorativeOverlay: textPrimary,
  };
}

{
  const theme = loadMergedTheme();
  const palette = deriveOgPalette(theme);
  const ogPalettePath = path.join(buildDir, 'og-palette.json');
  fs.writeFileSync(ogPalettePath, JSON.stringify(palette, null, '\t') + '\n');
  console.log(`[brand] wrote ${path.relative(process.cwd(), ogPalettePath)}`);
}

// ---------- per-deployment favicon overrides ----------

if (deployment !== '_default') {
  const brandDir = path.resolve('static/brand', deployment);
  if (fs.existsSync(brandDir)) {
    let copied = 0;
    for (const filename of BRAND_ASSETS) {
      const src = path.join(brandDir, filename);
      if (!fs.existsSync(src)) continue;
      const dst = path.join(buildDir, filename);
      fs.copyFileSync(src, dst);
      console.log(
        `[brand] copied ${path.relative(process.cwd(), src)} → ${path.relative(process.cwd(), dst)}`,
      );
      copied += 1;
    }
    if (copied === 0) {
      console.log(
        `[brand] no favicon overrides found in ${path.relative(process.cwd(), brandDir)}`,
      );
    }
  }
}

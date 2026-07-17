/**
 * Per-deployment theme applier.
 *
 * Reads the (already-merged) theme object from `$lib/content` and writes
 * the brand-visible CSS custom properties onto `document.documentElement`.
 * Anything the deployment doesn't set falls through to the defaults in
 * `src/app.css`, so partial overrides are fine.
 *
 * Operator-facing format is hex (matches the MBO brand guide). Internally
 * the CSS vars stay as "H S% L%" triplets so Tailwind's `hsl(var(--token)
 * / <alpha-value>)` opacity utilities (bg-primary/80, bg-muted/50, …)
 * keep working. The applier converts hex → HSL triplet before writing.
 *
 * Schema of `content/<deployment>/theme.json` — every key optional:
 *
 *   {
 *     "primary":              "#0F172A",      // hex; #RGB / #RRGGBB / with alpha
 *     "primary-foreground":   "#F8FAFC",
 *     "secondary":            "#F1F5F9",
 *     "secondary-foreground": "#0F172A",
 *     "accent":               "#F1F5F9",
 *     "accent-foreground":    "#0F172A",
 *     "destructive":          "#DC2626",
 *     "destructive-foreground": "#F8FAFC",
 *     "ring":                 "#020817",
 *     "header-background":    "#1E1E2F",      // sticky header bg
 *     "header-foreground":    "#FFFFFF",      // optional — auto-derived from bg if omitted
 *     "brand":                "#F97316",      // accent (CTA highlights, progress strip, …)
 *     "brand-hover":          "#EA580C",
 *     "brand-fg":             "#FFFFFF",      // text on `--brand`
 *     "brand-soft":           "#FFF7ED",      // soft tinted background
 *     "brand-soft-fg":        "#7C2D12",      // text on `--brand-soft`
 *     "network-warning":      "#F97316",      // testnet-banner bg (kept loud, not brand-tied)
 *     "network-warning-foreground": "#FFFFFF",// optional — auto-derived from bg if omitted
 *     "radius":               "0.5rem",
 *     "font-heading":         "Inter",        // Google Fonts family name
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
  'ring',
  'header-background',
  'header-foreground',
  'brand',
  'brand-hover',
  'brand-fg',
  'brand-soft',
  'brand-soft-fg',
  'network-warning',
  'network-warning-foreground',
];

const FONT_WEIGHTS = '400;500;600;700';
const FONT_FALLBACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/**
 * Parse #RGB / #RGBA / #RRGGBB / #RRGGBBAA into [r, g, b] in 0–255.
 * Alpha is discarded — Tailwind's `<alpha-value>` carries opacity.
 * Returns null for anything that doesn't parse.
 */
function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const h = hex.replace(/^#/, '');
  let r;
  let g;
  let b;
  if (h.length === 3 || h.length === 4) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6 || h.length === 8) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    return null;
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r, g, b];
}

/** Convert hex → "H S% L%" string for assignment to a CSS var. */
function hexToHslString(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => c / 255);
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
  const round1 = (n) => Math.round(n * 10) / 10;
  return `${round1(h)} ${round1(s * 100)}% ${round1(l * 100)}%`;
}

/**
 * WCAG relative luminance, 0 (black) to 1 (white). Used to pick a
 * contrasting foreground when one isn't explicitly set.
 */
function relativeLuminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** White-on-dark / black-on-light, HSL triplet for direct CSS var assignment. */
function contrastForeground(bgHex) {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return null;
  return relativeLuminance(rgb) > 0.5 ? '0 0% 0%' : '0 0% 100%';
}

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
    const hex = theme[token];
    if (!hex) continue;
    const hsl = hexToHslString(hex);
    if (hsl) root.style.setProperty(`--${token}`, hsl);
    else console.warn(`[theme] ignored "${token}" — could not parse hex: ${hex}`);
  }

  // Auto-derive header-foreground from header-background when not set.
  // Lets a deployment pick just a header colour and get sensible nav-button
  // contrast for free.
  if (theme['header-background'] && !theme['header-foreground']) {
    const auto = contrastForeground(theme['header-background']);
    if (auto) root.style.setProperty('--header-foreground', auto);
  }

  // Same auto-derive for the testnet-warning banner: a deployment can set
  // just `network-warning` and get a readable foreground for free.
  if (theme['network-warning'] && !theme['network-warning-foreground']) {
    const auto = contrastForeground(theme['network-warning']);
    if (auto) root.style.setProperty('--network-warning-foreground', auto);
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

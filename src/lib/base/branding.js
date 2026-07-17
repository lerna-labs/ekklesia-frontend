/**
 * Build-time configurable branding for the deployed app.
 *
 * Driven by VITE_APP_* env vars (see .env.example). Anything left unset
 * falls back to the generic Ekklesia defaults below — keep these in sync
 * with the defaults in `scripts/brand-build-output.js` (production) and
 * `src/hooks.server.js` (dev), which substitute the static %BRAND_*% meta
 * tags that social scrapers read.
 */

export const BRAND_DEFAULTS = Object.freeze({
  name: 'Ekklesia',
  title: 'Ekklesia — Verifiable, Hydra-Powered Voting on Cardano',
  description:
    'Cast verifiable on-chain votes for Cardano governance. One tool for DReps, SPOs, CC members, and token holders — fast, auditable, Hydra-powered.',
  ogImage: '/social.png',
});

const env = import.meta.env;

export const BRAND = Object.freeze({
  name: env.VITE_APP_NAME || BRAND_DEFAULTS.name,
  title: env.VITE_APP_TITLE || BRAND_DEFAULTS.title,
  description: env.VITE_APP_DESCRIPTION || BRAND_DEFAULTS.description,
  url: env.VITE_APP_URL || '',
  ogImage: env.VITE_APP_OG_IMAGE || BRAND_DEFAULTS.ogImage,
  twitterHandle: env.VITE_APP_TWITTER_HANDLE || '',
});

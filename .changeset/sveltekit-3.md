---
"ekklesia-frontend": minor
---

Move the frontend build from SvelteKit 2 to SvelteKit 3.4.1, with `@sveltejs/adapter-static` 4.0.1, `@sveltejs/vite-plugin-svelte` 7.3.2 and Vite 8.4.0, closing GHSA-27mw-82g8-phjj, GHSA-pfhg-q3qv-9q6r, GHSA-6cf5-gc4q-fm3x and GHSA-3r8g-jcqq-3p5j. The SvelteKit options now live in `vite.config.js`, page state comes from `$app/state`, and building the app requires Node 22.17 or later.

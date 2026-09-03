---
"ekklesia-frontend": patch
---

Bump svelte to 5.57.0, @sveltejs/kit to 2.70.3, vite to 6.4.3, and js-cookie to 3.0.8, closing multiple high and medium severity advisories in the Svelte toolchain, Vite dev server, and the cookie mirror used for the auth token. Refresh the lockfile so postcss, devalue, brace-expansion, picomatch, @humanfs/node, nanoid, and browserslist resolve to their patched versions. Override cookie to 0.7.0+ since @sveltejs/kit still declares a pre-fix range, closing an out-of-bounds cookie name/path/domain advisory. Drop the js-yaml, flatted, minimatch, and rollup overrides added for prior advisories: their direct parents now resolve patched versions on their own.

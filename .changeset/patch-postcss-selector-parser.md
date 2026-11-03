---
"ekklesia-frontend": patch
---

Update the `postcss-selector-parser` development dependency to 6.1.5 across the lockfile, closing GHSA-rj75-hqrm-r3gf. `@tailwindcss/typography` pins 6.0.10 exactly, so `package.json` gains an override scoped to that package.

---
"ekklesia-frontend": patch
---

Refresh the lockfile so `yaml` (nested under `postcss-load-config`, used by `eslint-plugin-svelte`) resolves to 1.10.3 and `ajv` (used by `eslint`) resolves to 6.15.0, closing a stack-overflow-via-deep-nesting advisory in `yaml` and a ReDoS advisory in `ajv`. Both packages stay within their parents' already-declared version ranges, so no dependency ranges or overrides changed.

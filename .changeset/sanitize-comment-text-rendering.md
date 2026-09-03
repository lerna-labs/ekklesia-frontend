---
"ekklesia-frontend": patch
---

Render comment and proposal blurb text (`Text.svelte`) with plain Svelte template syntax instead of building a raw HTML string, so linkified URLs and line breaks can no longer carry attacker-controlled markup or event-handler attributes through to other viewers; bare `http(s)` links and newline-to-line-break formatting behave the same as before.

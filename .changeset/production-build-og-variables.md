---
"ekklesia-frontend": patch
---

The production release build now reads its page URL, name, title and Twitter handle from the `production` environment, so the published tarball carries absolute `og:url`, `twitter:url` and OG image tags and the production title. The build fails early if the page URL is missing.

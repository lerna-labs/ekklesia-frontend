---
question: 'Can I fetch Ekklesia data via API?'
order: 100
---

Yes — the Voting and Proposals APIs are documented at
[docs.ekklesia.vote/api](https://docs.ekklesia.vote/api/), including full
interactive OpenAPI specifications. API stability is improving but is not yet
guaranteed across instances; integrate at your own discretion and pin to a
specific version where you can.

If you're surfacing live results, note that they are rolled up roughly every
10 minutes and the read endpoints are aggressively cached. Spamming them may
result in your IP being temporarily blacklisted.

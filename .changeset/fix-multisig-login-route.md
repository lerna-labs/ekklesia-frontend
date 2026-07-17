---
"ekklesia-frontend": patch
---

Fix multisig/script wallet login hitting a 404. The dedicated `/api/v0/session/multisig` route was retired on the backend in favor of a single `/api/v0/session` endpoint that branches on a `scriptAddress` field in the request body; the frontend was still posting to the old sub-route for both the login nonce and signature steps.

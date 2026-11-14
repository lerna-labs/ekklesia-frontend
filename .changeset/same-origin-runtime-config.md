---
"ekklesia-frontend": minor
---

The app now calls the API at `/api` and the health check at `/health` on the page's own origin, and the Vite dev server proxies both to the backend (`DEV_BACKEND_URL`, default `http://localhost:3000`). The wallet signer types, default type, multisig switch and network ID are read at run time from `GET /api/v1/config` (every type, `stake` and multisig on when the backend omits `walletSigner`). The `VITE_API_URL`, `VITE_SERVER_STATUS`, `VITE_NETWORK_ID` and `VITE_WALLETSIGNER_*` build variables are removed, and the staging preprod build needs only `VITE_APP_URL`.

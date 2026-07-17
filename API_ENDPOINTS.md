# API Endpoints Documentation

Canonical map of every backend endpoint this frontend consumes, split by
version. Legacy ballot writes (`/api/v0/*` for `ballots`, `proposals`,
`vote`, `votes`, `voters`, `transactions`, `dashboard`) now return 410 —
the frontend must never call them, and UI code routes writes through
the v1 broker surface instead.

## API versioning and wrapper

- **Base URL**: `VITE_API_URL` is the `/api` root (never includes
  `/v0` or `/v1`). For back-compat the wrapper strips a trailing
  `/v0` from a legacy `.env` value.
- **Wrapper**: `src/stores/sessionManager.js` exports `api.fetch(fetch,
path, opts)` (prepends `/v0`) and `api.v1.fetch(fetch, path, opts)`
  (prepends `/v1`). Both attach the JWT Bearer header, send
  `credentials: 'include'`, and auto-logout on 401.

---

## Reads — v1 (Hydra-aware)

### `GET /api/v1/ballots`

Unified listing. Returns both legacy and Hydra ballots with a
`source: "legacy" | "hydra"` discriminator. Supports `?status=`,
`?voterType=`, `?search=`, `?page=`, `?limit=`, and `?source=`.

Used by `src/routes/+page.js`, `src/routes/ballots/+page.js`.

### `GET /api/v1/ballots/:id`

Unified detail; dispatcher resolves legacy + Hydra ballots through a
single call. Response wraps the payload in `{ data }`. For Hydra
ballots the `hydra` sub-object includes `endpoint`, `headId`,
`headStatus`, `ballotCid`, `instancePolicyId`, `prepareTxHash`, and
(best-effort) live `headInfo` / `ballot` enrichment from the
instance.

Used by `src/routes/ballots/[ballotId]/+page.js`,
`src/routes/ballots/[ballotId]/proposals/+page.js`,
`src/routes/ballots/[ballotId]/proposals/[proposalId]/+page.js`,
`src/routes/ballots/[ballotId]/proposals/[proposalId]/results/+page.js`,
`src/lib/TransactionDetails.svelte`.

### `GET /api/v1/results/ballot/:ballotId`

Every proposal's result in one call. Each row carries
`source: "provisional" | "final"`, `ballotSource`, `finalizedAt`,
`results[]`, `resultsByGroup?`, plus Hydra finalize fields
(`hydraResultsHash`, `hydraFinalizeTxHash`, etc.) once the ballot is
finalized.

Used by `src/lib/results.js::fetchBallotResults` (via
`BallotProvenance.svelte` for the close receipt).

### `GET /api/v1/results/proposal/:proposalId`

Single proposal's result. Returns 404 when no tally has run yet.

Used by `src/lib/results.js::fetchProposalResult` (via the results
page load function + focus-only 30s poller).

### `GET /api/v1/config`

Public runtime config: `{ ipfsGatewayBase, explorerTxBase,
explorerAddressBase, network }`.

Used by `src/lib/config.js::loadFrontendConfig` → seeds the `config`
store; consumed by `ConfirmationModal.svelte`, `BallotProvenance.svelte`,
`AuditMyVote.svelte`, `BallotDetails.svelte`.

---

## Reads — v0 (kept alive for the pieces v1 hasn't covered yet)

### `GET /api/v0/ballots/voterTypes`

Aggregate of valid voter types for the ballots listing filter. No v1
equivalent today.

Used by `src/routes/ballots/+page.js`.

### `GET /api/v0/ballots/:id/proposals`

Paginated proposals for a ballot. Supports `?search`, `?tags`,
`?categories`, `?sort`, `?direction`, `?hasVoted`, `?thresholdReached`,
`?page`, `?limit`.

Used by the proposals listing + proposal detail load functions.

### `GET /api/v0/ballots/:id/tags` and `/categories`

Filter options. No v1 equivalent.

Used by the proposals listing load function.

### `GET /api/v0/proposals/:id/comments`, `GET /api/v0/proposals/:id/short`

Comments listing + short-proposal lookup.

Used by `src/lib/Comments.svelte`, `src/lib/TransactionVotes.svelte`.

### `GET /api/v0/voters`, `GET /api/v0/voters/:id`

Voter directory.

Used by `src/routes/voter-directory/+page.js` and `[voterId]/+page.js`.

### `GET /api/v0/dashboard/`

Voter-facing session summary: `userId`, `lastLogin`, `multiSig`,
`pendingVotesCount`.

### `GET /api/v0/session/`

Session read enriched with `nativeScript`, `pendingPackages`, and
`isAdmin`. Merged with `/dashboard/` by `src/lib/config.js::
refreshUserSession` on every page load and after login so the `user`
store carries both.

### `GET /api/v0/dashboard/ballots`, `GET /api/v0/dashboard/pending`, `GET /api/v0/transactions`

Dashboard reads for the voter's own activity.

Used by `src/routes/(private)/dashboard/+page.js`. `dashboard/pending`
is also consumed by `src/lib/broker.js::getPendingBallotVotes` to shape
the `votes[]` body for `/v1/votes/:ballotId/draft`.

---

## Writes — v1 broker (Hydra ballots)

The three-step pipeline for casting votes on Hydra-backed ballots.
See `src/lib/broker.js` for the helpers and
`src/lib/BrokerVoteFlow.svelte` / `src/lib/BallotCosignerPrompt.svelte`
for the UI.

### `POST /api/v1/votes/:ballotId/draft`

Body: `{ votes: [{ questionId, selection | ranking | weights }],
responderRole?, nativeScript?, calidusDeclaration? }`. For multisig
voters the backend auto-pulls `nativeScript` from the cached User doc
when the body omits it; the frontend sends it anyway as
belt-and-suspenders. For pool voters with a CIP-151 Calidus hot key,
the frontend sends `calidusDeclaration: { calidusId }`.

Returns `{ package: { id, status, nonce }, merkleRoot,
signingPayloadHex, multisig }`.

### `POST /api/v1/votes/:ballotId/signature`

Body: `{ packageId, witness: { coseSign1Hex, coseKeyHex } }`. The
backend's `normalizeWitness` helper derives the keyHash / raw pub key /
raw ed25519 signature server-side, so the frontend never needs WASM.

For key-based voters this triggers Hydra submission inline and returns
`{ submitted: true, package: { hydraTxId, ipfsCid, confirmedAt, ... } }`.
For multisig, `submitted: false` + an updated `multisig` summary until
the threshold is met.

### `POST /api/v1/votes/:ballotId/submit`

Idempotent manual retry for packages stuck in `awaiting-submission`
after a transient Hydra failure. Body: `{ packageId }`.

### `GET /api/v1/votes/:ballotId/package/:packageId`

Current package view, enriched with `merkleRoot`, `signingPayloadHex`,
`signedPayloadJson`, and `multisig` summary.

### `GET /api/v1/votes/:ballotId/packages`

Lists the authenticated user's packages on a ballot. Default filter
returns active states only (`draft`, `awaiting-signatures`,
`awaiting-submission`). `?includeTerminal=true` broadens;
`?status=<state>` pins; `?limit=N` caps.

Used by `src/lib/broker.js::listPackages`, consumed by
`BallotCosignerPrompt.svelte` (active packages for cosigner entry) and
`AuditMyVote.svelte` (confirmed packages for provenance rendering).

### Broker error envelope

All `/api/v1/votes/*` endpoints return `{ status: "error", code,
message }` on failure, where `code` is one of `BAD_INPUT`,
`ELIGIBILITY_DENIED`, `PACKAGE_NOT_FOUND`, `FORBIDDEN`,
`PACKAGE_TERMINAL`, `SIGNATURE_INVALID`, `NONCE_STALE`,
`HYDRA_UPSTREAM`, `INTERNAL`.

---

## Writes — v0 (auth + comments, not frozen)

### `POST /api/v0/session`, `PUT /api/v0/session`, `DELETE /api/v0/session`

Login nonce / signature-verify / logout. Unchanged. The `POST` +
`PUT` pair also accepts a `scriptAddress` body for multisig login.

Used by `src/lib/WalletSigner/WalletSigner.js` (dynamic requestUrl),
`src/stores/sessionManager.js::logout`.

### `POST /api/v0/comment`

Post a comment on a proposal.

Used by `src/lib/Comments.svelte`.

---

## Writes that now return 410 (must not be called)

The backend's `v0Freeze` middleware 410s all write methods under these
prefixes on v0: `/ballots`, `/proposals`, `/vote`, `/votes`, `/voters`,
`/transactions`, `/dashboard`. The frontend used to exercise:

- `POST /api/v0/vote/:proposalId` — per-proposal pending-vote
  storage. Gated out in `ProposalVote.svelte` for `source === 'legacy'`
  ballots (which are the only ballots the v0 writes covered, and they
  are now read-only archives).
- `POST/PUT /api/v0/dashboard/:ballotId/checkout[/multisig][/:tx]` —
  the old vote-submission flow. Replaced by the three-step broker for
  Hydra ballots. Removed from `PendingVotes.svelte`; the old
  `WalletSigner.svelte` component is retained for login only.

If you need to test the 410 behavior directly, any of those paths will
return it.

---

## Status / version / external

- `GET ${VITE_SERVER_STATUS}` — external status probe used by the
  root layout. Not under `/api`.
- `GET /version.json` — static asset served by the frontend. Written
  at build time by `svelte.config.js`.

---

## Component → endpoint map (quick reference)

| Component / module                                                                   | Endpoint(s)                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/+layout.js`                                                              | `GET /v1/config`, `GET /v0/dashboard/`, `GET /v0/session/`                                                                                                                                                        |
| `src/routes/+page.js`                                                                | `GET /v1/ballots?status=…`                                                                                                                                                                                        |
| `src/routes/ballots/+page.js`                                                        | `GET /v1/ballots`, `GET /v0/ballots/voterTypes`                                                                                                                                                                   |
| `src/routes/ballots/[ballotId]/+page.js`                                             | `GET /v1/ballots/:id`                                                                                                                                                                                             |
| `src/routes/ballots/[ballotId]/proposals/+page.js`                                   | `GET /v1/ballots/:id`, `GET /v0/ballots/:id/proposals`, `GET /v0/ballots/:id/tags`, `GET /v0/ballots/:id/categories`                                                                                              |
| `src/routes/ballots/[ballotId]/proposals/[proposalId]/+page.js`                      | `GET /v1/ballots/:id`, `GET /v0/ballots/:id/proposals?search=:id`                                                                                                                                                 |
| `src/routes/ballots/[ballotId]/proposals/[proposalId]/results/+page.js`              | `GET /v1/ballots/:id`, `GET /v0/ballots/:id/proposals?search=:id`, `GET /v1/results/proposal/:id`                                                                                                                 |
| `src/routes/(private)/dashboard/+page.js`                                            | `GET /v0/dashboard/`, `GET /v0/dashboard/ballots`, `GET /v0/transactions`, `GET /v0/dashboard/pending`                                                                                                            |
| `src/routes/voter-directory/+page.js`, `[voterId]/+page.js`                          | `GET /v0/voters`, `GET /v0/voters/:id`                                                                                                                                                                            |
| `src/lib/Comments.svelte`                                                            | `GET /v0/proposals/:id/comments`, `POST /v0/comment`                                                                                                                                                              |
| `src/lib/TransactionDetails.svelte`                                                  | `GET /v1/ballots/:id`                                                                                                                                                                                             |
| `src/lib/TransactionVotes.svelte`                                                    | `GET /v0/proposals/:id/short`                                                                                                                                                                                     |
| `src/lib/ProposalVoteDefault.svelte`, `ProposalVoteBudget.svelte`                    | `POST /v0/vote/:id` (only reachable on non-legacy ballots; the new broker doesn't use this path for Hydra writes — it's only per-proposal draft staging)                                                          |
| `src/lib/broker.js`                                                                  | `GET /v1/votes/:ballotId/packages`, `GET /v1/votes/:ballotId/package/:id`, `POST /v1/votes/:ballotId/draft`, `POST /v1/votes/:ballotId/signature`, `POST /v1/votes/:ballotId/submit`, `GET /v0/dashboard/pending` |
| `src/lib/BrokerVoteFlow.svelte`, `BallotCosignerPrompt.svelte`, `AuditMyVote.svelte` | (via `broker.js` helpers)                                                                                                                                                                                         |
| `src/lib/BallotProvenance.svelte`                                                    | `GET /v1/results/ballot/:id`                                                                                                                                                                                      |
| `src/lib/WalletSigner/*`                                                             | `POST /v0/session`, `PUT /v0/session` (login only — no longer used for vote submission)                                                                                                                           |

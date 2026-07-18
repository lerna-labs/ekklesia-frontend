# ekklesia-frontend

## 1.0.1

### Patch Changes

- f6fb542: Update dependencies: svelte-sonner to 1.1.1, dayjs to 1.11.21, and markdown-it to 14.3.0.

## 1.0.0

### Major Changes

- 23b83b6: First public, open-source release of ekklesia-frontend.

### Minor Changes

- 23b83b6: Expand per-deployment theming: hex colors throughout `theme.json`, themable header background/foreground with auto-contrast, a per-deployment logo and favicon set, a five-token brand accent palette replacing hard-coded oranges across the vote/results UI, and an OG-image color palette so social-share cards match each deployment's brand. Documented in `content/README.md`.
- 23b83b6: Add cross-links from voting proposals out to the proposals module, where imported proposals carry their full text, rationale, comments, and version history. Also fixes the "Total Budget" facet showing values ~1 million times too small, reworks multi-value facets to render as individual chips instead of a comma-joined run, and gives the preprod network-warning banner its own themable color so it stays visible under dark brand palettes.
- 23b83b6: Surface resolved voter display names (DRep metadata name or Cardano handle) throughout the voter directory instead of leading with bech32 ids, and add a "Last Vote" column/sort alongside "Last Login". Also refreshes the FAQ copy following the Hydra and certification work.

### Patch Changes

- 23b83b6: Fix Lace wallet rejecting CIP-95 `signData` calls when casting a vote. Lace requires the hex representation of the DRep ID (not bech32) with the credential prefix byte stripped; login already handled this, voting now does too.
- 23b83b6: Fix multisig/script wallet login hitting a 404. The dedicated `/api/v0/session/multisig` route was retired on the backend in favor of a single `/api/v0/session` endpoint that branches on a `scriptAddress` field in the request body; the frontend was still posting to the old sub-route for both the login nonce and signature steps.
- 23b83b6: Fix multi-choice (approval) ballots incorrectly capping voters at a single selection, and fix submission being blocked once more than one option was picked. The selection cap now reads the schema's `maxSelections`/`minSelections` instead of the unrelated `voterBudget` field the backend also emits on multi-choice proposals.
- ded8d24: Fix several parts of the UI that did not refresh when their underlying data changed. Voter badge labels, the vote participation donut and its percentages, the sort controls, and voter profile pages now update in place as the data changes instead of keeping their first-loaded values.
- 886b25b: Revert a hard-coded "Voting is currently suspended for Hydra maintenance" notice that had no toggle and would have shipped permanently on. The notice banner mechanism itself is unchanged and still available for a real, gated maintenance notice when one is actually needed.

# API Endpoints Documentation

This document lists all API endpoints used throughout the codebase, organized by route and the components that use them.

## Base API Configuration

- **Base URL**: Configured via `VITE_API_URL` environment variable
- **Authentication**: Bearer token via `Authorization` header (managed by `sessionManager.js`)
- **API Helper**: All endpoints (except external ones) use `api.fetch()` from `src/stores/sessionManager.js`

---

## Routes and Endpoints

### `/` (Home Route)

**File**: `src/routes/+page.js`

| Endpoint                      | Method | Description         | Query Parameters     |
| ----------------------------- | ------ | ------------------- | -------------------- |
| `/ballots?status=upcoming`    | GET    | Get upcoming ballots | `status=upcoming`    |
| `/ballots?status=live`        | GET    | Get live ballots     | `status=live`         |
| `/ballots?status=closed`      | GET    | Get closed ballots   | `status=closed`       |

**Components Using This Route**:

- `src/routes/+page.svelte` - Displays home page with ballot listings

---

### `+layout.js` (Global Layout)

**File**: `src/routes/+layout.js`

| Endpoint              | Method | Description                              | Authentication Required |
| --------------------- | ------ | ---------------------------------------- | ----------------------- |
| `/dashboard/`         | GET    | Validate JWT token and get session data  | Yes                      |
| `VITE_SERVER_STATUS`  | GET    | Get server status (external endpoint)    | No                       |

**Components Using This Route**:

- `src/routes/+layout.svelte` - Global layout wrapper

---

### `/ballots` (Ballots Listing)

**File**: `src/routes/ballots/+page.js`

| Endpoint              | Method | Description                              | Query Parameters                                    |
| --------------------- | ------ | ---------------------------------------- | --------------------------------------------------- |
| `/ballots`             | GET    | Get paginated ballots list               | `voterType`, `status`, `search`, `page`, `limit` |
| `/ballots/voterTypes`  | GET    | Get available voter types for filtering  | None                                                |

**Components Using This Route**:

- `src/routes/ballots/+page.svelte` - Ballots listing page with filters

---

### `/ballots/[ballotId]` (Ballot Detail)

**File**: `src/routes/ballots/[ballotId]/+page.js`

| Endpoint              | Method | Description            | Parameters              |
| --------------------- | ------ | ---------------------- | ----------------------- |
| `/ballots/{ballotId}` | GET    | Get ballot details by ID | `ballotId` (route param) |

**Components Using This Route**:

- `src/routes/ballots/[ballotId]/+page.svelte` - Ballot detail page

**Components Also Using This Endpoint**:

- `src/lib/TransactionDetails.svelte` - Fetches ballot data for transaction details dialog
- `src/routes/ballots/[ballotId]/proposals/+page.js` - Fetches ballot data for proposals page
- `src/routes/ballots/[ballotId]/proposals/[proposalId]/+page.js` - Fetches ballot data for proposal detail
- `src/routes/ballots/[ballotId]/proposals/[proposalId]/results/+page.js` - Fetches ballot data for results page

---

### `/ballots/[ballotId]/proposals` (Proposals Listing)

**File**: `src/routes/ballots/[ballotId]/proposals/+page.js`

| Endpoint                           | Method | Description                              | Parameters                                                                                                                              |
| ---------------------------------- | ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/ballots/{ballotId}`              | GET    | Get ballot details                       | `ballotId` (route param)                                                                                                                              |
| `/ballots/{ballotId}/proposals`    | GET    | Get paginated proposals for ballot       | `ballotId` (route param), `search`, `tags`, `categories`, `sort`, `direction`, `hasVoted`, `thresholdReached`, `page`, `limit`                      |
| `/ballots/{ballotId}/tags`         | GET    | Get available tags for filtering         | `ballotId` (route param)                                                                                                                              |
| `/ballots/{ballotId}/categories`   | GET    | Get available categories for filtering   | `ballotId` (route param)                                                                                                                              |

**Components Using This Route**:

- `src/routes/ballots/[ballotId]/proposals/+page.svelte` - Proposals listing page with filters

---

### `/ballots/[ballotId]/proposals/[proposalId]` (Proposal Detail)

**File**: `src/routes/ballots/[ballotId]/proposals/[proposalId]/+page.js`

| Endpoint                                        | Method | Description         | Parameters                          |
| ----------------------------------------------- | ------ | ------------------- | ----------------------------------- |
| `/ballots/{ballotId}`                           | GET    | Get ballot details  | `ballotId` (route param)            |
| `/ballots/{ballotId}/proposals?search={proposalId}` | GET    | Get proposal by ID  | `ballotId`, `proposalId` (route params) |

**Components Using This Route**:

- `src/routes/ballots/[ballotId]/proposals/[proposalId]/+page.svelte` - Proposal detail page

**Components Also Using Proposal Endpoints**:

- `src/lib/ProposalVoteBudget.svelte` - Submits votes for budget proposals
- `src/lib/ProposalVoteDefault.svelte` - Submits votes for default proposals
- `src/lib/Comments.svelte` - Fetches and posts comments for proposals
- `src/lib/TransactionVotes.svelte` - Fetches proposal short data for transaction votes

---

### `/ballots/[ballotId]/proposals/[proposalId]/results` (Proposal Results)

**File**: `src/routes/ballots/[ballotId]/proposals/[proposalId]/results/+page.js`

| Endpoint                                        | Method | Description         | Parameters                          |
| ----------------------------------------------- | ------ | ------------------- | ----------------------------------- |
| `/ballots/{ballotId}`                           | GET    | Get ballot details  | `ballotId` (route param)            |
| `/ballots/{ballotId}/proposals?search={proposalId}` | GET    | Get proposal by ID  | `ballotId`, `proposalId` (route params) |

**Components Using This Route**:

- `src/routes/ballots/[ballotId]/proposals/[proposalId]/results/+page.svelte` - Proposal results page

---

### `/dashboard` (Private Dashboard)

**File**: `src/routes/(private)/dashboard/+page.js`

| Endpoint            | Method | Description                  | Authentication Required |
| ------------------- | ------ | ---------------------------- | ----------------------- |
| `/dashboard/`       | GET    | Get authenticated voter data | Yes                      |
| `/dashboard/ballots` | GET    | Get voter's ballots          | Yes                      |
| `/transactions`     | GET    | Get voter's transactions     | Yes                      |
| `/dashboard/pending` | GET    | Get voter's pending votes    | Yes                      |

**Components Using This Route**:

- `src/routes/(private)/dashboard/+page.svelte` - Dashboard page

**Components Also Using `/dashboard/` Endpoint**:

- `src/routes/+layout.js` - Validates JWT token on app load
- `src/lib/WalletSigner/WalletSigner.svelte` - Fetches voter data after login

---

### `/voter-directory` (Voter Directory)

**File**: `src/routes/voter-directory/+page.js`

| Endpoint  | Method | Description              | Query Parameters                      |
| --------- | ------ | ------------------------- | ------------------------------------- |
| `/voters`  | GET    | Get paginated voters list | `search`, `page`, `limit`, `sort`, `direction` |

**Components Using This Route**:

- `src/routes/voter-directory/+page.svelte` - Voter directory listing page

---

### `/voter-directory/[voterId]` (Voter Detail)

**File**: `src/routes/voter-directory/[voterId]/+page.js`

| Endpoint            | Method | Description            | Parameters              |
| ------------------- | ------ | ---------------------- | ----------------------- |
| `/voters/{voterId}`  | GET    | Get voter details by ID | `voterId` (route param) |

**Components Using This Route**:

- `src/routes/voter-directory/[voterId]/+page.svelte` - Voter detail page

---

## Component-Specific Endpoints

### Voting Components

#### `src/lib/ProposalVoteBudget.svelte`

| Endpoint              | Method | Description                    | Body                        |
| --------------------- | ------ | ------------------------------ | --------------------------- |
| `/vote/{proposalId}`  | POST   | Store vote for budget proposal | `{ vote: Array<optionId> }` |

#### `src/lib/ProposalVoteDefault.svelte`

| Endpoint              | Method | Description                      | Body                      |
| --------------------- | ------ | -------------------------------- | ------------------------- |
| `/vote/{proposalId}`  | POST   | Store vote for default proposal  | `{ vote: [optionId] }`    |

---

### Comments Component

#### `src/lib/Comments.svelte`

| Endpoint                        | Method | Description              | Parameters                                |
| ------------------------------- | ------ | ------------------------ | ----------------------------------------- |
| `/proposals/{proposalId}/comments` | GET    | Get comments for a proposal | `proposalId` (prop)                       |
| `/comment`                      | POST   | Post a new comment       | Body: `{ comment: string, proposalId: string }` |

---

### Transaction Components

#### `src/lib/TransactionDetails.svelte`

| Endpoint              | Method | Description                      | Parameters                        |
| --------------------- | ------ | -------------------------------- | --------------------------------- |
| `/ballots/{ballotId}` | GET    | Get ballot data for transaction  | `ballotId` (from transaction data) |

#### `src/lib/TransactionVotes.svelte`

| Endpoint                      | Method | Description            | Parameters                      |
| ----------------------------- | ------ | ---------------------- | ------------------------------- |
| `/proposals/{proposalId}/short` | GET    | Get short proposal data | `proposalId` (from vote data)   |

---

### Wallet Signer Components

#### `src/lib/WalletSigner/WalletSigner.js`

This file contains utility functions used by wallet signer components:

**`getPayload(requestUrl, signerAddress, signType, scriptAddress)`**

- **Endpoint**: Dynamic (passed as `requestUrl`)
- **Method**: POST
- **Body**: `{ signerAddress, signType, scriptAddress? }`
- **Used by**:
  - `src/lib/WalletSigner/SignerCS.svelte` - CardanoSigner flow
  - `src/lib/WalletSigner/SignerWallet.svelte` - Wallet connection flow

**`submitSignature(requestUrl, signerAddress, signType, signature, data, scriptAddress)`**

- **Endpoint**: Dynamic (passed as `requestUrl`)
- **Method**: PUT
- **Body**: `{ signerAddress, signature, signType, data, scriptAddress? }`
- **Used by**:
  - `src/lib/WalletSigner/SignerCS.svelte` - CardanoSigner flow
  - `src/lib/WalletSigner/SignerWallet.svelte` - Wallet connection flow

#### Wallet Signer Dynamic Endpoints

The wallet signer components use dynamic endpoints based on mode and ballot:

**Login Mode**:

- `/session` - POST (get payload) / PUT (submit signature)

**Vote Submission Mode**:

- `/dashboard/{ballotId}/checkout` - POST (get payload) / PUT (submit signature)
- `/dashboard/{ballotId}/checkout/multisig` - POST (get payload) / PUT (submit signature) [if multisig enabled]
- `/dashboard/{ballotId}/checkout/{transactionId}` - POST (get payload) / PUT (submit signature) [if transaction ID provided]
- `/dashboard/{ballotId}/checkout/multisig/{transactionId}` - POST (get payload) / PUT (submit signature) [if multisig + transaction ID]

**Components Using These Endpoints**:

- `src/lib/WalletSigner/WalletSigner.svelte` - Main wallet signer component
- `src/lib/WalletSigner/SignerCS.svelte` - CardanoSigner implementation
- `src/lib/WalletSigner/SignerWallet.svelte` - Wallet connection implementation

---

## Session Management Endpoints

### `src/stores/sessionManager.js`

| Endpoint   | Method | Description                      | Authentication Required |
| ---------- | ------ | -------------------------------- | ----------------------- |
| `/session` | DELETE | Logout and clear server-side session | Yes                      |

**Note**: The `api.fetch()` function in this file is a wrapper that:

- Automatically prepends `VITE_API_URL` to all endpoints
- Adds `Authorization: Bearer {token}` header when token is available
- Handles 401 errors by logging out the user
- Throws SvelteKit errors for non-2xx responses

---

## External/Static Endpoints

### `src/stores/versionStore.js`

| Endpoint        | Method | Description                      | Notes                                    |
| --------------- | ------ | -------------------------------- | ---------------------------------------- |
| `/version.json` | GET    | Get application version info     | Static file, cache-busted with timestamp |

---

## Summary by Endpoint

### Ballots

- `GET /ballots` - List ballots (with filters)
- `GET /ballots?status={status}` - List ballots by status
- `GET /ballots/voterTypes` - Get voter types
- `GET /ballots/{ballotId}` - Get ballot details
- `GET /ballots/{ballotId}/proposals` - List proposals for ballot
- `GET /ballots/{ballotId}/tags` - Get tags for ballot
- `GET /ballots/{ballotId}/categories` - Get categories for ballot

### Proposals

- `GET /ballots/{ballotId}/proposals?search={proposalId}` - Get proposal by ID
- `GET /proposals/{proposalId}/comments` - Get comments for proposal
- `GET /proposals/{proposalId}/short` - Get short proposal data
- `POST /vote/{proposalId}` - Store vote for proposal
- `POST /comment` - Post a comment

### Voters

- `GET /voters` - List voters (with filters)
- `GET /voters/{voterId}` - Get voter details

### Dashboard (Authenticated)

- `GET /dashboard/` - Get voter data / validate session
- `GET /dashboard/ballots` - Get voter's ballots
- `GET /dashboard/pending` - Get pending votes
- `POST /dashboard/{ballotId}/checkout` - Get payload for vote submission
- `PUT /dashboard/{ballotId}/checkout` - Submit signed votes
- `POST /dashboard/{ballotId}/checkout/multisig` - Get payload for multisig vote submission
- `PUT /dashboard/{ballotId}/checkout/multisig` - Submit multisig signed votes

### Transactions

- `GET /transactions` - Get voter's transactions

### Session

- `POST /session` - Get payload for login
- `PUT /session` - Submit signature for login
- `DELETE /session` - Logout

---

## Notes

1. **Authentication**: Most endpoints require authentication via Bearer token in the `Authorization` header. The token is managed by `sessionManager.js` and stored in cookies/localStorage.

2. **Error Handling**: All API calls through `api.fetch()` automatically handle:

   - 401 errors (token expired) - logs out user
   - 404 errors - throws SvelteKit error
   - Other non-2xx responses - throws SvelteKit error with server message

3. **Query Parameters**: Many endpoints support pagination (`page`, `limit`) and filtering parameters. See individual endpoint descriptions for details.

4. **Dynamic Endpoints**: Wallet signer components use dynamic endpoint construction based on:

   - Mode (login vs vote submission)
   - Ballot ID
   - MultiSig support
   - Transaction ID (for resubmissions)

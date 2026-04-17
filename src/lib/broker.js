import { api } from '$stores/sessionManager.js';
import { ballotDraftsForBroker } from '$lib/draftVotes.js';

// Convert a CIP-30 signData `signature` string (COSE_Sign1 hex) and `key`
// (COSE key hex) into the witness shape the backend broker expects.
//
// The backend derives `key` (blake2b_224 keyHash) and any raw-pubkey/raw-sig
// companions from `coseKeyHex` and `coseSign1Hex` server-side — the frontend
// ships only these two fields. See BACKEND_PREREQS.md §1.
export function toWitness(coseSign1Hex, coseKeyHex) {
	return { coseSign1Hex, coseKeyHex };
}

// UTF-8 hex encoding of the signing payload the voter is expected to sign.
// Per TRD §4.2 this is `Buffer.from(merkleRoot, "utf8").toString("hex")` —
// the voter signs the ASCII bytes of the 64-char merkleRoot hex string, NOT
// the raw bytes represented by that hex. Hydra verifies by comparing the
// signed COSE payload's ASCII against this exact string.
export function merkleRootPayloadHex(merkleRoot) {
	if (typeof merkleRoot !== 'string') {
		throw new Error('merkleRoot must be a string');
	}
	let out = '';
	for (let i = 0; i < merkleRoot.length; i++) {
		out += merkleRoot.charCodeAt(i).toString(16).padStart(2, '0');
	}
	return out;
}

// POST /v1/votes/:ballotId/draft — reserves a nonce + creates a VotePackage,
// returns the merkleRoot the caller must sign and the packageId to reference
// on the subsequent /signature call.
export async function postDraft(fetch, ballotId, body) {
	const res = await api.v1.fetch(fetch, '/votes/' + ballotId + '/draft', {
		method: 'POST',
		body: JSON.stringify(body)
	});
	return res.json();
}

// POST /v1/votes/:ballotId/signature — appends a witness. For key-based
// voters this triggers Hydra submission inline and returns the confirmation
// artifacts (hydraTxId, ipfsCid, confirmedAt). For multisig, `submitted` is
// false until the final cosigner's witness satisfies the threshold.
export async function postSignature(fetch, ballotId, packageId, witness) {
	const res = await api.v1.fetch(fetch, '/votes/' + ballotId + '/signature', {
		method: 'POST',
		body: JSON.stringify({ packageId, witness })
	});
	return res.json();
}

// POST /v1/votes/:ballotId/submit — idempotent manual retry for packages
// stuck in `awaiting-submission` (e.g. after a transient Hydra failure).
export async function postSubmit(fetch, ballotId, packageId) {
	const res = await api.v1.fetch(fetch, '/votes/' + ballotId + '/submit', {
		method: 'POST',
		body: JSON.stringify({ packageId })
	});
	return res.json();
}

// GET /v1/votes/:ballotId/package/:packageId — current package state. Used by
// the confirmation + retry surfaces.
export async function getPackage(fetch, ballotId, packageId) {
	const res = await api.v1.fetch(fetch, '/votes/' + ballotId + '/package/' + packageId);
	return res.json();
}

// GET /v1/votes/:ballotId/packages — list this user's packages on a ballot.
// Default returns only active states (draft / awaiting-signatures /
// awaiting-submission) so callers can cheaply check "is there something to
// resume / cosign?" on this ballot.
export async function listPackages(fetch, ballotId, { includeTerminal = false, limit } = {}) {
	const params = new URLSearchParams();
	if (includeTerminal) params.set('includeTerminal', 'true');
	if (limit) params.set('limit', String(limit));
	const qs = params.toString();
	const res = await api.v1.fetch(fetch, '/votes/' + ballotId + '/packages' + (qs ? '?' + qs : ''));
	const payload = await res.json();
	return payload?.data ?? [];
}

/**
 * Pull the current user's draft vote selections for a specific ballot from
 * the browser-local draft cache and shape them into the `votes[]` array
 * that `/v1/votes/:ballotId/draft` expects.
 *
 * Drafts are intentionally browser-local — the backend never sees a
 * selection until the voter signs a package, which keeps the DB from
 * growing with abandoned drafts. See `$lib/draftVotes.js`.
 */
export async function getPendingBallotVotes(_fetch, ballotId) {
	return ballotDraftsForBroker(ballotId);
}

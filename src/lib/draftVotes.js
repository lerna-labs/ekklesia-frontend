import { writable } from 'svelte/store';
import { user } from '$stores/sessionManager.js';
import { get } from 'svelte/store';

/**
 * Client-side draft-vote cache.
 *
 * Vote drafts are intentionally browser-local: the user is deciding,
 * not committing. Nothing hits the backend until the signed broker
 * submission. This avoids growing a Mongo collection with abandoned
 * drafts (cheap to generate stake keys would let a single actor
 * flood the DB trivially), and keeps the public read API honest —
 * third-party clients building on top of `/api/v1/proposals` don't
 * need to know about a "draft" state that only exists in one
 * browser.
 *
 * Storage shape (JSON):
 *   localStorage["ekklesia-drafts-<userId>"] = {
 *     [ballotId]: {
 *       [proposalId]: <vote-array>   // e.g. [1] / [1,3,5] / [42] / ["abstain"]
 *     }
 *   }
 *
 * Namespaced by userId so multiple wallets on the same browser don't
 * collide. Cleared for a ballot once the broker submission confirms.
 */

const STORAGE_PREFIX = 'ekklesia-drafts-';

// Reactive count of total draft proposals across all ballots for the
// current user. Components subscribe to show badges / "you have N
// pending" hints without having to re-read localStorage on every
// render.
export const draftCount = writable(0);

// Reactive snapshot of the whole draft tree for the current user.
// Components that want to react to draft changes (e.g. PendingVotes
// list on the dashboard) subscribe to this.
export const draftsTree = writable({});

function storageKey() {
	const u = get(user);
	const id = u?.userId;
	if (!id) return null;
	return STORAGE_PREFIX + id;
}

function readAll() {
	if (typeof localStorage === 'undefined') return {};
	const key = storageKey();
	if (!key) return {};
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function writeAll(tree) {
	if (typeof localStorage === 'undefined') return;
	const key = storageKey();
	if (!key) return;
	try {
		localStorage.setItem(key, JSON.stringify(tree));
	} catch {
		// ignore quota errors; drafts are ephemeral by design
	}
	draftsTree.set(tree);
	draftCount.set(
		Object.values(tree).reduce((sum, ballot) => sum + Object.keys(ballot ?? {}).length, 0)
	);
}

/** Seed the reactive stores from localStorage. Call once per login. */
export function hydrateDrafts() {
	const tree = readAll();
	draftsTree.set(tree);
	draftCount.set(
		Object.values(tree).reduce((sum, ballot) => sum + Object.keys(ballot ?? {}).length, 0)
	);
}

/** All drafts across every ballot for the current user. */
export function getAllDrafts() {
	return readAll();
}

/** `{proposalId: vote}` map for one ballot. */
export function getBallotDrafts(ballotId) {
	const tree = readAll();
	return tree[ballotId] ?? {};
}

/** The stored vote array for a specific proposal, or null. */
export function getProposalDraft(ballotId, proposalId) {
	const drafts = getBallotDrafts(ballotId);
	return drafts[proposalId] ?? null;
}

/**
 * Save a draft. Passing an empty array or null removes the draft.
 * Returns true if the draft changed from what was previously stored.
 */
export function saveProposalDraft(ballotId, proposalId, vote) {
	const tree = readAll();
	const prior = tree[ballotId]?.[proposalId] ?? null;
	const normalized = Array.isArray(vote) && vote.length > 0 ? vote : null;

	if (JSON.stringify(prior) === JSON.stringify(normalized)) return false;

	if (normalized == null) {
		if (tree[ballotId]) {
			delete tree[ballotId][proposalId];
			if (Object.keys(tree[ballotId]).length === 0) delete tree[ballotId];
		}
	} else {
		if (!tree[ballotId]) tree[ballotId] = {};
		tree[ballotId][proposalId] = normalized;
	}
	writeAll(tree);
	return true;
}

/** Remove one proposal's draft. */
export function clearProposalDraft(ballotId, proposalId) {
	return saveProposalDraft(ballotId, proposalId, null);
}

/** Remove every draft for this ballot. Called after broker confirmation. */
export function clearBallotDrafts(ballotId) {
	const tree = readAll();
	if (tree[ballotId]) {
		delete tree[ballotId];
		writeAll(tree);
	}
}

/**
 * Shape the current user's drafts for a ballot into the `votes[]`
 * array the broker's `/draft` endpoint expects.
 */
export function ballotDraftsForBroker(ballotId) {
	const drafts = getBallotDrafts(ballotId);
	return Object.entries(drafts).map(([proposalId, vote]) => ({
		questionId: String(proposalId),
		selection: vote
	}));
}

// Sync stores across browser tabs so a draft saved in tab A shows
// up in tab B's badge / pending list.
if (typeof window !== 'undefined') {
	window.addEventListener('storage', (ev) => {
		if (!ev.key || !ev.key.startsWith(STORAGE_PREFIX)) return;
		hydrateDrafts();
	});
}

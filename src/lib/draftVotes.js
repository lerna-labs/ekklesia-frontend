import { writable, get } from 'svelte/store';
import { user } from '$stores/sessionManager.js';
import { toWireSelection } from '$lib/voteSchema.js';

/**
 * Client-side draft-vote cache.
 *
 * Vote drafts are intentionally browser-local: the user is deciding,
 * not committing. Nothing hits the backend until the signed broker
 * submission. This avoids growing a Mongo collection with abandoned
 * drafts (cheap stake keys would let a single actor flood trivially)
 * and keeps the public read API honest — third-party clients don't
 * need to know about a "draft" state that only exists in one browser.
 *
 * Storage shape (JSON):
 *   localStorage["ekklesia-drafts-<userId>"] = {
 *     [ballotId]: {
 *       [proposalId]: { kind: 'selection', selection: number[] | SelectionEntry[] }
 *                   |  { kind: 'abstain' }
 *     }
 *   }
 *
 * Absence of a proposalId entry = unset / no signal. A proposalId with
 * `kind: 'selection'` ships as `{questionId, selection}` on the wire;
 * `kind: 'abstain'` ships as `{questionId, abstain: true}`. The three
 * states map 1:1 to the UI's voting / abstaining / cleared affordances.
 *
 * Namespaced by userId so multiple wallets on the same browser don't
 * collide. Cleared for a ballot once the broker submission confirms.
 */

const STORAGE_PREFIX = 'ekklesia-drafts-';

export const draftCount = writable(0);
export const draftsTree = writable({});

function storageKey() {
	const u = get(user);
	const id = u?.userId;
	if (!id) return null;
	return STORAGE_PREFIX + id;
}

function isV2Draft(value) {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
	if (value.kind === 'abstain') return true;
	if (value.kind === 'selection' && Array.isArray(value.selection)) return true;
	return false;
}

// Schema-v1 drafts were vote-arrays: [optionId], ['abstain'], [number], etc.
// Schema-v2 drafts are objects with a `kind` discriminator. Anything that
// doesn't match the new shape is wiped silently on first read — no
// migration contract, no production data to preserve.
function sanitize(tree) {
	if (!tree || typeof tree !== 'object') return { tree: {}, dirty: !!tree };
	const clean = {};
	let dirty = false;
	for (const [ballotId, drafts] of Object.entries(tree)) {
		if (!drafts || typeof drafts !== 'object') {
			dirty = true;
			continue;
		}
		const cleanProposals = {};
		for (const [proposalId, draft] of Object.entries(drafts)) {
			if (isV2Draft(draft)) cleanProposals[proposalId] = draft;
			else dirty = true;
		}
		if (Object.keys(cleanProposals).length > 0) clean[ballotId] = cleanProposals;
		else if (Object.keys(drafts).length > 0) dirty = true;
	}
	return { tree: clean, dirty };
}

function countDrafts(tree) {
	return Object.values(tree).reduce(
		(sum, ballot) => sum + Object.keys(ballot ?? {}).length,
		0
	);
}

function readAll() {
	if (typeof localStorage === 'undefined') return {};
	const key = storageKey();
	if (!key) return {};
	try {
		const raw = localStorage.getItem(key);
		const parsed = raw ? JSON.parse(raw) : {};
		const { tree, dirty } = sanitize(parsed);
		if (dirty) {
			try {
				localStorage.setItem(key, JSON.stringify(tree));
			} catch {
				// ignore
			}
		}
		return tree;
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
	draftCount.set(countDrafts(tree));
}

/** Seed the reactive stores from localStorage. Call once per login. */
export function hydrateDrafts() {
	const tree = readAll();
	draftsTree.set(tree);
	draftCount.set(countDrafts(tree));
}

/** All drafts across every ballot for the current user. */
export function getAllDrafts() {
	return readAll();
}

/** `{proposalId: draft}` map for one ballot. */
export function getBallotDrafts(ballotId) {
	const tree = readAll();
	return tree[ballotId] ?? {};
}

/**
 * The stored draft for a specific proposal, or null if unset.
 *
 * @returns {{kind:'selection',selection:any[]} | {kind:'abstain'} | null}
 */
export function getProposalDraft(ballotId, proposalId) {
	const drafts = getBallotDrafts(ballotId);
	return drafts[proposalId] ?? null;
}

/** True when the draft carries a non-empty selection. */
export function draftHasSelection(draft) {
	return !!draft && draft.kind === 'selection' && Array.isArray(draft.selection)
		&& draft.selection.length > 0;
}

/** True when the draft is explicitly abstaining. */
export function draftIsAbstaining(draft) {
	return !!draft && draft.kind === 'abstain';
}

/**
 * Persist a selection draft. Passing an empty array clears the draft.
 * Returns true if the stored value changed.
 */
export function saveProposalSelection(ballotId, proposalId, selection) {
	const normalized = Array.isArray(selection) && selection.length > 0
		? { kind: 'selection', selection }
		: null;
	return writeProposalDraft(ballotId, proposalId, normalized);
}

/**
 * Persist an abstain draft. Returns true if the stored value changed.
 */
export function saveProposalAbstain(ballotId, proposalId) {
	return writeProposalDraft(ballotId, proposalId, { kind: 'abstain' });
}

/** Remove the proposal's draft entirely. */
export function clearProposalDraft(ballotId, proposalId) {
	return writeProposalDraft(ballotId, proposalId, null);
}

function writeProposalDraft(ballotId, proposalId, draftOrNull) {
	const tree = readAll();
	const prior = tree[ballotId]?.[proposalId] ?? null;
	if (JSON.stringify(prior) === JSON.stringify(draftOrNull)) return false;

	if (draftOrNull == null) {
		if (tree[ballotId]) {
			delete tree[ballotId][proposalId];
			if (Object.keys(tree[ballotId]).length === 0) delete tree[ballotId];
		}
	} else {
		if (!tree[ballotId]) tree[ballotId] = {};
		tree[ballotId][proposalId] = draftOrNull;
	}
	writeAll(tree);
	return true;
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
 * Shape the current user's drafts for a ballot into the `votes[]` array
 * the broker's /draft endpoint expects — one entry per drafted proposal,
 * either `{questionId, selection}` or `{questionId, abstain: true}`.
 */
export function ballotDraftsForBroker(ballotId) {
	const drafts = getBallotDrafts(ballotId);
	return Object.entries(drafts).map(([proposalId, draft]) =>
		toWireSelection(String(proposalId), draft)
	);
}

// Sync stores across browser tabs so a draft saved in tab A shows up
// in tab B's badge / pending list.
if (typeof window !== 'undefined') {
	window.addEventListener('storage', (ev) => {
		if (!ev.key || !ev.key.startsWith(STORAGE_PREFIX)) return;
		hydrateDrafts();
	});
}

// Reactively track the current user so the in-memory draft stores
// follow login state. Without this, `draftCount` and `draftsTree`
// retain stale values from the previous session after logout until
// a manual refresh — the old "unsubmitted votes" badge visibly lingers
// on the header.
user.subscribe((u) => {
	if (!u) {
		draftsTree.set({});
		draftCount.set(0);
	} else {
		hydrateDrafts();
	}
});

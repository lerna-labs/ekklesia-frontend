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
 *                   |  { kind: 'cleared' }
 *     }
 *   }
 *
 * Wire mapping into the broker /draft payload:
 *   selection → { questionId, selection: [...] }
 *   abstain   → { questionId, abstain: true }
 *   cleared   → entry is OMITTED from the votes[] array entirely. Hydra
 *               then accepts the new package as canonical and removes
 *               the prior vote on that question — the explicit
 *               "remove my vote" intent.
 *
 * Why an explicit `cleared` sentinel rather than just deleting the
 * proposalId entry on Clear: the seeding pipeline (`seedBallotFromMine`)
 * fills in any proposalId that has no draft entry, copying the submitted
 * baseline so editing one of N votes doesn't drop the other N-1 from the
 * eventual broker package. Without the sentinel, "delete one entry" and
 * "no entry yet" are indistinguishable, so seeding undoes the voter's
 * explicit Clear on the next refresh.
 *
 * Namespaced by userId so multiple wallets on the same browser don't
 * collide. Cleared for a ballot once the broker submission confirms.
 */

const STORAGE_PREFIX = 'ekklesia-drafts-';
const SUBMITTED_PREFIX = 'ekklesia-submitted-';

// Local edit cache. Mutated by the vote forms; cleared on broker confirmation.
export const draftsTree = writable({});

// Snapshot of what `/v1/votes/:ballotId/mine` reported the last time the
// voter visited a ballot — the "submitted baseline". Drafts that deep-equal
// their baseline don't surface as unsubmitted changes, so a returning voter
// who edits one of N proposals only sees a single "pending change" rather
// than N. Seeded by `seedBallotFromMine()` on each ballot/proposal page load.
export const submittedTree = writable({});

// Number of drafts that diverge from the submitted baseline — the count that
// drives the global "unsubmitted votes" badge. A draft equal to its baseline
// is a no-op submission so it doesn't count; a draft with no baseline (a
// fresh first vote) does. Recomputed automatically when either store changes.
export const draftCount = writable(0);

function storageKey() {
  const u = get(user);
  const id = u?.userId;
  if (!id) return null;
  return STORAGE_PREFIX + id;
}

function submittedStorageKey() {
  const u = get(user);
  const id = u?.userId;
  if (!id) return null;
  return SUBMITTED_PREFIX + id;
}

function isV2Draft(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.kind === 'abstain') return true;
  if (value.kind === 'cleared') return true;
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

function entriesEqual(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

// Counts only drafts that diverge from their submitted baseline so the
// header badge stops nagging once a returning voter has reverted their
// edits — and so a freshly-rehydrated, untouched ballot doesn't read as
// "you have N drafts to submit" on every dashboard visit.
function countDivergent(drafts, submitted) {
  let n = 0;
  const ballotIds = new Set([...Object.keys(drafts ?? {}), ...Object.keys(submitted ?? {})]);
  for (const bid of ballotIds) {
    const d = drafts?.[bid] ?? {};
    const s = submitted?.[bid] ?? {};
    const proposalIds = new Set([...Object.keys(d), ...Object.keys(s)]);
    for (const pid of proposalIds) {
      if (!entriesEqual(d[pid] ?? null, s[pid] ?? null)) n += 1;
    }
  }
  return n;
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

function readAllSubmitted() {
  if (typeof localStorage === 'undefined') return {};
  const key = submittedStorageKey();
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    const { tree } = sanitize(parsed);
    return tree;
  } catch {
    return {};
  }
}

function refreshDivergentCount() {
  draftCount.set(countDivergent(get(draftsTree), get(submittedTree)));
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
  refreshDivergentCount();
}

function writeAllSubmitted(tree) {
  if (typeof localStorage === 'undefined') return;
  const key = submittedStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(tree));
  } catch {
    // ignore quota errors
  }
  submittedTree.set(tree);
  refreshDivergentCount();
}

/** Seed the reactive stores from localStorage. Call once per login. */
export function hydrateDrafts() {
  const tree = readAll();
  const submitted = readAllSubmitted();
  draftsTree.set(tree);
  submittedTree.set(submitted);
  refreshDivergentCount();
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
  return (
    !!draft &&
    draft.kind === 'selection' &&
    Array.isArray(draft.selection) &&
    draft.selection.length > 0
  );
}

/** True when the draft is explicitly abstaining. */
export function draftIsAbstaining(draft) {
  return !!draft && draft.kind === 'abstain';
}

/**
 * True when the draft is explicitly cleared — the voter wants to remove
 * their previously-submitted vote on this question. The broker package
 * omits the questionId entirely; Hydra treats the omission as "no vote".
 */
export function draftIsCleared(draft) {
  return !!draft && draft.kind === 'cleared';
}

/**
 * Persist a selection draft. Passing an empty array clears the draft.
 * Returns true if the stored value changed.
 */
export function saveProposalSelection(ballotId, proposalId, selection) {
  const normalized =
    Array.isArray(selection) && selection.length > 0 ? { kind: 'selection', selection } : null;
  return writeProposalDraft(ballotId, proposalId, normalized);
}

/**
 * Persist an abstain draft. Returns true if the stored value changed.
 */
export function saveProposalAbstain(ballotId, proposalId) {
  return writeProposalDraft(ballotId, proposalId, { kind: 'abstain' });
}

/**
 * Remove the proposal from the next broker package.
 *
 * Two cases:
 *   - No baseline (the voter has no prior submission for this proposal)
 *     → write null, dropping the entry. Same semantic as before.
 *   - Baseline exists → write a `cleared` sentinel so the seeding
 *     pipeline doesn't silently re-fill from the baseline on the next
 *     page load. Submitting will omit this question, removing the prior
 *     vote from Hydra.
 */
export function clearProposalDraft(ballotId, proposalId) {
  const baseline = readAllSubmitted()[ballotId]?.[proposalId];
  const next = baseline != null ? { kind: 'cleared' } : null;
  return writeProposalDraft(ballotId, proposalId, next);
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

/**
 * Remove every draft and submitted-baseline entry for this ballot. Called
 * after broker confirmation so the UI returns to a clean slate before the
 * next /mine fetch reseeds the baseline.
 */
export function clearBallotDrafts(ballotId) {
  const tree = readAll();
  if (tree[ballotId]) {
    delete tree[ballotId];
    writeAll(tree);
  }
  const sub = readAllSubmitted();
  if (sub[ballotId]) {
    delete sub[ballotId];
    writeAllSubmitted(sub);
  }
}

/**
 * Shape the current user's drafts for a ballot into the `votes[]` array
 * the broker's /draft endpoint expects — one entry per drafted proposal,
 * either `{questionId, selection}` or `{questionId, abstain: true}`.
 *
 * `cleared` drafts are dropped from the array entirely — the wire shape
 * for "remove my vote on this question" is the absence of an entry.
 * Hydra accepts the new package as canonical, so the prior vote is
 * wiped without our needing a dedicated remove signal.
 */
export function ballotDraftsForBroker(ballotId) {
  const drafts = getBallotDrafts(ballotId);
  return Object.entries(drafts)
    .filter(([, draft]) => draft.kind !== 'cleared')
    .map(([proposalId, draft]) => toWireSelection(String(proposalId), draft));
}

// ─── Submitted-baseline + divergence ────────────────────────────────────

/**
 * Convert a `voterVote` (the schema-v2 VoteSelection shape returned by
 * `mineToProposalAnnotations`) into a draft entry shape — `{ kind: 'abstain' }`
 * or `{ kind: 'selection', selection: [...] }`. Returns null on malformed
 * input so a junk entry doesn't pollute either store.
 */
function voterVoteToDraftEntry(v) {
  if (!v || typeof v !== 'object') return null;
  if (v.abstain === true) return { kind: 'abstain' };
  if (Array.isArray(v.selection) && v.selection.length > 0) {
    return { kind: 'selection', selection: v.selection };
  }
  return null;
}

/**
 * Build a `{ proposalId: draftEntry }` map from a `/mine` payload. Uses the
 * same in-flight > confirmed priority `mineToProposalAnnotations` applies so
 * the indicator and the baseline agree on which selection counts as "the
 * voter's most recent server-side state".
 */
function buildSubmittedFromMine(mine) {
  const out = {};
  if (!mine) return out;
  if (mine.confirmed?.votes) {
    for (const [pid, v] of Object.entries(mine.confirmed.votes)) {
      const entry = voterVoteToDraftEntry(v);
      if (entry) out[pid] = entry;
    }
  }
  for (const pkg of mine.inFlight || []) {
    for (const [pid, v] of Object.entries(pkg.votes || {})) {
      const entry = voterVoteToDraftEntry(v);
      if (entry) out[pid] = entry;
    }
  }
  return out;
}

/**
 * Persist the voter's `/mine` payload as the submitted baseline for this
 * ballot, and (if no local draft already exists for a given proposal) seed
 * the draft with the same value so the vote forms repopulate.
 *
 * Why seed drafts: Hydra accepts the latest package as canonical, so a
 * partial submission would functionally wipe earlier votes. Seeding ensures
 * the broker package always carries every prior selection unless the voter
 * actively cleared it.
 *
 * Existing local drafts are preserved (an in-progress edit always wins over
 * the server-side baseline).
 */
export function seedBallotFromMine(ballotId, mine) {
  if (!ballotId) return;
  // `loadMyBallotVotes` returns null on transient auth/network errors.
  // Treat that as "couldn't refresh" — preserve whatever baseline is
  // already cached so a flaky /mine call doesn't make every previously-
  // submitted vote suddenly look divergent.
  if (mine == null) return;
  const baseline = buildSubmittedFromMine(mine);

  const sub = readAllSubmitted();
  const priorSub = sub[ballotId] ?? {};
  if (JSON.stringify(priorSub) !== JSON.stringify(baseline)) {
    if (Object.keys(baseline).length === 0) delete sub[ballotId];
    else sub[ballotId] = baseline;
    writeAllSubmitted(sub);
  }

  const drafts = readAll();
  const existing = drafts[ballotId] ?? {};
  let dirty = false;
  for (const [pid, entry] of Object.entries(baseline)) {
    if (existing[pid] != null) continue;
    if (!drafts[ballotId]) drafts[ballotId] = {};
    drafts[ballotId][pid] = entry;
    dirty = true;
  }
  if (dirty) writeAll(drafts);
}

/** The submitted baseline for one (ballotId, proposalId), or null. */
export function getProposalBaseline(ballotId, proposalId) {
  const sub = readAllSubmitted();
  return sub[ballotId]?.[proposalId] ?? null;
}

/**
 * True when the local draft for (ballotId, proposalId) differs from the
 * submitted baseline — i.e. submitting now would actually change something
 * server-side. A draft against no baseline always counts as divergent
 * (it's a fresh first-time vote).
 */
export function isProposalDraftDivergent(ballotId, proposalId) {
  const draft = getProposalDraft(ballotId, proposalId);
  const baseline = getProposalBaseline(ballotId, proposalId);
  return !entriesEqual(draft, baseline);
}

/** Number of divergent drafts within a single ballot. */
export function divergentBallotChangeCount(ballotId) {
  const drafts = readAll()[ballotId] ?? {};
  const baseline = readAllSubmitted()[ballotId] ?? {};
  const ids = new Set([...Object.keys(drafts), ...Object.keys(baseline)]);
  let n = 0;
  for (const pid of ids) {
    if (!entriesEqual(drafts[pid] ?? null, baseline[pid] ?? null)) n += 1;
  }
  return n;
}

/**
 * Replace the proposal's draft with its submitted baseline. Used by the
 * "Revert to submitted" affordance. Returns true if anything changed.
 */
export function revertProposalDraftToBaseline(ballotId, proposalId) {
  const baseline = getProposalBaseline(ballotId, proposalId);
  return writeProposalDraft(ballotId, proposalId, baseline);
}

/**
 * Discard every unsubmitted edit on a ballot — for each drafted
 * proposal, restore the submitted baseline (or clear the draft if no
 * baseline). Used by the ballot-level "Discard changes" button.
 *
 * Distinct from `clearBallotDrafts`, which is the post-broker-confirm
 * cleanup that wipes BOTH the drafts and the baseline. Voters using the
 * sticky-footer button want to undo their unsubmitted edits, not lose
 * their cached server-side state.
 */
export function revertBallotDraftsToBaseline(ballotId) {
  const tree = readAll();
  const baseline = readAllSubmitted()[ballotId] ?? {};
  const drafts = tree[ballotId] ?? {};
  const ids = new Set([...Object.keys(drafts), ...Object.keys(baseline)]);

  let dirty = false;
  for (const pid of ids) {
    const desired = baseline[pid] ?? null;
    const current = drafts[pid] ?? null;
    if (entriesEqual(current, desired)) continue;
    if (desired == null) {
      if (drafts[pid] != null) {
        delete drafts[pid];
        dirty = true;
      }
    } else {
      drafts[pid] = desired;
      dirty = true;
    }
  }

  if (!dirty) return false;
  if (Object.keys(drafts).length === 0) delete tree[ballotId];
  else tree[ballotId] = drafts;
  writeAll(tree);
  return true;
}

// Sync stores across browser tabs so a draft saved in tab A shows up
// in tab B's badge / pending list. Both the drafts and the submitted
// baseline are kept in localStorage; either changing means our in-memory
// counters are out of date.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => {
    if (!ev.key) return;
    if (ev.key.startsWith(STORAGE_PREFIX) || ev.key.startsWith(SUBMITTED_PREFIX)) {
      hydrateDrafts();
    }
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
    submittedTree.set({});
    draftCount.set(0);
  } else {
    hydrateDrafts();
  }
});

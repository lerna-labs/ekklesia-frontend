/**
 * Schema v2 vocabulary for vote submissions + results.
 *
 * A single source of truth for:
 *   - the `method` values Hydra emits on QuestionTally and validates on /vote,
 *   - the legacy ekklesia `voteType` → Hydra `method` mapping,
 *   - the two error codes Hydra returns so the UI can branch voter-facing
 *     copy vs. ballot-authoring copy,
 *   - the `requireAnswer` → "abstain allowed" helper so every vote component
 *     reads from one place.
 *
 * See .claude/trds/FRONTEND_BALLOT_SCHEMA_V2.md and
 * .claude/trds/FRONTEND_VOTE_VALIDATION_DELTAS.md for the contract.
 */

/**
 * @typedef {'binary' | 'single-choice' | 'multi-choice' | 'range' | 'ranked' | 'weighted' | 'likert'} VoteMethod
 */

/**
 * @typedef {{ option: number, value: number }} SelectionEntry
 */

/**
 * A vote entry as it lives on the wire in POST /v1/votes/:id/draft.
 * `abstain` and `selection` are mutually exclusive.
 *
 * @typedef {{ questionId: string, abstain: true } | { questionId: string, selection: number[] | SelectionEntry[] }} VoteSelection
 */

/**
 * Hydra vote methods. Use this constant rather than bare string literals
 * when narrowing MethodTally or validating payload shape.
 */
export const VOTE_METHODS = Object.freeze({
  BINARY: 'binary',
  SINGLE_CHOICE: 'single-choice',
  MULTI_CHOICE: 'multi-choice',
  RANGE: 'range',
  RANKED: 'ranked',
  WEIGHTED: 'weighted',
  LIKERT: 'likert',
});

/**
 * Hydra 400 error codes. Surfaced by the backend broker and passed
 * through to the UI on /draft and /signature failures.
 */
export const ERROR_CODES = Object.freeze({
  // `/vote` and `/vote-and-register` — voter-facing ("please assign all
  // 100 points across options").
  INVALID_VOTE: 'INVALID_VOTE',
  // `/prepare` and `/prepare/update` — ballot authoring ("fix the step
  // grid"). Should not occur from a voter-side submission, but the
  // broker surfaces it for completeness.
  INVALID_INPUT: 'INVALID_INPUT',
  // `/draft` on a multisig package that already carries cosigner
  // signatures — the voter changed their selections after at least one
  // cosigner signed. Returned as 409; frontend offers cancel+redraft.
  PACKAGE_ALREADY_SIGNED: 'PACKAGE_ALREADY_SIGNED',
});

/**
 * The canonical schema-v2 method names, used to short-circuit
 * `methodForProposal` when the backend already emits an explicit method in
 * the `voteType` field (the migrated path).
 */
const V2_METHOD_VALUES = new Set(Object.values(VOTE_METHODS));

/**
 * Resolve the Hydra `method` a proposal's `voteType` maps onto.
 *
 * Schema-v2 ballots carry the explicit Hydra method directly in `voteType`
 * (e.g. `multi-choice`, `range`, `single-choice`) — those pass straight
 * through. Pre-v2 ballots carry a legacy ekklesia voteType that we map:
 *
 *   default     → binary (2 options) OR single-choice (n options).
 *                 Deprecated voteType kept for pre-v2 ballots.
 *   preference  → multi-choice (no cost-cap). Voter picks up to
 *                 voterBudget options.
 *   budget      → multi-choice (with cost-cap). Σ option.cost ≤ voterBudget.
 *                 Cost-cap enforced client-side for instant feedback;
 *                 backend is authoritative.
 *   scale       → range. Voter submits one integer on a min/max/step grid.
 *   ranked      → ranked. Voter orders exactly rankCount options.
 *   likert      → likert. Per-option rating on ratingRange grid, all or
 *                 abstain.
 *   weighted    → weighted. Point-allocation summing to voterBudget.
 *
 * NOTE: this MUST recognize the v2 method strings — `ProposalVote.svelte`
 * already routes `voteType: 'multi-choice'` / `'range'` to the right vote
 * component, so if this fell through to the legacy default a multi-choice
 * proposal would be gated as `single-choice` and reject any pick beyond one.
 *
 * @param {{ voteType?: string, voteOptions?: Array<unknown> }} proposal
 * @returns {VoteMethod}
 */
export function methodForProposal(proposal) {
  const type = String(proposal?.voteType ?? 'default').toLowerCase();
  // Migrated ballots already carry the explicit Hydra method.
  if (V2_METHOD_VALUES.has(type)) return /** @type {VoteMethod} */ (type);
  switch (type) {
    case 'preference':
    case 'budget':
      return VOTE_METHODS.MULTI_CHOICE;
    case 'scale':
      return VOTE_METHODS.RANGE;
    case 'ranked':
      return VOTE_METHODS.RANKED;
    case 'likert':
      return VOTE_METHODS.LIKERT;
    case 'weighted':
      return VOTE_METHODS.WEIGHTED;
    case 'default':
    default: {
      // Legacy: two-option ballots are binary; anything with more options
      // is single-choice. Both share the same wire shape (length-1
      // number[]) — the method label just drives results rendering.
      const count = Array.isArray(proposal?.voteOptions) ? proposal.voteOptions.length : 0;
      return count === 2 ? VOTE_METHODS.BINARY : VOTE_METHODS.SINGLE_CHOICE;
    }
  }
}

/**
 * Schema v2 inverts the previous `abstainAllowed` flag: the new
 * `requireAnswer` defaults to false, so a proposal without an explicit
 * opt-out allows abstention. Historical ballots still carrying the old
 * `abstainAllowed` field remain readable — absence of either flag means
 * abstain is allowed.
 *
 * @param {{ requireAnswer?: boolean, abstainAllowed?: boolean }} proposal
 * @returns {boolean}
 */
export function isAbstainAllowed(proposal) {
  if (!proposal) return true;
  if (proposal.requireAnswer === true) return false;
  // Defensive fallback: if a legacy ballot still carries abstainAllowed:
  // false and hasn't been re-prepared under schema v2, respect that.
  if (proposal.abstainAllowed === false) return false;
  return true;
}

/**
 * Build a wire-shape vote selection for a single proposal from the UI's
 * internal draft state. Used by the draft layer when shipping the payload
 * to /v1/votes/:ballotId/draft.
 *
 * @param {string} questionId
 * @param {{ kind: 'abstain' } | { kind: 'selection', selection: number[] | SelectionEntry[] }} draft
 * @returns {VoteSelection}
 */
export function toWireSelection(questionId, draft) {
  if (draft?.kind === 'abstain') {
    return { questionId, abstain: true };
  }
  return { questionId, selection: draft?.selection ?? [] };
}

/**
 * The number of ranked positions a Ranked proposal expects. Schema v2 carries
 * `rankCount` explicitly; pre-v2 ballots default to ranking every option.
 *
 * @param {{ rankCount?: number, voteOptions?: Array<unknown> }} proposal
 */
function rankCountOf(proposal) {
  const rc = Number(proposal?.rankCount);
  if (Number.isFinite(rc) && rc > 0) return rc;
  return Array.isArray(proposal?.voteOptions) ? proposal.voteOptions.length : 0;
}

/**
 * The min/max number of options a multi-choice (preference / budget) proposal
 * accepts. Schema v2 carries `minSelections` / `maxSelections`; legacy
 * `preference` ballots encoded the upper bound in `voterBudget`. A bare
 * `voterBudget` is NOT a reliable cap on schema-v2 `multi-choice` — the
 * backend emits a stray `voterBudget: 1` there — so prefer the explicit
 * fields and only fall back to `voterBudget` when `maxSelections` is absent.
 * A selection draft always needs at least one pick (the empty case is an
 * abstain / cleared draft, handled earlier).
 *
 * @param {{ minSelections?: number, maxSelections?: number, voterBudget?: number, voteOptions?: Array<unknown> }} proposal
 * @returns {{ min: number, max: number }}
 */
function selectionBoundsOf(proposal) {
  const optionCount = Array.isArray(proposal?.voteOptions) ? proposal.voteOptions.length : 0;
  const max =
    Number(proposal?.maxSelections) || Number(proposal?.voterBudget) || optionCount || Infinity;
  const min = Math.max(1, Number(proposal?.minSelections) || 0);
  return { min, max };
}

/**
 * True when the voter's draft for a proposal satisfies the per-method
 * completeness contract the broker enforces. Used by the ballot submit panel
 * to gate the Submit button so a partial Likert / Ranked / Weighted draft
 * can't reach the backend and come back as a cryptic INVALID_VOTE.
 *
 * Treats no-draft and abstain as complete (no-draft just isn't part of the
 * submission; abstain is a fully-formed answer).
 *
 * @param {object} proposal
 * @param {{ kind: 'abstain' } | { kind: 'selection', selection: any[] } | null | undefined} draft
 * @returns {boolean}
 */
export function draftIsComplete(proposal, draft) {
  if (!draft) return true;
  if (draft.kind === 'abstain') return true;
  // A `cleared` draft submits as an omitted question — Hydra accepts the
  // new package as canonical and removes the prior vote on that question.
  // That's a valid "remove my vote" signal when the proposal allows
  // abstention, but the broker rejects it on `requireAnswer: true`
  // proposals, so route those through the incomplete-drafts checklist
  // pre-submit instead of letting the voter hit a generic INVALID_VOTE.
  if (draft.kind === 'cleared') return isAbstainAllowed(proposal);
  if (draft.kind !== 'selection' || !Array.isArray(draft.selection)) return false;

  const sel = draft.selection;
  const method = methodForProposal(proposal);
  switch (method) {
    case VOTE_METHODS.BINARY:
    case VOTE_METHODS.SINGLE_CHOICE:
    case VOTE_METHODS.RANGE:
      return sel.length === 1;
    case VOTE_METHODS.MULTI_CHOICE: {
      // Preference / budget allow a range of picks — satisfy the
      // ballot's minSelections..maxSelections bounds.
      const { min, max } = selectionBoundsOf(proposal);
      return sel.length >= min && sel.length <= max;
    }
    case VOTE_METHODS.RANKED:
      return sel.length === rankCountOf(proposal);
    case VOTE_METHODS.WEIGHTED: {
      const budget = Number(proposal?.voterBudget) || 0;
      const total = sel.reduce((s, e) => s + (Number(e?.value) || 0), 0);
      return total === budget;
    }
    case VOTE_METHODS.LIKERT: {
      const optionCount = Array.isArray(proposal?.voteOptions) ? proposal.voteOptions.length : 0;
      return sel.length === optionCount;
    }
    default:
      return true;
  }
}

/**
 * Short human-readable reason a draft fails its method's completeness
 * contract, suitable for a per-proposal hint in the submit-panel checklist.
 * Returns null when the draft is complete (or isn't a selection draft at all).
 *
 * @param {object} proposal
 * @param {{ kind: 'abstain' } | { kind: 'selection', selection: any[] } | null | undefined} draft
 * @returns {string | null}
 */
export function incompleteDraftReason(proposal, draft) {
  if (draftIsComplete(proposal, draft)) return null;
  if (draft?.kind === 'cleared') return 'Cleared — this question requires an answer';
  if (!draft || draft.kind !== 'selection' || !Array.isArray(draft.selection)) return null;

  const sel = draft.selection;
  const method = methodForProposal(proposal);
  switch (method) {
    case VOTE_METHODS.MULTI_CHOICE: {
      const { min, max } = selectionBoundsOf(proposal);
      if (sel.length < min) return `Choose at least ${min}`;
      if (sel.length > max) return `Choose at most ${max}`;
      return null;
    }
    case VOTE_METHODS.RANKED: {
      const need = rankCountOf(proposal);
      return `Ranked ${sel.length} of ${need}`;
    }
    case VOTE_METHODS.WEIGHTED: {
      const budget = Number(proposal?.voterBudget) || 0;
      const total = sel.reduce((s, e) => s + (Number(e?.value) || 0), 0);
      if (total > budget) return `Over budget by ${total - budget}`;
      return `Allocated ${total} of ${budget}`;
    }
    case VOTE_METHODS.LIKERT: {
      const optionCount = Array.isArray(proposal?.voteOptions) ? proposal.voteOptions.length : 0;
      return `Rated ${sel.length} of ${optionCount} options`;
    }
    default:
      return null;
  }
}

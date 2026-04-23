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
	LIKERT: 'likert'
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
	PACKAGE_ALREADY_SIGNED: 'PACKAGE_ALREADY_SIGNED'
});

/**
 * Resolve the Hydra `method` a legacy ekklesia `voteType` maps onto. The
 * backend is moving toward emitting explicit methods; until every ballot
 * is migrated, existing voteTypes continue to flow through:
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
 * @param {{ voteType?: string, voteOptions?: Array<unknown> }} proposal
 * @returns {VoteMethod}
 */
export function methodForProposal(proposal) {
	const type = String(proposal?.voteType ?? 'default').toLowerCase();
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

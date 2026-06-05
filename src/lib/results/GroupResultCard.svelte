<script>
	import DiscreteGroupResult from './DiscreteGroupResult.svelte';
	import ScaleGroupResult from './ScaleGroupResult.svelte';
	import RankedGroupResult from './RankedGroupResult.svelte';
	import LikertGroupResult from './LikertGroupResult.svelte';
	import WeightedGroupResult from './WeightedGroupResult.svelte';
	import MethodTallyCard from './MethodTallyCard.svelte';
	import ParticipationGroupResult from './ParticipationGroupResult.svelte';

	/**
	 * Entry point for rendering per-voter-group results on a proposal.
	 *
	 * Two rendering paths:
	 *
	 *   - **Provisional** (`source !== 'final'` or no hydraResultsHash):
	 *     backend cron-computed per-voteType shapes (`group.results[]`,
	 *     `group.scale`, `group.ranked`) fan out to type-specific cards
	 *     (DiscreteGroupResult, ScaleGroupResult, RankedGroupResult).
	 *
	 *   - **Final** (`source === 'final' && hydraResultsHash`): Hydra's
	 *     discriminated-union MethodTally drives a method-specific
	 *     renderer via MethodTallyCard.
	 *
	 * Only the `Result` document emitted by Hydra's on-chain settle anchors
	 * a `resultsHash`, so the MethodTally path is the one whose numbers are
	 * verifiable against the chain. The provisional path is a live preview.
	 *
	 * When the ballot carries `resultsCalculationMode: 'participation'` AND
	 * the proposal is a discrete yes/no/abstain shape, the provisional
	 * renderer is swapped for ParticipationGroupResult, which reframes the
	 * denominator to include voters who participated in the ballot but
	 * skipped this proposal. The Hydra-final path is unaffected — the
	 * authority's certified tally is the source of truth for closed ballots.
	 */
	let { group, ballot, proposal, result } = $props();

	const isFinal = $derived(
		result?.source === 'final' && !!result?.hydraResultsHash
	);

	const voteType = $derived(String(proposal?.voteType ?? 'default').toLowerCase());

	// Discrete yes/no/abstain shapes that the participation reframing
	// applies to. Other vote types (ranked, scale, likert, weighted) have
	// their own denominator semantics that don't compose with "did not
	// vote on this proposal" — they fall through to standard rendering
	// even on a participation-mode ballot.
	const DISCRETE_TYPES = new Set([
		'default',
		'choice',
		'binary',
		'single-choice',
		'multi-choice'
	]);
	const participationMode = $derived(
		ballot?.resultsCalculationMode === 'participation' && DISCRETE_TYPES.has(voteType)
	);
</script>

{#if isFinal}
	<MethodTallyCard {group} {ballot} {proposal} {result} />
{:else if participationMode}
	<ParticipationGroupResult {group} {ballot} {proposal} />
{:else if voteType === 'scale' || voteType === 'range'}
	<ScaleGroupResult {group} {ballot} {proposal} {result} />
{:else if voteType === 'ranked'}
	<RankedGroupResult {group} {ballot} {proposal} {result} />
{:else if voteType === 'likert'}
	<LikertGroupResult {group} {ballot} {proposal} {result} />
{:else if voteType === 'weighted'}
	<WeightedGroupResult {group} {ballot} {proposal} {result} />
{:else}
	<!-- default / choice / binary / single-choice / preference / budget /
	     multi-choice — the discrete-option provisional renderer covers
	     the discrete-choice methods and branches internally for
	     budget-vs-preference. -->
	<DiscreteGroupResult {group} {ballot} {proposal} {result} />
{/if}

<script>
	import DiscreteGroupResult from './DiscreteGroupResult.svelte';
	import ScaleGroupResult from './ScaleGroupResult.svelte';
	import RankedGroupResult from './RankedGroupResult.svelte';

	/**
	 * Entry point for rendering per-voter-group results on a proposal.
	 * Dispatches on `proposal.voteType` so each vote type owns its own
	 * visualization strategy (donut for discrete choice, histogram for
	 * numeric scale, rank distribution for ranked choice, etc.) while
	 * sharing the GroupCardShell visual shell.
	 *
	 *   default    — Yes/No/Abstain style discrete choice
	 *   preference — multi-select / approval
	 *   budget     — distribute a cost budget across options
	 *   scale      — numeric range vote
	 *   ranked     — ranked-choice
	 */
	let { group, ballot, proposal, result } = $props();

	const voteType = $derived(String(proposal?.voteType ?? 'default').toLowerCase());
</script>

{#if voteType === 'scale'}
	<ScaleGroupResult {group} {ballot} {proposal} {result} />
{:else if voteType === 'ranked'}
	<RankedGroupResult {group} {ballot} {proposal} {result} />
{:else}
	<!-- default, preference, budget — discrete-option visualization -->
	<DiscreteGroupResult {group} {ballot} {proposal} {result} />
{/if}

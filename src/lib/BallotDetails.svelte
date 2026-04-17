<script>
	import { config } from '$stores/sessionManager.js';
	import { convertTimestamp } from '$lib/utils.js';
	import { ChevronDown } from 'lucide-svelte';

	// `collapsible` is opted into by the proposal detail page, where the
	// same fields are already shown on the listing a click away and eat
	// vertical space otherwise.
	let { ballot, collapsible = false } = $props();

	let open = $state(!collapsible);
</script>

{#if collapsible}
	<button
		type="button"
		class="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
		onclick={() => (open = !open)}
	>
		Ballot details
		<ChevronDown class="h-3 w-3 transition-transform {open ? 'rotate-180' : ''}" />
	</button>
{/if}

{#if open}
	<section class="text-xs *:mb-1" class:mt-1={collapsible}>
		<div><span class="font-semibold">Ballot ID:</span> {ballot._id}</div>
		{#if ballot.voterType}
			<div><span class="font-semibold">Voter Group:</span> {ballot.voterType}</div>
		{/if}

		{#if ballot.status == 'live'}
			<div>
				<span class="font-semibold">Voting ends on:</span>
				{convertTimestamp(ballot.votePeriodEnd)}
			</div>
		{/if}
		{#if ballot.status == 'closed'}
			<div>
				<span class="font-semibold">Voting ended on:</span>
				{convertTimestamp(ballot.votePeriodEnd)}
			</div>
		{/if}
		{#if ballot.status == 'upcoming'}
			<div>
				<span class="font-semibold">Voting starts on:</span>
				{convertTimestamp(ballot.votePeriodStart)}
			</div>

			<div>
				<span class="font-semibold">Voting ends on:</span>
				{convertTimestamp(ballot.votePeriodEnd)}
			</div>
		{/if}

		{#if ballot?.status == 'closed'}
			<div>
				<span class="font-semibold">On-Chain Results:</span>
				{#if ballot.resultTxHash}
					<a
						href={$config.explorerTxBase + ballot.resultTxHash}
						target="_blank"
						rel="noopener noreferrer"
						class="link inline-block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap align-bottom"
					>
						{ballot.resultTxHash}
					</a>
				{:else}
					Pending
				{/if}
			</div>
		{/if}
	</section>
{/if}

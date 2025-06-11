<script>
	let { ballot } = $props();
	import { loggedIn } from '$stores/sessionManager.js';
	import { convertTimestamp, lovelaceToAda } from '$lib/utils.js';
</script>

<section class="text-xs *:mb-1">
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
					href={'https://adastat.net/transactions/' + ballot.resultTxHash}
					target="_blank"
					class="link inline-block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap align-bottom"
				>
					{ballot.resultTxHash}
				</a>
			{:else}
				Pending
			{/if}
		</div>
	{/if}

	{#if $loggedIn && ballot.voteWeighted && ballot.status == 'live' && ballot.votingPower}
		<div>
			<span class="font-semibold">Your Voting Power:</span>
			{lovelaceToAda(ballot.votingPower)}
		</div>
	{/if}
</section>

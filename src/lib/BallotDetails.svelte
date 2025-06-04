<script>
	let { ballot } = $props();
	import { loggedIn } from '$stores/sessionManager.js';
	import { convertTimestamp, lovelaceToAda } from '$lib/utils.js';
</script>

<section class="mb-2 text-xs *:mb-1">
	<div><span class="font-semibold">Ballot ID:</span> {ballot._id}</div>
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
	{#if $loggedIn && ballot.voteWeighted}
		<div>
			<span class="font-semibold">Voting Power:</span>
			{lovelaceToAda(ballot.votingPower)}
		</div>
	{/if}
</section>

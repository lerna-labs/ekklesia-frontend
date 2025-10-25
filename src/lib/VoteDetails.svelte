<script>
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { lovelaceToAda, convertTimestamp } from '$lib/utils.js';
	let { proposal, ballot, showall = false } = $props();
	console.log(ballot);

	let hasThreshold = ballot.voteThreshold > 0;
	let hasWeight = ballot.voteWeighted;
	let totalVotes = $derived(proposal.voteCount);
	let resultsSorted = $state([]);

	if (ballot.voteWeighted) {
		// sort result by voting power descending
		resultsSorted = proposal.result?.results.sort((a, b) => b.votingPower - a.votingPower);
	}

	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;

	// const voteThresholdReached = $derived.by(() => {
	// 	// add yes and no votes
	// 	const yesVotesPower = results?.find((result) => result.label === 'Yes')?.votingPower || 0;
	// 	const noVotesPower = results?.find((result) => result.label === 'No')?.votingPower || 0;
	// 	const totalVotesPower = yesVotesPower + noVotesPower;

	// 	const reached = (yesVotesPower / totalVotesPower) * 100;
	// 	return reached > 50 ? true : false;
	// });

	// const voteThreshold = $derived.by(() => {
	// 	const yesVotesPower = results?.find((result) => result.label === 'Yes')?.votingPower || 0;
	// 	const noVotesPower = results?.find((result) => result.label === 'No')?.votingPower || 0;
	// 	const totalVotesPower = yesVotesPower + noVotesPower;

	// 	return (yesVotesPower / totalVotesPower) * 100;
	// });
</script>

<div class="max-h-100 space-y-2 p-1 pb-2 text-xs">
	<div class="flex justify-between">
		<span class="font-semibold">Total votes:</span>
		<span
			>{totalVotes}/{totalAllowedVoterCount} ({(
				(totalVotes / totalAllowedVoterCount) *
				100
			).toFixed(2)}%)
		</span>
	</div>

	{#if hasWeight}
		<div class="flex justify-between">
			<span class="font-semibold">Total voting power:</span>
			<span>{lovelaceToAda(proposal.votingPower)}</span>
		</div>

		<!-- {#if hasThreshold}
			<div class="flex justify-between">
				<span class="font-semibold">Vote threshold reached:</span>
				<span
					class={`rounded px-1 ${proposal.thresholdReached ? 'bg-green-400' : 'bg-red-400'} text-white`}
				>
					{voteThresholdReached ? 'Yes' : 'No'} ({voteThreshold.toFixed(2)}%)
				</span>
			</div>
		{/if} -->
	{/if}

	<div class="border-t pt-3">
		<h4 class="mb-2 text-[0.9rem] font-semibold">
			{#if resultsSorted.length > 10 && !showall}
				Results (Top 10)
			{:else}
				Results
			{/if}
		</h4>
		{#each showall ? resultsSorted : resultsSorted.slice(0, 10) as result}
			<div class="mb-4">
				<div class="flex justify-between">
					<span class="font-semibold">{result.label}:</span>
					<span class="text-nowrap font-semibold">
						{#if ballot.voteWeighted}
							{lovelaceToAda(result.votingPower)} ({(
								(result.votingPower / proposal.votingPower) *
								100
							).toFixed(1)}%)
						{:else}
							{result.count} ({((result.count / totalVotes) * 100).toFixed(1) || 0}%)
						{/if}
					</span>
				</div>

				{#if hasWeight}
					<div class="mt-1 flex justify-between text-muted-foreground">
						<span class="whitespace-nowrap font-semibold">
							{#if !ballot.voteWeighted}
								Voting Power:
							{:else}
								Total Votes:
							{/if}
						</span>
						<span class="text-right">
							{#if !ballot.voteWeighted}
								{lovelaceToAda(result.votingPower)} ({(
									(result.votingPower / proposal.votingPower) *
									100
								).toFixed(1)}%)
							{:else}
								{result.count} ({((result.count / totalVotes) * 100).toFixed(1) || 0}%)
							{/if}
						</span>
					</div>
				{/if}
			</div>
		{/each}
		{#if resultsSorted.length > 10 && !showall}
			<a
				href={'/ballots/' + ballot._id + '/proposals/' + proposal._id + '#results'}
				class="mt-0 text-xs font-medium text-orange-500 hover:text-orange-700">Show all Results</a
			>
		{/if}
	</div>
</div>
<div class="pl-1 text-xs text-muted-foreground">
	Updated {convertTimestamp(proposal.result?.updatedAt)}
</div>

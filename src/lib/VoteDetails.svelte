<script>
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { lovelaceToAda, convertTimestamp } from '$lib/utils.js';
	let { proposal, ballot } = $props();

	let hasThreshold = ballot.voteThreshold > 0;
	let hasWeight = ballot.voteWeighted;
	let results = $derived(proposal.result?.results);
	let totalVotes = $derived(proposal.voteCount);

	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;

	const totalVotingPowerVoted = $derived(
		results?.map((result) => result.votingPower).reduce((a, b) => a + b)
	);

	const voteThresholdReached = $derived.by(() => {
		// add yes and no votes
		const yesVotesPower = results?.find((result) => result.label === 'Yes')?.votingPower || 0;
		const noVotesPower = results?.find((result) => result.label === 'No')?.votingPower || 0;
		const totalVotesPower = yesVotesPower + noVotesPower;

		const reached = (yesVotesPower / totalVotesPower) * 100;
		return reached > 50 ? true : false;
	});

	const voteThreshold = $derived.by(() => {
		const yesVotesPower = results?.find((result) => result.label === 'Yes')?.votingPower || 0;
		const noVotesPower = results?.find((result) => result.label === 'No')?.votingPower || 0;
		const totalVotesPower = yesVotesPower + noVotesPower;

		return (yesVotesPower / totalVotesPower) * 100;
	});
</script>

<div class="space-y-2 p-1 pb-2 text-xs">
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
			<span>{lovelaceToAda(totalVotingPowerVoted)}</span>
		</div>

		{#if hasThreshold}
			<div class="flex justify-between">
				<span class="font-semibold">Vote threshold reached:</span>
				<span
					class={`rounded px-1 ${proposal.thresholdReached ? 'bg-green-400' : 'bg-red-400'} text-white`}
				>
					{voteThresholdReached ? 'Yes' : 'No'} ({voteThreshold.toFixed(2)}%)
				</span>
			</div>
		{/if}
	{/if}

	<div class="border-t pt-3">
		<h4 class="mb-2 text-[0.9rem] font-semibold">Results breakdown:</h4>
		{#each results as result}
			<div class="mb-4">
				<div class="flex justify-between">
					<span class="font-semibold">{result.label}:</span>
					<span class="text-nowrap font-semibold"
						>{result.count} ({((result.count / totalVotes) * 100).toFixed(1) || 0}%)</span
					>
				</div>

				{#if hasWeight}
					<div class="mt-1 flex justify-between text-muted-foreground">
						<span class="whitespace-nowrap font-semibold">Voting Power:</span>
						<span class="text-right"
							>{lovelaceToAda(result.votingPower)} ({(
								(result.votingPower / totalVotingPowerVoted) *
								100
							).toFixed(1)}%)</span
						>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
<div class="text-xs text-muted-foreground">
	Updated at {convertTimestamp(proposal.result?.updatedAt)}
</div>

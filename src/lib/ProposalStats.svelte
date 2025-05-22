<script>
	import { lovelaceToAda } from '$lib/utils.js';
	import * as Card from '$lib/components/ui/card/index.js';
	let { proposal, ballot } = $props();

	const totalVotingPower = ballot.totalVotingPower;
	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;
	const totalVotes = proposal.voteCount;
	const totalVotingPowerVoted = proposal?.results
		?.map((result) => result.votingPower)
		.reduce((a, b) => a + b);

	const voteThresholdReached = $derived.by(() => {
		// add yes and no votes
		const yesVotesPower =
			proposal?.results?.find((result) => result.label === 'Yes')?.votingPower || 0;
		const noVotesPower =
			proposal?.results?.find((result) => result.label === 'No')?.votingPower || 0;
		const totalVotesPower = yesVotesPower + noVotesPower;

		const reached = (yesVotesPower / totalVotesPower) * 100;
		return reached > 50 ? true : false;
	});
</script>

<section id="stats" class="h-full">
	<Card.Root class="h-full">
		<Card.Header>
			<Card.Title>
				{proposal.ballotStatus == 'live' ? 'Preliminary Results' : 'Final Results'}
			</Card.Title>
			<Card.Description>
				{proposal.ballotStatus == 'live'
					? 'Voting on this ballot is still ongoing, results are preliminary.'
					: 'Voting has ended, all results are final.'}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="text-xs">
				<div class="mb-4">
					<span class="font-semibold">Submitted Votes:</span>
					{totalVotes}/{totalAllowedVoterCount} ({(
						(totalVotes / totalAllowedVoterCount) *
						100
					).toFixed(2)}%)
				</div>

				<!-- <div class="mb-1">
					<span class="font-semibold">Total Voting Power:</span>
					{lovelaceToAda(totalVotingPower)}
				</div> -->

				<div class="mb-4">
					<span class="font-semibold">Voted:</span>
					{lovelaceToAda(totalVotingPowerVoted)}
					{#if totalVotingPowerVoted}({((totalVotingPowerVoted / totalVotingPower) * 100).toFixed(
							2
						) || 0}%){/if}
				</div>

				<div class={voteThresholdReached ? 'text-green-400' : 'text-red-400'}>
					<span class="font-semibold">Threshold reached: {voteThresholdReached}</span>
				</div>

				{#each proposal.results as result}
					<div class="mt-2">
						<div>
							<span class="font-semibold">{result.label} Votes:</span>
							{result.count} votes ({((result.count / proposal.totalVotes) * 100).toFixed(2) || 0}%)
						</div>
						<div>
							<span class="font-semibold">Voting Power:</span>
							{lovelaceToAda(result.votingPower)} ({(
								(result.votingPower / totalVotingPower) *
								100
							).toFixed(2)}%)
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</section>

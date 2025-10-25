<script>
	import BallotBadge from '$lib/BallotBadge.svelte';
	import ProposalDetails from '$lib/ProposalDetails.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { lovelaceToAda, convertTimestamp } from '$lib/utils.js';

	let { data } = $props();
	let { ballot, proposal } = data;
	let proposalData = proposal.data;
	let hasWeight = ballot.voteWeighted;
	let totalVotes = $derived(proposal.voteCount);

	let resultsSorted = $state([]);
	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;

	if (ballot.voteWeighted) {
		// sort result by voting power descending
		resultsSorted = proposal.result?.results.sort((a, b) => b.votingPower - a.votingPower);
	}
</script>

<div class="flex gap-2 text-xl">
	<h1 class="mb-1">{proposal.title}</h1>
	<BallotBadge status={ballot.status} />
</div>

<section class="text-sm text-muted-foreground">
	<ProposalDetails {proposal} {ballot} />
</section>

<Card.Root class="mb-8 mt-8 flex h-full flex-col">
	<Card.Header>
		<Card.Title class="mb-2 p-0 text-lg">
			{ballot.status == 'live' ? 'Preliminary Results' : 'Results'}
		</Card.Title>
	</Card.Header>
	<Card.Content class="flex-1 pt-1">
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
				<h4 class="mb-2 text-[0.9rem] font-semibold">Vote Breakdown</h4>
				{#each resultsSorted as result}
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
			</div>
		</div>
		<div class="pl-1 text-xs text-muted-foreground">
			Last updated {convertTimestamp(proposal.result?.updatedAt)}
		</div>
	</Card.Content>
</Card.Root>

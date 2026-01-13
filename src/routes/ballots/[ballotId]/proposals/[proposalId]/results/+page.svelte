<script>
	import BallotBadge from '$lib/BallotBadge.svelte';
	import ProposalDetails from '$lib/ProposalDetails.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { lovelaceToAda, convertTimestamp } from '$lib/utils.js';
	import DonutChart from '$lib/charts/DonutChart.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data } = $props();
	let { ballot, proposal } = data;
	let proposalData = proposal.data;
	let hasWeight = ballot.voteWeighted;
	let totalVotes = $derived(proposal.voteCount);

	let resultsSorted = $state([]);
	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;

	const activeVoterPerc = totalAllowedVoterCount
		? ((proposal.voteCount / totalAllowedVoterCount) * 100).toFixed(2)
		: '0.00';

	const activeVotingPowerPerc = ballot.totalVotingPower
		? ((proposal.votingPower / ballot.totalVotingPower) * 100).toFixed(2)
		: '0.00';

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

<section>
	<Button
		href={`/ballots/${ballot._id}/proposals/${proposal._id}`}
		variant="outline"
		size="sm"
		class="mt-4"
	>
		View Full Proposal
	</Button>
</section>

<section id="participation" class="mb-8 mt-8">
	<h2>Vote Statistics</h2>
	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root class="flex h-full flex-col">
			<Card.Header class="pt-4">
				<Card.Title class="mb-2  p-0 text-lg">Participation</Card.Title>
			</Card.Header>
			<Card.Content class="h-full pt-0 text-sm">
				<div class="mb-3">
					<div class="text-nowrap font-semibold">Active Voters</div>
					<div>{totalVotes}/{totalAllowedVoterCount} ({activeVoterPerc}%)</div>
				</div>

				{#if hasWeight}
					<div class="mb-3">
						<div class="text-nowrap font-semibold">Total Voting Power</div>
						<div>{lovelaceToAda(ballot.totalVotingPower)}</div>
					</div>

					<div>
						<div class="text-nowrap font-semibold">Active Voting Power</div>
						<div>{lovelaceToAda(proposal.votingPower)} ({activeVotingPowerPerc}%)</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="flex h-full flex-col">
			<Card.Header class="pt-4">
				<Card.Title class="mb-2 p-0 text-lg">Participation</Card.Title>
			</Card.Header>
			<Card.Content class="flex-1 pt-1 text-sm">
				<div class="mb-4 grid w-full grid-cols-2 gap-4">
					<DonutChart
						data={{
							labels: ['Active', 'Inactive'],
							datasets: [
								{
									data: [activeVoterPerc, (100 - activeVoterPerc).toFixed(2)],
									backgroundColor: ['#f97316', '#e5e7eb'],
									hoverBackgroundColor: ['#ea580c', '#d1d5db']
								}
							]
						}}
						title={'By Voter Count'}
					/>
					<DonutChart
						data={{
							labels: ['Active', 'Inactive'],
							datasets: [
								{
									data: [activeVotingPowerPerc, (100 - activeVotingPowerPerc).toFixed(2)],
									backgroundColor: ['#f97316', '#e5e7eb'],
									hoverBackgroundColor: ['#ea580c', '#d1d5db']
								}
							]
						}}
						title={'By Voting Power'}
					/>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</section>

{#if proposal.result}
	<section id="results" class="mt-8">
		<div class="flex items-end justify-between">
			<h2>
				{ballot.status == 'live' ? 'Preliminary Results' : 'Results'}
			</h2>
			{#if proposal.result?.updatedAt}
				<div class="mb-4 text-xs text-muted-foreground">
					Last Updated {convertTimestamp(proposal.result?.updatedAt)}
				</div>
			{/if}
		</div>
		<Card.Root class="mb-8 flex h-full flex-col">
			<Card.Header>
				<Card.Title class="mb-2 p-0 text-lg">Vote Breakdown</Card.Title>
			</Card.Header>
			<Card.Content class="flex-1 pb-2 pt-1 text-sm">
				<div class="border-t pt-3">
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
			</Card.Content>
		</Card.Root>
	</section>
{/if}

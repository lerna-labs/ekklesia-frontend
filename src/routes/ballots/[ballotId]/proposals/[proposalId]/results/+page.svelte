<script>
	import { onMount } from 'svelte';
	import BallotBadge from '$lib/BallotBadge.svelte';
	import ProposalDetails from '$lib/ProposalDetails.svelte';
	import ResultsStatus from '$lib/ResultsStatus.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { lovelaceToAda } from '$lib/utils.js';
	import DonutChart from '$lib/charts/DonutChart.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { fetchProposalResult, startResultsPoller } from '$lib/results.js';

	let { data } = $props();
	let { ballot, proposal, initialResult } = data;
	let hasWeight = ballot.voteWeighted;
	let totalVotes = $derived(proposal.voteCount);

	// Live-updating result. Seeded from the load fn, refreshed by the poller.
	let result = $state(initialResult);

	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;
	const activeVoterPerc = totalAllowedVoterCount
		? ((proposal.voteCount / totalAllowedVoterCount) * 100).toFixed(2)
		: '0.00';
	const activeVotingPowerPerc = ballot.totalVotingPower
		? ((proposal.votingPower / ballot.totalVotingPower) * 100).toFixed(2)
		: '0.00';

	// Sort the vote breakdown by voting power when the ballot is weighted.
	const resultsSorted = $derived.by(() => {
		const rows = result?.results ?? [];
		if (!hasWeight) return rows;
		return [...rows].sort((a, b) => b.votingPower - a.votingPower);
	});

	// Final results are authoritative; no need to keep polling once they land.
	onMount(() => {
		if (ballot.status === 'closed' && result?.source === 'final') return;
		return startResultsPoller(async () => {
			const next = await fetchProposalResult(fetch, proposal._id);
			if (next) result = next;
		});
	});
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

<section id="results" class="mt-8">
	<ResultsStatus {result} />

	{#if result && resultsSorted.length > 0}
		<Card.Root class="mb-8 flex h-full flex-col">
			<Card.Header>
				<Card.Title class="mb-2 p-0 text-lg">Vote Breakdown</Card.Title>
			</Card.Header>
			<Card.Content class="flex-1 pb-2 pt-1 text-sm">
				<div class="border-t pt-3">
					{#each resultsSorted as row}
						<div class="mb-4">
							<div class="flex justify-between">
								<span class="font-semibold">{row.label}:</span>
								<span class="text-nowrap font-semibold">
									{#if ballot.voteWeighted}
										{lovelaceToAda(row.votingPower)} ({(
											(row.votingPower / proposal.votingPower) *
											100
										).toFixed(1)}%)
									{:else}
										{row.count} ({((row.count / totalVotes) * 100).toFixed(1) || 0}%)
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
											{lovelaceToAda(row.votingPower)} ({(
												(row.votingPower / proposal.votingPower) *
												100
											).toFixed(1)}%)
										{:else}
											{row.count} ({((row.count / totalVotes) * 100).toFixed(1) || 0}%)
										{/if}
									</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{:else if !result}
		<p class="text-sm text-muted-foreground">
			No results available yet. They'll appear here once the first tally runs.
		</p>
	{/if}
</section>

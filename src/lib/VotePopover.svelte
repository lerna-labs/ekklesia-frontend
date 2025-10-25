<script>
	import * as Popover from '$lib/components/ui/popover/index.js';
	import DonutChart from '$lib/charts/DonutChart.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { lovelaceToAda, convertTimestamp } from '$lib/utils.js';
	let { proposal, ballot, outline = false } = $props();
	let totalVotes = $derived(proposal.voteCount);
	let hasWeight = ballot.voteWeighted;
	let resultsSorted = $state([]);
	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;

	const activeVoterPerc = totalAllowedVoterCount
		? ((proposal.voteCount / totalAllowedVoterCount) * 100).toFixed(2)
		: '0.00';

	const activeVotingPowerPerc = ballot.totalVotingPower
		? ((proposal.votingPower / ballot.totalVotingPower) * 100).toFixed(2)
		: '0.00';
</script>

<Popover.Root>
	<Popover.Trigger
		class={outline
			? buttonVariants({ size: 'sm', variant: 'outline' })
			: buttonVariants({ size: 'sm', variant: 'secondary' })}
		disabled={!totalVotes}
	>
		{totalVotes}
		{totalVotes > 1 || 0 ? 'Votes' : 'Vote'}
	</Popover.Trigger>
	<Popover.Content>
		<h1 class="text-sm font-semibold">Participation</h1>
		<div class="max-h-100 space-y-2 text-xs">
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

			<div class="flex justify-between">
				<span class="font-semibold">Active Voters:</span>
				<span>{totalVotes}/{totalAllowedVoterCount} ({activeVoterPerc}%) </span>
			</div>

			{#if hasWeight}
				<div class="flex justify-between">
					<span class="font-semibold">Total Voting Power:</span>
					<span>{lovelaceToAda(ballot.totalVotingPower)}</span>
				</div>

				<div class="flex justify-between">
					<span class="font-semibold">Active Voting Power:</span>
					<span>
						{lovelaceToAda(proposal.votingPower)}
						({activeVotingPowerPerc}%)
					</span>
				</div>
			{/if}

			<div class="pt-2">
				<Button
					href={'/ballots/' + ballot._id + '/proposals/' + proposal._id + '/results'}
					variant="primary"
					size="sm"
					class="m-auto w-full bg-orange-600 text-white"
				>
					View {ballot.status == 'live' ? 'Preliminary' : 'Final'} Results
				</Button>
			</div>
		</div>
		<div class="mt-2 pl-1 text-xs text-muted-foreground">
			Last Updated {convertTimestamp(proposal.result?.updatedAt)}
		</div>
	</Popover.Content>
</Popover.Root>

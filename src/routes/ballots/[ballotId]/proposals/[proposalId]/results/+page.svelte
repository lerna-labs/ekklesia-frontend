<script>
	import { tweened } from 'svelte/motion';
	import MedianScale from './../../../../../../lib/charts/MedianScale.svelte';
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

	const totalAllowedVoterCount = ballot.totalAllowedVoterCount;

	const activeVoterPerc = totalAllowedVoterCount
		? ((proposal.voteCount / totalAllowedVoterCount) * 100).toFixed(2)
		: '0.00';

	const activeVotingPowerPerc = ballot.totalVotingPower
		? ((proposal.votingPower / ballot.totalVotingPower) * 100).toFixed(2)
		: '0.00';

	// Voter group switching
	const resultsByGroup = proposal.result?.resultsByGroup ?? {};
	const groups = Object.keys(resultsByGroup);
	const hasGroups = groups.length > 0;
	let selectedGroup = $state('all');

	const activeResults = $derived.by(() => {
		if (selectedGroup === 'all' || !hasGroups) {
			return proposal.result?.results ?? [];
		}
		return resultsByGroup[selectedGroup]?.results ?? [];
	});

	const activeTotalVotes = $derived.by(() => {
		if (selectedGroup === 'all' || !hasGroups) return proposal.voteCount;
		return resultsByGroup[selectedGroup]?.totalVotes ?? 0;
	});

	const activeTotalVotingPower = $derived.by(() => {
		if (selectedGroup === 'all' || !hasGroups) return proposal.votingPower;
		return activeResults.reduce((sum, r) => sum + (r.votingPower ?? 0), 0);
	});

	const resultsSorted = $derived(
		[...activeResults].sort((a, b) => {
			if (ballot.voteWeighted) return b.votingPower - a.votingPower;
			return b.count - a.count;
		})
	);

	// Named colors for well-known vote options
	const RESULT_COLOR_MAP = {
		yes:     '#1e293b', // dark navy (header colour)
		no:      '#f97316', // brand orange
		abstain: '#e5e7eb', // light grey (same as participation inactive)
	};
	// Fallback palette for any additional options
	const RESULT_COLOR_FALLBACK = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

	function resultColor(label, fallbackIndex) {
		return RESULT_COLOR_MAP[label.toLowerCase()] ?? RESULT_COLOR_FALLBACK[fallbackIndex % RESULT_COLOR_FALLBACK.length];
	}

	const resultCountSegments = $derived(
		resultsSorted.map((r, i) => ({
			label: r.label,
			value: activeTotalVotes ? (r.count / activeTotalVotes) * 100 : 0,
			color: resultColor(r.label, i),
			count: r.count,
		}))
	);

	const resultPowerSegments = $derived(
		resultsSorted.map((r, i) => ({
			label: r.label,
			value: activeTotalVotingPower ? (r.votingPower / activeTotalVotingPower) * 100 : 0,
			color: resultColor(r.label, i),
			absoluteLabel: lovelaceToAda(r.votingPower),
		}))
	);

	// Tweened breakdown values for animation when voter group changes
	const targetBreakdown = $derived(
		resultsSorted.map((r) => ({
			votingPower: Number(r.votingPower) || 0,
			count: Number(r.count) || 0,
			pctPower: activeTotalVotingPower ? ((r.votingPower ?? 0) / activeTotalVotingPower) * 100 : 0,
			pctCount: activeTotalVotes ? ((r.count ?? 0) / activeTotalVotes) * 100 : 0
		}))
	);
	const breakdownTweenOpts = {
		duration: 400,
		easing: (t) => t * (2 - t),
		interpolate: (a, b) => (t) =>
			Array.from(
				{ length: Math.max(a.length, b.length) },
				(_, i) => {
					const pa = a[i] ?? { votingPower: 0, count: 0, pctPower: 0, pctCount: 0 };
					const pb = b[i] ?? { votingPower: 0, count: 0, pctPower: 0, pctCount: 0 };
					return {
						votingPower: pa.votingPower + t * (pb.votingPower - pa.votingPower),
						count: pa.count + t * (pb.count - pa.count),
						pctPower: pa.pctPower + t * (pb.pctPower - pa.pctPower),
						pctCount: pa.pctCount + t * (pb.pctCount - pa.pctCount)
					};
				}
			)
	};
	const tweenedBreakdown = tweened([], breakdownTweenOpts);
	$effect(() => {
		tweenedBreakdown.set(targetBreakdown, breakdownTweenOpts);
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
		<Card.Root class="order-2 flex h-full flex-col md:order-1">
			<Card.Header class="pt-4">
				<Card.Title class="mb-2  p-0 text-lg">Participation</Card.Title>
			</Card.Header>
			<Card.Content class="h-full pt-1 text-sm">
				<div class="border-t pt-3">
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
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="order-1 flex h-full flex-col md:order-2">
			<Card.Header class="pt-4">
				<Card.Title class="mb-2 p-0 text-lg">Participation</Card.Title>
			</Card.Header>
			<Card.Content class="flex-1 pb-2 pt-1 text-sm">
				<div class="border-t pt-3">
				<div class="mb-4 grid w-full grid-cols-2 gap-3">
					<DonutChart
						segments={[
							{ label: 'Active', value: Number(activeVotingPowerPerc), color: '#f97316', absoluteLabel: lovelaceToAda(proposal.votingPower) },
							{ label: 'Inactive', value: 100 - Number(activeVotingPowerPerc), color: '#e5e7eb', absoluteLabel: lovelaceToAda(ballot.totalVotingPower - proposal.votingPower) }
						]}
						title="By Voting Power"
					/>
					<DonutChart
						segments={[
							{ label: 'Active', value: Number(activeVoterPerc), color: '#f97316', count: totalVotes },
							{ label: 'Inactive', value: 100 - Number(activeVoterPerc), color: '#e5e7eb', count: totalAllowedVoterCount - totalVotes }
						]}
						title="By Voter Count"
						valueUnit="Voters"
					/>
				</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</section>

{#if proposal.result}
	<section id="results" class="mt-8 mb-16">
		<div class="mb-4">
			<div class="flex items-center justify-between">
				<h2 class="mb-0">{ballot.status == 'live' ? 'Preliminary Results' : 'Results'}</h2>
				{#if hasGroups}
					<div class="flex gap-1 rounded-md border p-0.5 text-xs">
						<button
							onclick={() => (selectedGroup = 'all')}
							class="rounded px-2 py-1 capitalize transition-colors {selectedGroup === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
						>All</button>
						{#each groups as group}
							<button
								onclick={() => (selectedGroup = group)}
								class="rounded px-2 py-1 capitalize transition-colors {selectedGroup === group ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
							>{group}</button>
						{/each}
					</div>
				{/if}
			</div>
			{#if proposal.result?.updatedAt}
				<p class="mt-1 text-xs text-muted-foreground">
					Last Updated {convertTimestamp(proposal.result?.updatedAt)}
				</p>
			{/if}
		</div>
		<div class="mb-8 grid gap-4 md:grid-cols-2">

		<Card.Root class="order-2 flex h-full flex-col md:order-1">
			<Card.Header class="pt-4">
				<Card.Title class="mb-2 p-0 text-lg">Vote Breakdown</Card.Title>
			</Card.Header>
			<Card.Content class="flex-1 pb-2 pt-1 text-sm">
				<div class="border-t pt-3">
					{#each resultsSorted as result, i}
						{@const d = $tweenedBreakdown[i] ?? targetBreakdown[i]}
						<div class="mb-4">
							<div class="flex justify-between">
								<span class="font-semibold">{result.label}:</span>
								<span class="text-nowrap font-semibold">
									{#if ballot.voteWeighted}
										{lovelaceToAda(d?.votingPower ?? result.votingPower)} ({(d?.pctPower ?? 0).toFixed(1)}%)
									{:else}
										{Math.round(d?.count ?? result.count)} ({(d?.pctCount ?? 0).toFixed(1)}%)
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
											{lovelaceToAda(d?.votingPower ?? result.votingPower)} ({(d?.pctPower ?? 0).toFixed(1)}%)
										{:else}
											{Math.round(d?.count ?? result.count)} ({(d?.pctCount ?? 0).toFixed(1)}%)
										{/if}
									</span>
								</div>
							{/if}
						</div>
					{/each}

				{#if proposal.voteType === 'scale'}
				<div class="mb-4">
					<div class="flex justify-between text-black font-semibold mb-2">
						<span class="whitespace-nowrap">
							Median by Voting Power:
						</span>
						<span class="text-right">
							{proposal.result.medianWeighted}
						</span>
					</div>

					<MedianScale lowerBound={proposal.voteOptions[0].id} upperBound={proposal.voteOptions[proposal.voteOptions.length - 1].id} median={proposal.result.medianWeighted} />
				</div>

				<div class="mb-4">
					<div class="flex justify-between text-black font-semibold mb-2">
						<span class="whitespace-nowrap">
							Median by Voters:
						</span>
						<span class="text-right">
							{proposal.result.median}
						</span>
					</div>			<MedianScale lowerBound={proposal.voteOptions[0].id} upperBound={proposal.voteOptions[proposal.voteOptions.length - 1].id} median={proposal.result.median} />
			</div>
				{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="order-1 flex h-full flex-col md:order-2">
			<Card.Header class="pt-4">
				<Card.Title class="mb-2 p-0 text-lg">Vote Results</Card.Title>
			</Card.Header>
			<Card.Content class="flex-1 pb-2 pt-1">
				<div class="border-t pt-3">
				<div class="mb-4 grid w-full grid-cols-2 gap-3">
					{#if hasWeight}
						<DonutChart
							segments={resultPowerSegments}
							title="By Voting Power"
						/>
					{/if}
					<DonutChart
						segments={resultCountSegments}
						title="By Vote Count"
						valueUnit="Votes"
					/>
				</div>
				</div>
			</Card.Content>
		</Card.Root>

		</div><!-- end results grid -->
	</section>
{/if}

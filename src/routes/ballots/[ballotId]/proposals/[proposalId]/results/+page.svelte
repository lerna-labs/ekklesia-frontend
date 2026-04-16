<script>
	import { onMount } from 'svelte';
	import BallotBadge from '$lib/BallotBadge.svelte';
	import ProposalDetails from '$lib/ProposalDetails.svelte';
	import ResultsStatus from '$lib/ResultsStatus.svelte';
	import GroupResultCard from '$lib/results/GroupResultCard.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { fetchProposalResult, startResultsPoller } from '$lib/results.js';

	let { data } = $props();
	let { ballot, proposal, initialResult } = data;
	let hasWeight = ballot.voteWeighted;

	// Live-updating result. Seeded from the load fn, refreshed by the poller.
	let result = $state(initialResult);

	// Canonical display names for the voter-group keys the backend emits.
	// Anything not listed here falls back to a simple capitalization so a
	// new group type still renders, just without the custom label.
	const GROUP_LABELS = {
		drep: 'DRep',
		pool: 'SPO',
		spo: 'SPO',
		stake: 'Stakeholder',
		stakeholder: 'Stakeholder',
		addr: 'Payment Address',
		default: 'Other'
	};

	function groupLabel(key) {
		const k = String(key || '').toLowerCase();
		return GROUP_LABELS[k] ?? key.charAt(0).toUpperCase() + key.slice(1);
	}

	const voteType = $derived(String(proposal?.voteType ?? 'default').toLowerCase());

	// Sum the active voting count + power for a group based on vote type:
	//   - discrete (default/preference/budget): sum `results[].votingPower`
	//   - scale: numeric voters live in `scale.histogram[]`; fold in abstain row
	//   - ranked: every voter appears once at rank-1 across rows; sum
	//     `ranked.rows[i].power[0]`; fold in abstain row
	function activeTotals(group, type) {
		const rows = Array.isArray(group?.results) ? group.results : [];
		let voters = 0;
		let power = 0;

		if (type === 'scale' && group?.scale) {
			for (const b of group.scale.histogram ?? []) {
				voters += b.count || 0;
				power += b.power || 0;
			}
			for (const r of rows) {
				if (r.id === 'abstain') {
					voters += r.count || 0;
					power += r.votingPower || 0;
				}
			}
		} else if (type === 'ranked' && group?.ranked) {
			for (const r of group.ranked.rows ?? []) {
				voters += r.counts?.[0] || 0;
				power += r.power?.[0] || 0;
			}
			for (const r of rows) {
				if (r.id === 'abstain') {
					voters += r.count || 0;
					power += r.votingPower || 0;
				}
			}
		} else {
			for (const r of rows) {
				voters += r.count || 0;
				power += r.votingPower || 0;
			}
		}

		return { voters, power };
	}

	const groups = $derived.by(() => {
		const raw = result?.resultsByGroup;
		if (!raw || typeof raw !== 'object') return [];
		const participation = result?.ballotParticipation ?? null;
		return Object.entries(raw).map(([key, group]) => {
			const rows = Array.isArray(group?.results) ? group.results : [];
			const sorted = hasWeight ? [...rows].sort((a, b) => b.votingPower - a.votingPower) : rows;
			const { voters: derivedVoters, power: activePower } = activeTotals(group, voteType);
			// `totalVotes` from the backend is reliable for discrete vote
			// types (includes abstainers). For ranked + scale it's not — the
			// cron `$unwind`s rank arrays / numeric values and over-counts.
			// Our derived count is correct for all types.
			const activeVoters =
				voteType === 'ranked' || voteType === 'scale'
					? derivedVoters
					: group.totalVotes ?? derivedVoters;
			const totalAllowedVoterCount =
				group.totalAllowedVoterCount ?? participation?.voterCount?.[key] ?? null;
			const totalVotingPower =
				group.totalVotingPower ?? participation?.totalVotingPower?.[key] ?? null;
			return {
				key,
				label: groupLabel(key),
				activeVoters,
				activePower,
				totalAllowedVoterCount,
				totalVotingPower,
				rows: sorted,
				scale: group.scale ?? null,
				ranked: group.ranked ?? null
			};
		});
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

<section id="results" class="mt-8">
	<ResultsStatus {result} />

	{#if !result}
		<p class="text-sm text-muted-foreground">
			No results available yet. They'll appear here once the first tally runs.
		</p>
	{:else if groups.length > 0}
		<div class="mb-8 space-y-4">
			<h3 class="text-lg">Results by voter group</h3>
			{#each groups as group}
				<GroupResultCard {group} {ballot} {proposal} {result} />
			{/each}
		</div>
	{/if}
</section>

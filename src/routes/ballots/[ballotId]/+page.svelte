<script>
	import Badge from '$lib/BallotBadge.svelte';
	import SourceBadge from '$lib/BallotSourceBadge.svelte';
	import BallotDetails from '$lib/BallotDetails.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { convertTimestamp } from '$lib/utils.js';
	import { loggedIn } from '$stores/sessionManager.js';
	import { CalendarClock, FileText, Vote } from 'lucide-svelte';

	let { data } = $props();
	let { ballot } = data;

	// Status-aware CTA label + variant so a live ballot actively invites
	// voting instead of hiding behind a neutral "View Proposals" link.
	const cta = $derived.by(() => {
		switch (ballot?.status) {
			case 'live':
				return { label: 'Vote on Proposals', variant: 'default', icon: Vote };
			case 'closed':
				return { label: 'View Results', variant: 'outline', icon: FileText };
			case 'upcoming':
			default:
				return { label: 'View Proposals', variant: 'outline', icon: FileText };
		}
	});
	const CtaIcon = $derived(cta.icon);

	const statusCopy = $derived.by(() => {
		if (!ballot) return '';
		if (ballot.status === 'live')
			return 'Voting is open. Pick a proposal to cast or update your vote.';
		if (ballot.status === 'upcoming')
			return 'Voting has not opened yet. You can review the proposals now.';
		if (ballot.status === 'closed')
			return 'Voting has closed. Results are final (or pending finalization on-chain).';
		return '';
	});
</script>

{#if ballot}
	<div class="flex flex-wrap items-start gap-2">
		<h1 class="text-3xl">{ballot.title}</h1>
		<Badge status={ballot.status} />
		<SourceBadge source={ballot.source} />
	</div>

	<BallotDetails {ballot} />

	{#if ballot.description}
		<p class="mb-4 mt-3">{ballot.description}</p>
	{/if}

	<div class="mt-4 rounded-md border border-slate-200 bg-slate-50/50 p-4 text-sm">
		<p class="mb-3 text-slate-700">{statusCopy}</p>

		<div class="mb-4 grid gap-1 text-xs text-muted-foreground">
			{#if ballot.status === 'live' && ballot.votePeriodEnd}
				<div class="inline-flex items-center gap-1">
					<CalendarClock class="h-3 w-3" aria-hidden="true" />
					Voting ends {convertTimestamp(ballot.votePeriodEnd)}
				</div>
			{:else if ballot.status === 'upcoming' && ballot.votePeriodStart}
				<div class="inline-flex items-center gap-1">
					<CalendarClock class="h-3 w-3" aria-hidden="true" />
					Voting opens {convertTimestamp(ballot.votePeriodStart)}
				</div>
			{/if}
			{#if ballot.proposalCount != null}
				<div class="inline-flex items-center gap-1">
					<FileText class="h-3 w-3" aria-hidden="true" />
					{ballot.proposalCount} proposal{ballot.proposalCount === 1 ? '' : 's'} in this ballot
				</div>
			{/if}
			{#if ballot.voterType}
				<div>Eligible voter groups: <span class="font-medium">{ballot.voterType}</span></div>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<Button
				href={'/ballots/' + ballot._id + '/proposals'}
				variant={cta.variant}
				class={cta.variant === 'default' ? 'bg-orange-600 text-white hover:bg-orange-700' : ''}
			>
				<CtaIcon class="h-4 w-4" aria-hidden="true" />
				{cta.label}
			</Button>
			{#if !$loggedIn && ballot.status === 'live'}
				<span class="text-xs text-muted-foreground">
					You'll need to connect your wallet to cast a vote.
				</span>
			{/if}
		</div>
	</div>
{:else}
	<p>Ballot not found.</p>
{/if}

<div class="mt-12"></div>

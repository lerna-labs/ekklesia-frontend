<script>
	import Badge from '$lib/BallotBadge.svelte';
	import SourceBadge from '$lib/BallotSourceBadge.svelte';
	import CertificationBadge from '$lib/CertificationBadge.svelte';
	import ProposalCard from '$lib/ProposalCard.svelte';
	import ProposalTable from '$lib/ProposalTable.svelte';
	import Pagination from '$lib/base/Pagination.svelte';
	import FacetControls from '$lib/FacetControls.svelte';
	import Search from '$lib/base/Search.svelte';
	import BallotDetails from '$lib/BallotDetails.svelte';
	import MarkdownBrief from '$lib/base/MarkdownBrief.svelte';
	import BallotCosignerPrompt from '$lib/BallotCosignerPrompt.svelte';
	import BallotProvenance from '$lib/BallotProvenance.svelte';
	import AuditMyVote from '$lib/AuditMyVote.svelte';
	import BallotEligibilityBanner from '$lib/BallotEligibilityBanner.svelte';
	import BrokerVoteFlow from '$lib/BrokerVoteFlow.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { CalendarClock, ShieldCheck, ShieldAlert } from 'lucide-svelte';
	import WalletMinimalIcon from '@lucide/svelte/icons/wallet-minimal';
	import { Button } from '$lib/components/ui/button/index.js';
	import { convertTimestamp } from '$lib/utils.js';
	import {
		acceptedCredentialsOf,
		credentialLabel,
		voterCredentialFromId
	} from '$lib/utils.js';
	import { loggedIn, user, showLogin } from '$stores/sessionManager.js';
	import { draftsTree, clearBallotDrafts } from '$lib/draftVotes.js';
	let view = $state('grid');

	let { data } = $props();
	// Derived (not $state) so after a mid-session login triggers
	// invalidateAll() + re-run of the loader, the re-fetched ballot —
	// including the now-present `voterValidated` — flows through into
	// every downstream $derived (eligibility shield, canSubmit, etc.).
	const ballot = $derived(data.ballot);

	// Count of this ballot's proposals the voter has drafted, for the
	// "3 of 5 drafted" progress hint on the header.
	const draftedCount = $derived(Object.keys($draftsTree?.[ballot._id] ?? {}).length);
	const totalProposals = $derived(data.pagination?.total ?? 0);

	// Submit CTA only surfaces when the ballot actually accepts submissions
	// (live + hydra-sourced per the project's no-write-CTAs-on-legacy rule)
	// and the voter has something drafted to submit.
	const canSubmit = $derived(
		$loggedIn &&
			ballot.status === 'live' &&
			ballot.source === 'hydra' &&
			draftedCount > 0
	);

	// Status-panel copy absorbed from the old /ballots/[ballotId] detail
	// page (which now redirects here). Keeps the useful bits —
	// voting-window dates and eligibility shield — in one canonical spot.
	const statusCopy = $derived.by(() => {
		if (!ballot) return '';
		// Live + logged in: let the eligibility shield speak for itself.
		// Live + logged out: a dedicated "Log in to vote" CTA renders
		// below the status line — no prose needed here.
		if (ballot.status === 'live') return '';
		if (ballot.status === 'upcoming')
			return 'Voting has not opened yet. You can review the proposals now.';
		if (ballot.status === 'closed') {
			if (ballot.certification?.certified) {
				return 'Voting has closed. Authority-certified results are available below.';
			}
			if (ballot.certification?.narrative?.url) {
				return 'Voting has closed. The voting authority has published a narrative endorsement.';
			}
			return 'Voting has closed. Provisional results are below — awaiting authority certification.';
		}
		return '';
	});

	const acceptedCredentials = $derived(acceptedCredentialsOf(ballot));
	const voterCredential = $derived(voterCredentialFromId($user?.voterId));
	const hasTypeMismatch = $derived(
		$loggedIn &&
			!!acceptedCredentials &&
			voterCredential != null &&
			!acceptedCredentials.includes(voterCredential)
	);
	const isEligible = $derived($loggedIn && !hasTypeMismatch && ballot?.voterValidated);
	// Fallback when we're logged in with a matching credential type but
	// the backend hasn't populated `voterValidated` (typical on closed
	// ballots — validation script isn't re-run for past voting windows).
	// Better than showing nothing on a hole in the positive-confirmation
	// branch.
	const credentialsMatchOnly = $derived(
		$loggedIn &&
			!hasTypeMismatch &&
			!isEligible &&
			ballot?.voterValidated !== false &&
			Array.isArray(acceptedCredentials) &&
			voterCredential != null &&
			acceptedCredentials.includes(voterCredential)
	);

	// "Undrafted first" toggle — floats proposals the voter hasn't drafted
	// yet to the top so they don't have to hunt through the list to find
	// remaining work. Stable within each group so author-declared ordering
	// is preserved within drafted and undrafted partitions. Default off to
	// respect the ballot's natural sequence (e.g. amendment order).
	let undraftedFirst = $state(false);
	const showUndraftedToggle = $derived(
		$loggedIn && ballot.status === 'live' && totalProposals > 1
	);
	const sortedProposals = $derived.by(() => {
		const list = data.proposals ?? [];
		if (!undraftedFirst) return list;
		const ballotDrafts = $draftsTree?.[ballot._id] ?? {};
		const hasDraft = (p) => !!ballotDrafts[p._id];
		// Stable sort: undrafted stays in order, drafted stays in order,
		// drafted all move to the bottom.
		return [...list].sort((a, b) => {
			const ad = hasDraft(a);
			const bd = hasDraft(b);
			if (ad === bd) return 0;
			return ad ? 1 : -1;
		});
	});
</script>

<h1 class="text-3xl">{ballot.title}</h1>
<div class="mb-3 mt-2 flex flex-wrap items-center gap-2">
	<Badge status={ballot.status} />
	<SourceBadge source={ballot.source} />
	<CertificationBadge certification={ballot.certification} ballotStatus={ballot.status} />
</div>
<BallotDetails {ballot} class="mt-2" />

{#if ballot.description}
	<MarkdownBrief
		markdown={ballot.description}
		class="mt-3 text-muted-foreground"
	/>
{/if}

<div class="mt-4 rounded-md border border-slate-200 bg-slate-50/50 p-4 text-sm">
	{#if statusCopy}
		<p class="mb-2 text-slate-700">{statusCopy}</p>
	{/if}

	<div class="grid gap-1 text-xs text-muted-foreground">
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
		{:else if ballot.status === 'closed' && ballot.votePeriodEnd}
			<div class="inline-flex items-center gap-1">
				<CalendarClock class="h-3 w-3" aria-hidden="true" />
				Voting ended {convertTimestamp(ballot.votePeriodEnd)}
			</div>
		{/if}

		{#if $loggedIn}
			{#if isEligible}
				<div class="inline-flex items-center gap-1 text-emerald-700">
					<ShieldCheck class="h-3 w-3" aria-hidden="true" />
					You are eligible to vote on this ballot
				</div>
			{:else if hasTypeMismatch}
				<div class="inline-flex items-center gap-1 text-amber-700">
					<ShieldAlert class="h-3 w-3" aria-hidden="true" />
					Your credential ({credentialLabel(voterCredential)}) is not accepted — this ballot
					requires {acceptedCredentials.map(credentialLabel).join(' or ')}
				</div>
			{:else if ballot.voterValidated === false}
				<div class="inline-flex items-center gap-1 text-amber-700">
					<ShieldAlert class="h-3 w-3" aria-hidden="true" />
					You don't meet this ballot's voter eligibility requirements
				</div>
			{:else if credentialsMatchOnly}
				<div class="inline-flex items-center gap-1 text-slate-600">
					<ShieldCheck class="h-3 w-3" aria-hidden="true" />
					Your credentials match this ballot's accepted types
				</div>
			{/if}
		{/if}
	</div>

	{#if !$loggedIn && ballot.status === 'live'}
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<Button
				size="sm"
				class="bg-orange-600 text-white hover:bg-orange-700"
				onclick={() => showLogin.set(true)}
			>
				<WalletMinimalIcon class="h-4 w-4" aria-hidden="true" />
				Log in to vote
			</Button>
			<span class="text-xs text-muted-foreground">
				Connect a wallet to check your eligibility and cast a vote.
			</span>
		</div>
	{/if}
</div>

<BallotEligibilityBanner {ballot} />
<BallotCosignerPrompt {ballot} />
<BallotProvenance {ballot} />
<AuditMyVote {ballot} />

<section class="mt-6">
	<header class="mb-4">
		<h2 class="mb-3">Proposals ({data.pagination.total})</h2>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
			<div class="min-w-0 max-w-xs flex-1">
				<Search />
			</div>
			<div class="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
				{#if showUndraftedToggle}
					<label
						class="inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-muted-foreground"
						title="Float proposals you haven't voted on yet to the top of the list."
					>
						<Switch bind:checked={undraftedFirst} id="undraftedFirst" />
						<Label for="undraftedFirst" class="cursor-pointer">Not voted first</Label>
					</label>
				{/if}
				<FacetControls facets={ballot.facets} applied={data.applied} />
			</div>
		</div>
	</header>

	{#if data.proposals.length > 0}
		{#if view == 'grid'}
			{#each sortedProposals as proposal (proposal._id)}
				<ProposalCard {ballot} {proposal} />
			{/each}
		{/if}

		{#if view == 'list'}
			<ProposalTable {ballot} proposalList={sortedProposals} />
		{/if}
	{:else}
		<p>No proposals found.</p>
	{/if}
</section>

{#if data.pagination.total > data.perPage}
	<div class="mt-4 flex justify-center">
		<Pagination
			count={data.pagination.total}
			perPage={data.perPage}
			currentPage={data.currentPage}
			{...data.pagination}
		/>
	</div>
{/if}

<div class="mt-12"></div>

{#if canSubmit}
	<!-- Sticky (not fixed) so it sits within main's flow and the page
	     Footer (version number, etc.) stays visible when the user scrolls
	     all the way down — the submission bar detaches at the bottom of
	     its containing block instead of covering the Footer. -->
	<div
		class="sticky bottom-0 z-40 -mx-4 border-t-2 border-orange-500 bg-white/95 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.12)] backdrop-blur"
		role="region"
		aria-label="Ballot submission"
	>
		<div
			class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3"
		>
			<div class="min-w-0 flex-1 text-sm">
				<div class="font-semibold text-slate-900">
					You've voted on {draftedCount} of {totalProposals} proposal{totalProposals === 1
						? ''
						: 's'} on this ballot
				</div>
				<p class="mt-0.5 text-xs text-muted-foreground">
					{#if draftedCount < totalProposals}
						Proposals you haven't voted on will be excluded from your submission. Vote on the rest or submit what you have.
					{:else}
						You've voted on every proposal. Submit to sign your ballot and commit it to the Hydra voting head.
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					class="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-slate-100 hover:text-red-700"
					onclick={() => {
						if (
							confirm(
								'Clear all your unsubmitted votes on this ballot? Any vote you previously submitted will still be your recorded vote.'
							)
						) {
							clearBallotDrafts(ballot._id);
						}
					}}
					title="Remove every unsubmitted vote on this ballot. Previously submitted votes are unaffected."
				>
					Clear votes
				</button>
				<BrokerVoteFlow {ballot} buttonText="Submit Votes" />
			</div>
		</div>
	</div>
{/if}

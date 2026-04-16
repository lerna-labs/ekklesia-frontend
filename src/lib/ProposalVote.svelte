<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { loggedIn, user, showLogin } from '$stores/sessionManager';
	import { onMount } from 'svelte';
	import ProposalVoteDefault from './ProposalVoteDefault.svelte';
	import ProposalVoteBudget from './ProposalVoteBudget.svelte';
	import ProposalVoteScale from './ProposalVoteScale.svelte';
	import ProposalVoteRanked from './ProposalVoteRanked.svelte';
	import { Archive, UserX, TriangleAlert } from 'lucide-svelte';
	import WalletMinimalIcon from '@lucide/svelte/icons/wallet-minimal';
	import {
		acceptedCredentialsOf,
		credentialLabel,
		voterCredentialFromId
	} from '$lib/utils.js';

	let loading = $state(true);
	// Props for required data
	// TODO remove inline if not used
	let { proposal, ballot, inline } = $props();

	// Legacy ballots are read-only archives — the backend 410s all v0
	// write endpoints, so never surface a vote CTA for them.
	const isLegacy = $derived(ballot?.source === 'legacy');

	// Type-level eligibility gate — cheap, frontend-only. Compares the
	// authenticated voter's credential kind (derived from their userId /
	// bech32 prefix) against the ballot's accepted credential list. When
	// the ballot doesn't declare accepted credentials (legacy or older
	// data), we skip this gate and let the snapshot-level
	// `ballot.voterValidated` check run as before.
	const acceptedCredentials = $derived(acceptedCredentialsOf(ballot));
	const voterCredential = $derived(voterCredentialFromId($user?.voterId));
	const hasTypeMismatch = $derived(
		$loggedIn &&
			!!acceptedCredentials &&
			voterCredential != null &&
			!acceptedCredentials.includes(voterCredential)
	);

	// Snapshot-level ineligibility: logged in, credential type matches
	// (or the ballot doesn't gate by type), but the authoritative
	// UserCache check rejects this voter for this specific ballot.
	const hasSnapshotIneligibility = $derived(
		$loggedIn && !hasTypeMismatch && !ballot?.voterValidated
	);

	// Composite "show the form but lock it" flag. When true, we render
	// the normal Default / Budget vote forms with their interactive
	// bits disabled, and pair them with an explanation banner so the
	// voter (or potential voter) can see what the options are without
	// being able to pick.
	const locked = $derived(!$loggedIn || hasTypeMismatch || hasSnapshotIneligibility);

	onMount(async () => {
		loading = false;
	});
</script>

<section id="vote" class="mt-6">
	{#if isLegacy}
		<Card.Root class="h-full border-slate-300 bg-slate-100 text-slate-700">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-slate-800">
					<Archive class="h-5 w-5" />
					Archived ballot
				</Card.Title>
				<Card.Description class="pb-5 text-slate-700">
					This ballot is a read-only archive. Voting has ended and results are final.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else if ballot.status != 'live'}
		<Card.Root class="h-full">
			<Card.Header>
				<Card.Title>Voting is closed</Card.Title>
				<Card.Description class="pb-5">The voting for this proposal has ended.</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		{#if !$loggedIn}
			<!-- Logged-out: prominent, brand-accented call to connect a wallet.
			     Clicking "Connect Wallet" pops the global WalletSigner dialog
			     via the showLogin store. -->
			<div
				class="mb-3 flex flex-col items-start gap-3 rounded-md border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-white p-4 text-sm shadow-sm sm:flex-row sm:items-center"
			>
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white"
				>
					<WalletMinimalIcon class="h-5 w-5" aria-hidden="true" />
				</div>
				<div class="flex-1">
					<div class="text-base font-semibold text-slate-900">Connect a wallet to vote</div>
					<p class="mt-0.5 text-xs text-slate-600">
						The options below are a preview. You need to sign in with an eligible
						wallet to cast your vote.
					</p>
				</div>
				<Button
					size="sm"
					class="bg-orange-600 text-white hover:bg-orange-700"
					onclick={() => showLogin.set(true)}
				>
					<WalletMinimalIcon class="h-4 w-4" aria-hidden="true" />
					Connect Wallet
				</Button>
			</div>
		{:else if hasTypeMismatch || hasSnapshotIneligibility}
			<div
				class="mb-3 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
			>
				<div class="mt-0.5 shrink-0">
					{#if hasTypeMismatch}
						<UserX class="h-5 w-5" />
					{:else}
						<TriangleAlert class="h-5 w-5" />
					{/if}
				</div>
				<div class="flex-1">
					<div class="font-semibold">
						{hasTypeMismatch ? 'Wrong credential type' : 'Not in the voter snapshot'}
					</div>
					<p class="mt-1">
						{#if hasTypeMismatch}
							This ballot accepts
							{#each acceptedCredentials as k, i}
								<span class="font-semibold">{credentialLabel(k)}</span>{#if i < acceptedCredentials.length - 2},
								{:else if i === acceptedCredentials.length - 2}
									&nbsp;and
								{/if}
							{/each}
							credentials only. You're logged in as
							<span class="font-semibold">{credentialLabel(voterCredential)}</span>, so
							the options below are read-only — reconnect with an eligible wallet
							identity to cast a vote.
						{:else}
							You're logged in, but this ballot's snapshot doesn't include your
							{credentialLabel(voterCredential)} identity at registration time. The
							options below are read-only for your reference; contact support if you
							believe this is wrong.
						{/if}
					</p>
				</div>
			</div>
		{/if}

		{#if proposal.voteType === 'default'}
			<ProposalVoteDefault {proposal} {ballot} disabled={locked} />
		{:else if proposal.voteType === 'budget' || proposal.voteType === 'preference'}
			<ProposalVoteBudget {proposal} {ballot} disabled={locked} />
		{:else if proposal.voteType === 'scale'}
			<ProposalVoteScale {proposal} {ballot} disabled={locked} />
		{:else if proposal.voteType === 'ranked'}
			<ProposalVoteRanked {proposal} {ballot} disabled={locked} />
		{/if}
	{/if}
</section>

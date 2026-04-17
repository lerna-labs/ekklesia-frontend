<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { loggedIn, user, showLogin } from '$stores/sessionManager';
	import { onMount } from 'svelte';
	import ProposalVoteDefault from './ProposalVoteDefault.svelte';
	import ProposalVoteBudget from './ProposalVoteBudget.svelte';
	import ProposalVoteScale from './ProposalVoteScale.svelte';
	import ProposalVoteRanked from './ProposalVoteRanked.svelte';
	import { Archive, Clock, UserX, TriangleAlert } from 'lucide-svelte';
	import WalletMinimalIcon from '@lucide/svelte/icons/wallet-minimal';
	import {
		acceptedCredentialsOf,
		credentialLabel,
		voterCredentialFromId
	} from '$lib/utils.js';

	let loading = $state(true);
	let { proposal, ballot, inline } = $props();

	const isLegacy = $derived(ballot?.source === 'legacy');
	const isLive = $derived(ballot?.status === 'live');
	const isClosed = $derived(ballot?.status === 'closed' || ballot?.status === 'archived');
	const isUpcoming = $derived(ballot?.status === 'upcoming');

	const acceptedCredentials = $derived(acceptedCredentialsOf(ballot));
	const voterCredential = $derived(voterCredentialFromId($user?.voterId));
	const hasTypeMismatch = $derived(
		$loggedIn &&
			!!acceptedCredentials &&
			voterCredential != null &&
			!acceptedCredentials.includes(voterCredential)
	);

	const hasSnapshotIneligibility = $derived(
		$loggedIn && !hasTypeMismatch && !ballot?.voterValidated
	);

	// Disabled when not live, not logged in, or ineligible.
	const locked = $derived(!isLive || !$loggedIn || hasTypeMismatch || hasSnapshotIneligibility);

	onMount(async () => {
		loading = false;
	});
</script>

<section id="vote" class="mt-6">
	<!-- Status banners for non-live states -->
	{#if isClosed}
		<div
			class="mb-3 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
		>
			<Archive class="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
			<div class="flex-1">
				<div class="font-semibold text-slate-800">Voting has ended</div>
				<p class="mt-0.5 text-xs">
					{#if isLegacy}
						This ballot is a read-only archive. Results are final.
					{:else}
						The voting period for this ballot has closed. The options below show what
						voters were asked.
					{/if}
				</p>
			</div>
		</div>
	{:else if isUpcoming}
		<div
			class="mb-3 flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
		>
			<Clock class="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
			<div class="flex-1">
				<div class="font-semibold">Voting hasn't started yet</div>
				<p class="mt-0.5 text-xs">
					The options below preview what you'll be asked to vote on once the ballot opens.
				</p>
			</div>
		</div>
	{:else if isLive}
		{#if !$loggedIn}
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
	{/if}

	<!-- Vote form — always rendered, locked when not live/eligible -->
	{#if proposal.voteType === 'default'}
		<ProposalVoteDefault {proposal} {ballot} disabled={locked} />
	{:else if proposal.voteType === 'budget' || proposal.voteType === 'preference'}
		<ProposalVoteBudget {proposal} {ballot} disabled={locked} />
	{:else if proposal.voteType === 'scale'}
		<ProposalVoteScale {proposal} {ballot} disabled={locked} />
	{:else if proposal.voteType === 'ranked'}
		<ProposalVoteRanked {proposal} {ballot} disabled={locked} />
	{/if}
</section>

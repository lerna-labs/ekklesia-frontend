<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { loggedIn, voter } from '$stores/sessionManager';
	import { toast } from 'svelte-sonner';
	import { api } from '$stores/sessionManager.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { lovelaceToAda } from './utils';
	import { onMount } from 'svelte';
	import ProposalVoteDefault from './ProposalVoteDefault.svelte';
	import ProposalVoteBudget from './ProposalVoteBudget.svelte';

	let loading = $state(true);
	// Props for required data
	// TODO remove inline if not used
	let { proposal, ballot, inline } = $props();

	onMount(async () => {
		loading = false;
	});
</script>

<section id="vote" class="mt-6">
	{#if $loggedIn && ballot.voterValidated && ballot.status == 'live'}
		{#if proposal.voteType === 'default'}
			<ProposalVoteDefault {proposal} {ballot} />
		{/if}
		{#if proposal.voteType === 'budget'}
			<ProposalVoteBudget {proposal} {ballot} />
		{/if}
	{/if}
	{#if $loggedIn && !ballot.voterValidated && ballot.status == 'live'}
		<Card.Root class="h-full">
			<Card.Header>
				<Card.Title>Vote not possible</Card.Title>
				<Card.Description>Your are not a valid voter for this proposal.</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-gray-500">
					Please check your voting eligibility or contact support for assistance.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
	{#if $loggedIn && ballot.status != 'live'}
		<Card.Root class="h-full">
			<Card.Header>
				<Card.Title>Voting is closed</Card.Title>
				<Card.Description>The voting for this proposal has ended.</Card.Description>
			</Card.Header>
		</Card.Root>
	{/if}
	{#if !$loggedIn}
		<Card.Root class="h-full">
			<Card.Header>
				<Card.Title>Login required</Card.Title>
				<Card.Description>You need to be logged in to vote on this proposal.</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-gray-500">Please log in to your account to cast your vote.</p>
			</Card.Content>
		</Card.Root>
	{/if}
</section>

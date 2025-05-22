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

	// Generate a simple unique component instance ID
	const componentId = Math.random().toString(36).substring(2, 8);

	// Props for required data
	let { proposal, ballot, inline } = $props();
	let options = $state(proposal.voteOptions);

	let value = $derived(proposal.voterVote ?? null);
	let loading = $state(true);
	let error = $state(null);
	let voteData = $state(null);

	let showVoteBanner = $state(value === null);

	onMount(async () => {
		// Fix: Use option.value instead of option.id for uniqueId creation
		options = options.map((option) => ({
			...option,
			uniqueId: `option_${option.value}_${proposal?._id || ''}_${componentId}`
		}));
		loading = false;
	});

	// Function to handle vote change
	async function storeVote(newValue) {
		if (newValue !== null && newValue !== undefined) {
			loading = true;

			try {
				const voteStoreRequest = await api.fetch(fetch, '/vote/' + proposal._id, {
					method: 'POST',
					body: JSON.stringify({ vote: newValue }),
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (voteStoreRequest.status === 200) {
					const voteStored = await voteStoreRequest.json();
					if (voteStored.changes) $voter.pendingVotesCount = true;
					toast.success('Vote updated successfully (not submitted!)');
				} else {
					const errorData = await voteStoreRequest.json();
					throw new Error(errorData.message || voteStoreRequest.statusText);
				}
			} catch (err) {
				toast.error('Error storing vote: ' + err.body.message);
				console.error('Error storing vote:', err);
			} finally {
				loading = false;
			}
		}
	}

	function handleVote(option) {
		value = option.value;

		// Let the animation play before removing the element
		setTimeout(() => {
			showVoteBanner = false;
		}, 500); // Match animation duration

		storeVote(option.value);
	}
</script>

{#if !inline}
	<section id="vote" class="">
		{#if $loggedIn && ballot.voterValidated && ballot.status == 'live'}
			<Card.Root class="relative h-full">
				<Card.Header>
					<Card.Title>{value ? 'Your Vote' : 'Vote now!'}</Card.Title>
					<Card.Description>
						{#if ballot.voteWeighted}
							Voting Power: {lovelaceToAda(ballot.votingPower)}
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<RadioGroup.Root bind:value onValueChange={storeVote}>
						{#each options as option, i}
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value={option.value} id={option.uniqueId} disabled={loading} />
								<Label for={option.uniqueId}>{option.label}</Label>
							</div>
						{/each}
					</RadioGroup.Root>
				</Card.Content>
			</Card.Root>
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
		{#if $loggedIn && ballot.status != 'live' && value}
			<Card.Root class="h-full">
				<Card.Header>
					<Card.Title>Voting is closed</Card.Title>
					<Card.Description>The voting for this proposal has ended.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if value}
						<p class="text-sm text-gray-500">
							You voted <strong>{value}</strong> on this proposal. Thank you for participating!
						</p>
					{:else}
						<p class="text-sm text-gray-500">Voting is closed. You cannot vote anymore.</p>
					{/if}
				</Card.Content>
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
{/if}

{#if inline}
	<div class="relative inline-flex rounded-md">
		{#if showVoteBanner}
			<div
				class="absolute -top-6 z-0 w-full rounded-lg rounded-b-none bg-zinc-400 pb-2 pt-1 text-center text-xs text-white {value !==
				null
					? 'fade-out'
					: ''}"
			>
				Vote now
			</div>
		{/if}
		{#each options as option, i}
			<Button
				class={`
				  ${i === 0 ? 'rounded-l-md' : 'rounded-l-none'} 
				  ${i === options.length - 1 ? 'rounded-r-md' : 'rounded-r-none'}
				  ${i !== 0 ? 'z-1000 relative -ml-px ' : 'z-1000 relative '}`}
				size="sm"
				variant={value === option.value ? 'default' : 'outline'}
				onclick={() => handleVote(option)}
				disabled={ballot.status !== 'live' || !ballot.voterValidated}
			>
				{option.label}
			</Button>
		{/each}
	</div>
{/if}

<style>
	.fade-out {
		animation: fadeOutDown 0.5s forwards;
		pointer-events: none;
	}

	@keyframes fadeOutDown {
		from {
			opacity: 1;
			transform: translateY(0);
		}
		to {
			opacity: 1;
			transform: translateY(24px);
		}
	}
</style>

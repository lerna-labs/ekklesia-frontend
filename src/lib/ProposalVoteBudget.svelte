<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import { onMount } from 'svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { loggedIn, voter } from '$stores/sessionManager';
	import { lovelaceToAda } from './utils';
	import { api } from '$stores/sessionManager.js';
	let { proposal, ballot } = $props();
	let options = $state(proposal.voteOptions);
	let value = $derived(proposal.voterVote ?? []);
	let loading = $state(true);
	let error = $state(null);
	let componentId = Math.random().toString(36).substring(2, 15);
	// track option ids that were reverted so we can show a temporary visual indicator
	let reverted = $state([]);

	// determine if the proposal has an actual custom budget amount or if all options have the same cost (1)
	let actualBudgetVote = $derived(
		proposal.voteOptions.map((option) => option.cost || 0).reduce((a, b) => a + b, 0) !=
			proposal.voteOptions.length
			? true
			: false
	);

	// Function to handle vote change with optimistic update and rollback on failure
	// prevValue is passed so we can revert if the API request fails
	async function storeVote(newValue, prevValue) {
		if (newValue === null || newValue === undefined) return;
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
				// value already set optimistically; keep it
			} else {
				// try to read error information and show it directly so we reliably display server messages
				let errorData;
				try {
					errorData = await voteStoreRequest.json();
				} catch (e) {
					errorData = null;
				}
				const msg =
					(errorData && errorData.message) || voteStoreRequest.statusText || 'Unknown error';

				// Revert optimistic UI immediately (same logic as in catch)
				value = prevValue;
				const prev = prevValue || [];
				const next = newValue || [];
				const added = next.filter((id) => !prev.includes(id));
				const removed = prev.filter((id) => !next.includes(id));
				const changedIds = [...new Set([...added, ...removed])];

				if (changedIds.length) {
					reverted = [...reverted, ...changedIds.filter((id) => !reverted.includes(id))];
					setTimeout(() => {
						reverted = reverted.filter((id) => !changedIds.includes(id));
					}, 1200);
				}

				toast.error('Error storing vote: ' + msg);
				console.error('Error storing vote (server):', msg, voteStoreRequest);
				// bail out — we've handled the server error and reverted the UI
				return;
			}
		} catch (err) {
			// Revert optimistic UI
			value = prevValue;

			// determine which option ids changed so we can show a temporary visual indicator
			const prev = prevValue || [];
			const next = newValue || [];
			const added = next.filter((id) => !prev.includes(id));
			const removed = prev.filter((id) => !next.includes(id));
			const changedIds = [...new Set([...added, ...removed])];

			// mark changed ids as reverted (show visual cue) then clear after a short timeout
			if (changedIds.length) {
				reverted = [...reverted, ...changedIds.filter((id) => !reverted.includes(id))];
				setTimeout(() => {
					reverted = reverted.filter((id) => !changedIds.includes(id));
				}, 1200);
			}

			// extract message from possible shapes thrown by api.fetch / SvelteKit
			let message = 'Unknown error';
			try {
				if (err && err.body) {
					// SvelteKit `error(status, message)` produces an error with a `body`.
					// `body` may be an object like { message: '...' } or a string.
					if (typeof err.body === 'string') {
						message = err.body;
					} else if (err.body.message) {
						message = err.body.message;
					} else {
						message = JSON.stringify(err.body);
					}
				} else if (err && err.message) {
					message = err.message;
				}
			} catch (e) {
				// fall back
				if (err && err.message) message = err.message;
			}

			toast.error('Error storing vote: ' + message);
			console.error('Error storing vote:', message, err);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		loading = false;
	});
</script>

<Card.Root class="relative h-full">
	<Card.Header>
		<Card.Title>{value ? 'Your Vote' : 'Vote now!'}</Card.Title>
		<Card.Description>
			{#if ballot.voteWeighted}
				<div>Voting Power: {lovelaceToAda(ballot.votingPower)}</div>
			{/if}
			{#if actualBudgetVote}
				<div>Budget left: {proposal.voteOptions.length - (value?.length || 0)}</div>
			{:else}
				<div>
					{value?.length || 0} of {proposal.voterBudget} Options selected
				</div>
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#each options as option, i}
			<div
				class="mb-1 flex items-start space-x-2"
				class:revert-flash={reverted.includes(option.id)}
				title={value.length >= proposal.voterBudget && !value?.includes(option.id)
					? 'You have selected the maximum number of options.'
					: option.label}
			>
				<Checkbox
					id={'voteOption' + option.id}
					value={option.id}
					disabled={loading ||
						(value.length >= proposal.voterBudget && !value?.includes(option.id))}
					checked={value?.includes(option.id) || false}
					onCheckedChange={(e) => {
						const prevValue = value ? [...value] : [];
						let newValue;
						if (e) {
							newValue = [...(prevValue || []), option.id];
						} else {
							newValue = (prevValue || []).filter((v) => v !== option.id);
						}
						// optimistic update: reflect change immediately
						value = newValue;
						storeVote(newValue, prevValue);
					}}
				/>
				<Label for={'voteOption' + option.id} class="leading-4">{option.label}</Label>
			</div>
		{/each}
	</Card.Content>
</Card.Root>

<style>
	/* brief red flash + small shake to indicate the option was reverted */
	.revert-flash {
		animation: revertFlash 1.1s ease;
	}

	@keyframes revertFlash {
		0% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-4px);
		}
		40% {
			transform: translateX(4px);
		}
		60% {
			transform: translateX(-2px);
		}
		80% {
			transform: translateX(2px);
		}
		100% {
			transform: translateX(0);
			background-color: transparent;
		}
	}
</style>

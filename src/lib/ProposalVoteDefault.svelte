<script>
	import { onMount } from 'svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import { loggedIn, user } from '$stores/sessionManager';
	import { lovelaceToAda } from './utils';
	import { api } from '$stores/sessionManager.js';
	let { proposal, ballot } = $props();
	let options = $derived(proposal.voteOptions);
	let value = $derived(proposal.voterVote ? proposal.voterVote[0] : null);
	let loading = $state(true);
	let error = $state(null);
	let componentId = Math.random().toString(36).substring(2, 15);
	// track option ids that were reverted so we can show a temporary visual indicator
	let reverted = $state([]);

	// Function to handle vote change with optimistic update and rollback on failure
	// prevValue is passed so we can revert if the API request fails
	async function storeVote(newValue, prevValue) {
		if (newValue === null || newValue === undefined) return;
		loading = true;

		try {
			const voteStoreRequest = await api.fetch(fetch, '/vote/' + proposal._id, {
				method: 'POST',
				body: JSON.stringify({ vote: [newValue] }),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (voteStoreRequest.status === 200) {
				const voteStored = await voteStoreRequest.json();
				if (voteStored.changes) $user.pendingVotesCount = true;
				toast.success('Vote updated successfully (not submitted!)');
				// value already set optimistically; keep it
			} else {
				// try to read error information and show it directly
				let errorData;
				try {
					errorData = await voteStoreRequest.json();
				} catch (e) {
					errorData = null;
				}
				const msg =
					(errorData && errorData.message) || voteStoreRequest.statusText || 'Unknown error';

				// Revert optimistic UI — set to undefined when there is no previous value so the radio clears
				value = prevValue ?? undefined;
				const prev = prevValue ? [String(prevValue)] : [];
				const next = newValue ? [String(newValue)] : [];
				const added = next.filter((id) => !prev.includes(id));
				const removed = prev.filter((id) => !next.includes(id));
				const changedIds = [...new Set([...added.map(String), ...removed.map(String)])];

				if (changedIds.length) {
					const current = reverted.map(String);
					reverted = [...reverted, ...changedIds.filter((id) => !current.includes(id))];
					setTimeout(() => {
						reverted = reverted.filter((id) => !changedIds.includes(id));
					}, 1200);
				}

				toast.error('Error storing vote: ' + msg);
				console.error('Error storing vote (server):', msg, voteStoreRequest);
				return;
			}
		} catch (err) {
			// Revert optimistic UI — set to undefined when there is no previous value so the radio clears
			value = prevValue ?? undefined;

			const prev = prevValue ? [String(prevValue)] : [];
			const next = newValue ? [String(newValue)] : [];
			const added = next.filter((id) => !prev.includes(id));
			const removed = prev.filter((id) => !next.includes(id));
			const changedIds = [...new Set([...added.map(String), ...removed.map(String)])];

			if (changedIds.length) {
				const current = reverted.map(String);
				reverted = [...reverted, ...changedIds.filter((id) => !current.includes(id))];
				setTimeout(() => {
					reverted = reverted.filter((id) => !changedIds.includes(String(id)));
				}, 1200);
			}

			// extract message from possible shapes thrown by api.fetch / SvelteKit
			let message = 'Unknown error';
			try {
				if (err && err.body) {
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
				<div class="mt-2 flex flex-col gap-1 text-xs">
					<div>
						<span class="font-semibold">Voting Power:</span>
						{lovelaceToAda(ballot.votingPower)}
					</div>
				</div>
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<RadioGroup.Root
			bind:value
			onValueChange={(nv) => {
				const prevValue = value;
				// optimistic update — set the new value immediately
				value = nv;
				storeVote(nv, prevValue);
			}}
		>
			{#each options as option, i}
				<div
					class="mb-1 flex items-start space-x-2"
					class:revert-flash={reverted.map(String).includes(String(option.id))}
				>
					<RadioGroup.Item
						value={option.id}
						id={'voteOption' + option.id}
						disabled={loading}
						class={reverted.map(String).includes(String(option.id)) ? 'revert-flash' : ''}
					/>
					<Label for={'voteOption' + option.id} class="leading-4">{option.label}</Label>
				</div>
			{/each}

			<!-- new abstain logic -->
			 {#if proposal.abstainAllowed}
			 <div
			 class="mb-1 flex items-start space-x-2"
			 class:revert-flash={reverted.map(String).includes(String("abstain"))}
		 >
			 <RadioGroup.Item
				 value="abstain"
				 id='abstain'
				 disabled={loading}
				 class={reverted.map(String).includes(String("abstain")) ? 'revert-flash' : ''}
			 />
			 <Label for="abstain" class="leading-4">Abstain</Label>
		 </div>
		 {/if}

		</RadioGroup.Root>
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
			background-color: rgba(239, 68, 68, 0.12); /* red-500 @ 12% */
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

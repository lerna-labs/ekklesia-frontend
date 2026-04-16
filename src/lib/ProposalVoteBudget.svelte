<script>
	import { onMount } from 'svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { loggedIn, user } from '$stores/sessionManager';
	import { lovelaceToAda } from './utils';
	import { api } from '$stores/sessionManager.js';
	let { proposal, ballot, disabled = false } = $props();

	// Budget proposals split their UI in two: the grid of budget options
	// (checkboxes) plus a separate Abstain toggle that is mutually
	// exclusive with any picked option. Backend signals availability via
	// `proposal.abstainAllowed` (default true).
	let options = $state(proposal.voteOptions);
	const abstainAllowed = $derived(proposal.abstainAllowed !== false);

	let value = $derived(proposal.voterVote ?? []);
	const isAbstaining = $derived(
		Array.isArray(value) && value.length === 1 && value[0] === 'abstain'
	);
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
				if (voteStored.changes) $user.pendingVotesCount = true;
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

<div class="relative">
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
		<h3 class="text-base font-semibold">
			{value && value.length > 0 ? 'Your Vote' : 'Vote Options'}
		</h3>
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
			{#if ballot.voteWeighted && !disabled && ballot.votingPower}
				<span class="font-mono tabular-nums">
					Voting Power: {lovelaceToAda(ballot.votingPower)}
				</span>
			{/if}
			{#if actualBudgetVote}
				<span class="font-mono tabular-nums">
					Budget left: {proposal.voteOptions.length - (value?.length || 0)}
				</span>
			{:else}
				<span class="font-mono tabular-nums">
					Options selected: {value?.length || 0} of {proposal.voterBudget}
				</span>
			{/if}
		</div>
	</div>

	<div class={disabled ? 'opacity-60' : ''}>
		<div class="grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));">
			{#each options as option, i}
				<div
					class="mb-1 flex items-center space-x-2"
					class:revert-flash={reverted.includes(option.id)}
					title={value.length >= proposal.voterBudget && !value?.includes(option.id)
						? 'You have selected the maximum number of options.'
						: option.label}
				>
					<Checkbox
						id={'voteOption' + option.id}
						value={option.id}
						disabled={loading ||
							disabled ||
							isAbstaining ||
							(value.length >= proposal.voterBudget && !value?.includes(option.id))}
						checked={value?.includes(option.id) || false}
						onCheckedChange={(e) => {
							if (disabled) return;
							const prevValue = value ? [...value] : [];
							let newValue;
							if (e) {
								newValue = [...(prevValue || []), option.id];
							} else {
								newValue = (prevValue || []).filter((v) => v !== option.id);
							}
							// ensure the ids are stored in the order of options
							newValue = proposal.voteOptions
								.map((opt) => opt.id)
								.filter((id) => newValue.includes(id));

							// optimistic update: reflect change immediately
							value = newValue;
							storeVote(newValue, prevValue);
						}}
					/>
					<Label for={'voteOption' + option.id} class="truncate leading-4">{option.label}</Label>
				</div>
			{/each}
		</div>

		{#if abstainAllowed}
			<div class="mt-3 border-t pt-3">
				<div
					class="flex items-center space-x-2"
					class:revert-flash={reverted.includes('abstain')}
					title="Abstain from this proposal. Clears any options you've already picked."
				>
					<Checkbox
						id="voteOptionAbstain"
						value="abstain"
						disabled={loading || disabled}
						checked={isAbstaining}
						onCheckedChange={(checked) => {
							if (disabled) return;
							const prevValue = Array.isArray(value) ? [...value] : [];
							const newValue = checked ? ['abstain'] : [];
							value = newValue;
							storeVote(newValue, prevValue);
						}}
					/>
					<Label for="voteOptionAbstain" class="leading-4">
						Abstain from this proposal
					</Label>
				</div>
				<p class="mt-1 pl-6 text-xs text-muted-foreground">
					Abstaining is mutually exclusive — it clears any options you've picked.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* small shake to indicate the option was reverted */
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

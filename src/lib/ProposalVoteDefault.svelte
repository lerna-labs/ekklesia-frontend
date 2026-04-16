<script>
	import { onMount } from 'svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { loggedIn, user } from '$stores/sessionManager';
	import { lovelaceToAda } from './utils';
	import { api } from '$stores/sessionManager.js';
	let { proposal, ballot, disabled = false } = $props();

	// Proposals carry only the explicit option set in `voteOptions` (e.g.
	// [Yes, No]) and signal the availability of Abstain via the separate
	// `abstainAllowed` flag (default true). Render the synthetic Abstain
	// row as part of the radio group so voters aren't forced to pick an
	// opinion when the ballot allows deferral.
	const options = $derived.by(() => {
		const base = Array.isArray(proposal.voteOptions) ? proposal.voteOptions : [];
		if (proposal.abstainAllowed === false) return base;
		if (base.some((o) => o.id === 'abstain')) return base;
		return [...base, { id: 'abstain', label: 'Abstain', cost: 0 }];
	});

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

<div class="relative">
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<h3 class="text-base font-semibold">
			{value ? 'Your Vote' : 'Vote Options'}
		</h3>
		{#if ballot.voteWeighted && !disabled && ballot.votingPower}
			<span class="font-mono text-xs tabular-nums text-muted-foreground">
				Voting Power: {lovelaceToAda(ballot.votingPower)}
			</span>
		{/if}
	</div>

	<RadioGroup.Root
		bind:value
		onValueChange={(nv) => {
			if (disabled) return;
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
				class:opacity-60={disabled}
			>
				<RadioGroup.Item
					value={option.id}
					id={'voteOption' + option.id}
					disabled={loading || disabled}
					class={reverted.map(String).includes(String(option.id)) ? 'revert-flash' : ''}
				/>
				<Label for={'voteOption' + option.id} class="leading-4">{option.label}</Label>
			</div>
		{/each}
	</RadioGroup.Root>
</div>

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

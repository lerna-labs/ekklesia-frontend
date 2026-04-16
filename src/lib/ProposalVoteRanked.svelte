<script>
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronUp, ChevronDown, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$stores/sessionManager';
	import { lovelaceToAda } from './utils';
	import { api } from '$stores/sessionManager.js';
	import { onMount } from 'svelte';

	let { proposal, ballot, disabled = false } = $props();

	const options = $derived(proposal.voteOptions ?? []);
	const abstainAllowed = $derived(proposal.abstainAllowed !== false);

	// Vote shape: `[id1, id2, id3, ...]` in rank order, or `["abstain"]`.
	const initial = $derived(() => Array.isArray(proposal.voterVote) ? [...proposal.voterVote] : []);
	let ranking = $state(initial());
	const isAbstaining = $derived(ranking.length === 1 && ranking[0] === 'abstain');
	const rankedIds = $derived(isAbstaining ? [] : ranking);
	const unrankedOptions = $derived(options.filter((o) => !rankedIds.includes(o.id)));
	let loading = $state(true);

	async function storeVote(newValue, prevValue) {
		if (disabled) return;
		loading = true;
		try {
			const res = await api.fetch(fetch, '/vote/' + proposal._id, {
				method: 'POST',
				body: JSON.stringify({ vote: newValue }),
				headers: { 'Content-Type': 'application/json' }
			});
			if (res.status === 200) {
				const stored = await res.json();
				if (stored.changes) $user.pendingVotesCount = true;
				toast.success('Vote updated successfully (not submitted!)');
			} else {
				let msg;
				try { msg = (await res.json())?.message; } catch {}
				toast.error('Error storing vote: ' + (msg || res.statusText));
				ranking = prevValue;
			}
		} catch (err) {
			ranking = prevValue;
			toast.error('Error storing vote: ' + (err?.body?.message || err?.message || 'Unknown'));
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loading = false;
	});

	function addToRanking(id) {
		const prev = [...ranking];
		const next = isAbstaining ? [id] : [...ranking, id];
		ranking = next;
		storeVote(next, prev);
	}

	function removeFromRanking(id) {
		const prev = [...ranking];
		const next = ranking.filter((v) => v !== id);
		ranking = next;
		storeVote(next, prev);
	}

	function moveUp(idx) {
		if (idx === 0) return;
		const prev = [...ranking];
		const next = [...ranking];
		[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		ranking = next;
		storeVote(next, prev);
	}

	function moveDown(idx) {
		if (idx >= ranking.length - 1) return;
		const prev = [...ranking];
		const next = [...ranking];
		[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		ranking = next;
		storeVote(next, prev);
	}

	function toggleAbstain(checked) {
		const prev = [...ranking];
		const next = checked ? ['abstain'] : [];
		ranking = next;
		storeVote(next, prev);
	}

	function labelFor(id) {
		return options.find((o) => o.id === id)?.label ?? String(id);
	}
</script>

<div class="relative">
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<h3 class="text-base font-semibold">
			{rankedIds.length > 0 ? 'Your Ranking' : 'Vote Options'}
		</h3>
		{#if ballot.voteWeighted && !disabled && ballot.votingPower}
			<span class="font-mono text-xs tabular-nums text-muted-foreground">
				Voting Power: {lovelaceToAda(ballot.votingPower)}
			</span>
		{/if}
	</div>

	<div class={isAbstaining || disabled ? 'opacity-60' : ''}>
		{#if rankedIds.length > 0}
			<div class="mb-3">
				<div class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Ranked (1 = highest)
				</div>
				<ol class="space-y-1">
					{#each rankedIds as id, i}
						<li class="flex items-center gap-2 rounded-md border bg-slate-50 px-2 py-1">
							<span class="font-mono text-sm font-semibold tabular-nums text-orange-600">
								{i + 1}.
							</span>
							<span class="flex-1 truncate text-sm">{labelFor(id)}</span>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								disabled={loading || disabled || i === 0}
								onclick={() => moveUp(i)}
								aria-label="Move up"
							>
								<ChevronUp class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								disabled={loading || disabled || i === rankedIds.length - 1}
								onclick={() => moveDown(i)}
								aria-label="Move down"
							>
								<ChevronDown class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7 text-muted-foreground hover:text-red-600"
								disabled={loading || disabled}
								onclick={() => removeFromRanking(id)}
								aria-label="Remove from ranking"
							>
								<X class="h-4 w-4" />
							</Button>
						</li>
					{/each}
				</ol>
			</div>
		{/if}

		{#if unrankedOptions.length > 0}
			<div>
				{#if rankedIds.length > 0}
					<div class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
						Add to your ranking
					</div>
				{/if}
				<div class="flex flex-wrap gap-1">
					{#each unrankedOptions as option}
						<Button
							variant="outline"
							size="sm"
							class="text-xs"
							disabled={loading || disabled}
							onclick={() => addToRanking(option.id)}
						>
							+ {option.label}
						</Button>
					{/each}
				</div>
			</div>
		{:else if rankedIds.length > 0}
			<p class="text-xs text-muted-foreground">All options ranked.</p>
		{/if}
	</div>

	{#if abstainAllowed}
		<div class="mt-3 border-t pt-3">
			<div class="flex items-center space-x-2">
				<Checkbox
					id="voteRankedAbstain"
					checked={isAbstaining}
					disabled={loading || disabled}
					onCheckedChange={(c) => toggleAbstain(!!c)}
				/>
				<Label for="voteRankedAbstain" class="leading-4">
					Abstain from this proposal
				</Label>
			</div>
			<p class="mt-1 pl-6 text-xs text-muted-foreground">
				Abstaining is mutually exclusive — clears any ranking you've made.
			</p>
		</div>
	{/if}
</div>

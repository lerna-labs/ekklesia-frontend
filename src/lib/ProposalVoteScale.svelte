<script>
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { user } from '$stores/sessionManager';
	import { lovelaceToAda } from './utils';
	import { api } from '$stores/sessionManager.js';
	import { onMount } from 'svelte';

	let { proposal, ballot, disabled = false } = $props();

	// Scale proposals carry their numeric range as the option `id`s on
	// `voteOptions[]` (e.g. [{id:-100, label:'Strongly oppose'}, {id:0,
	// label:'Neutral'}, {id:100, label:'Strongly support'}]). The voter
	// submits a single number anywhere in [min, max] in steps of
	// `voteIncrement` (default 1).
	const numericIds = $derived(
		(proposal.voteOptions ?? [])
			.map((o) => Number(o.id))
			.filter((n) => Number.isFinite(n))
	);
	const min = $derived(numericIds.length ? Math.min(...numericIds) : 0);
	const max = $derived(numericIds.length ? Math.max(...numericIds) : 100);
	const step = $derived(Number(proposal.voteIncrement) || 1);
	const abstainAllowed = $derived(proposal.abstainAllowed !== false);

	// Anchor labels for the labelled endpoints in the slider track.
	const anchors = $derived(
		(proposal.voteOptions ?? [])
			.filter((o) => Number.isFinite(Number(o.id)))
			.sort((a, b) => Number(a.id) - Number(b.id))
	);

	const initial = $derived(() => {
		const v = proposal.voterVote?.[0];
		if (v === 'abstain') return 'abstain';
		if (typeof v === 'number') return v;
		const n = Number(v);
		return Number.isFinite(n) ? n : Math.round((min + max) / 2);
	});

	let value = $state(initial());
	let isAbstaining = $derived(value === 'abstain');
	let loading = $state(true);

	async function storeVote(newValue, prevValue) {
		if (disabled) return;
		loading = true;
		try {
			const res = await api.fetch(fetch, '/vote/' + proposal._id, {
				method: 'POST',
				body: JSON.stringify({ vote: [newValue] }),
				headers: { 'Content-Type': 'application/json' }
			});
			if (res.status === 200) {
				const stored = await res.json();
				if (stored.changes) $user.pendingVotesCount = true;
				toast.success('Vote updated successfully (not submitted!)');
			} else {
				let msg;
				try {
					msg = (await res.json())?.message;
				} catch {}
				toast.error('Error storing vote: ' + (msg || res.statusText));
				value = prevValue;
			}
		} catch (err) {
			value = prevValue;
			toast.error('Error storing vote: ' + (err?.body?.message || err?.message || 'Unknown'));
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loading = false;
	});

	function setNumeric(n) {
		const prev = value;
		const clamped = Math.max(min, Math.min(max, Math.round(n / step) * step));
		value = clamped;
		storeVote(clamped, prev);
	}

	function toggleAbstain(checked) {
		const prev = value;
		const next = checked ? 'abstain' : Math.round((min + max) / 2);
		value = next;
		storeVote(next, prev);
	}
</script>

<div class="relative">
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<h3 class="text-base font-semibold">
			{value !== null && value !== undefined ? 'Your Vote' : 'Vote Options'}
		</h3>
		{#if ballot.voteWeighted && !disabled && ballot.votingPower}
			<span class="font-mono text-xs tabular-nums text-muted-foreground">
				Voting Power: {lovelaceToAda(ballot.votingPower)}
			</span>
		{/if}
	</div>

	<div class={isAbstaining || disabled ? 'opacity-60' : ''}>
		<div class="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
			<span>{min}</span>
			<span class="font-mono text-2xl tabular-nums text-foreground">
				{isAbstaining ? '—' : value}
			</span>
			<span>{max}</span>
		</div>
		<input
			type="range"
			class="w-full accent-orange-500"
			{min}
			{max}
			{step}
			disabled={loading || disabled || isAbstaining}
			value={isAbstaining ? Math.round((min + max) / 2) : value}
			oninput={(e) => setNumeric(Number(e.currentTarget.value))}
		/>
		{#if anchors.length > 0}
			<div class="mt-1 flex justify-between text-[10px] text-muted-foreground">
				{#each anchors as a}
					<span class="max-w-[30%] truncate" title={a.label}>{a.label}</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if abstainAllowed}
		<div class="mt-3 border-t pt-3">
			<div class="flex items-center space-x-2">
				<Checkbox
					id="voteScaleAbstain"
					checked={isAbstaining}
					disabled={loading || disabled}
					onCheckedChange={(c) => toggleAbstain(!!c)}
				/>
				<Label for="voteScaleAbstain" class="leading-4">
					Abstain from this proposal
				</Label>
			</div>
			<p class="mt-1 pl-6 text-xs text-muted-foreground">
				Abstaining is mutually exclusive — your numeric value won't be counted.
			</p>
		</div>
	{/if}
</div>

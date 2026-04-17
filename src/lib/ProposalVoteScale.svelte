<script>
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { lovelaceToAda } from './utils';
	import { getProposalDraft, saveProposalDraft } from '$lib/draftVotes.js';

	let { proposal, ballot, disabled = false } = $props();

	// Scale proposals carry their numeric range as the option `id`s on
	// `voteOptions[]`. The voter submits a single number anywhere in
	// [min, max] in steps of `voteIncrement`.
	const numericIds = $derived(
		(proposal.voteOptions ?? [])
			.map((o) => Number(o.id))
			.filter((n) => Number.isFinite(n))
	);
	const min = $derived(numericIds.length ? Math.min(...numericIds) : 0);
	const max = $derived(numericIds.length ? Math.max(...numericIds) : 100);
	const step = $derived(Number(proposal.voteIncrement) || 1);
	const abstainAllowed = $derived(proposal.abstainAllowed !== false);

	const anchors = $derived(
		(proposal.voteOptions ?? [])
			.filter((o) => Number.isFinite(Number(o.id)))
			.sort((a, b) => Number(a.id) - Number(b.id))
	);

	function resolveInitial() {
		const local = getProposalDraft(ballot._id, proposal._id)?.[0];
		if (local === 'abstain') return 'abstain';
		if (typeof local === 'number') return local;
		const server = proposal.voterVote?.[0];
		if (server === 'abstain') return 'abstain';
		const n = Number(server);
		return Number.isFinite(n) ? n : null;
	}

	let value = $state(resolveInitial());
	let isAbstaining = $derived(value === 'abstain');
	const hasSelection = $derived(value !== null && value !== undefined);

	function saveDraft(v) {
		const changed = saveProposalDraft(
			ballot._id,
			proposal._id,
			v === null || v === undefined ? null : [v]
		);
		if (changed) toast.success('Vote saved as draft');
	}

	function setNumeric(n) {
		if (disabled) return;
		const clamped = Math.max(min, Math.min(max, Math.round(n / step) * step));
		value = clamped;
		saveDraft(clamped);
	}

	function toggleAbstain(checked) {
		if (disabled) return;
		value = checked ? 'abstain' : null;
		saveDraft(value);
	}
</script>

<div class="relative">
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<h3 class="text-base font-semibold">
			{hasSelection ? 'Your Vote' : 'Vote Options'}
		</h3>
		{#if ballot.voteWeighted && !disabled && ballot.votingPower}
			<span class="font-mono text-xs tabular-nums text-muted-foreground">
				Voting Power: {lovelaceToAda(ballot.votingPower)}
			</span>
		{/if}
	</div>

	<div class={isAbstaining || disabled ? 'opacity-60' : ''}>
		<div class="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
			<span class="shrink-0 font-mono tabular-nums">{min}</span>
			<!-- Numeric input mirrors and drives the slider — wide ranges
			     (think -1M to +1M with step 1) can't practically be set via
			     the slider alone; a paired number input gives precise entry. -->
			<input
				type="number"
				class="w-28 rounded-md border border-input bg-background px-2 py-1 text-center font-mono text-lg tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
				{min}
				{max}
				{step}
				disabled={disabled || isAbstaining}
				value={isAbstaining ? '' : (value ?? '')}
				placeholder={isAbstaining ? '—' : 'Pick a value'}
				oninput={(e) => {
					const n = Number(e.currentTarget.value);
					if (Number.isFinite(n)) setNumeric(n);
				}}
			/>
			<span class="shrink-0 font-mono tabular-nums">{max}</span>
		</div>
		<input
			type="range"
			class="w-full accent-orange-500"
			{min}
			{max}
			{step}
			disabled={disabled || isAbstaining}
			value={isAbstaining || value === null ? Math.round((min + max) / 2) : value}
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
					{disabled}
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

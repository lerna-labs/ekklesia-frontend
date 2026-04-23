<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronUp, ChevronDown, X, TriangleAlert } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { lovelaceToAda } from './utils';
	import {
		draftsTree,
		saveProposalSelection,
		saveProposalAbstain,
		clearProposalDraft,
		draftHasSelection,
		draftIsAbstaining
	} from '$lib/draftVotes.js';
	import { isAbstainAllowed } from '$lib/voteSchema.js';
	import AbstainToggle from '$lib/AbstainToggle.svelte';
	import OptionDetails from '$lib/OptionDetails.svelte';

	let { proposal, ballot, disabled = false } = $props();
	const capacityUnits = $derived(proposal?.data?.capacityUnits || null);

	const options = $derived(Array.isArray(proposal?.voteOptions) ? proposal.voteOptions : []);
	const canAbstain = $derived(isAbstainAllowed(proposal));
	// Schema v2 requires `selection.length === rankCount`. Fall back to the
	// option count for older ballots that don't carry the field — every
	// option must be ranked in that case.
	const rankCount = $derived(
		Number.isFinite(Number(proposal?.rankCount)) && Number(proposal.rankCount) > 0
			? Number(proposal.rankCount)
			: options.length
	);

	// Derived — see ProposalVoteDefault for the reactive-draft rationale.
	const draft = $derived.by(() => {
		const stored = $draftsTree?.[ballot._id]?.[proposal._id];
		if (stored != null) return stored;
		if (Array.isArray(proposal.voterVote) && proposal.voterVote.length > 0) {
			const seeded = proposal.voterVote.filter((v) => v !== 'abstain');
			if (seeded.length > 0) return { kind: 'selection', selection: [...seeded] };
			if (proposal.voterVote.includes('abstain')) return { kind: 'abstain' };
		}
		return null;
	});

	const isAbstaining = $derived(draftIsAbstaining(draft));
	const hasSelection = $derived(draftHasSelection(draft));
	const ranking = $derived(hasSelection ? draft.selection : []);
	const unrankedOptions = $derived(options.filter((o) => !ranking.includes(o.id)));
	const isComplete = $derived(ranking.length === rankCount);
	const remainingToRank = $derived(Math.max(0, rankCount - ranking.length));

	function persistRanking(next) {
		if (next.length === 0) {
			clearProposalDraft(ballot._id, proposal._id);
			return;
		}
		const changed = saveProposalSelection(ballot._id, proposal._id, next);
		if (changed) toast.success('Ranking saved');
	}

	function addToRanking(id) {
		if (disabled || isAbstaining || ranking.length >= rankCount) return;
		persistRanking([...ranking, id]);
	}

	function removeFromRanking(id) {
		if (disabled || isAbstaining) return;
		persistRanking(ranking.filter((v) => v !== id));
	}

	function moveUp(idx) {
		if (disabled || isAbstaining || idx === 0) return;
		const next = [...ranking];
		[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		persistRanking(next);
	}

	function moveDown(idx) {
		if (disabled || isAbstaining || idx >= ranking.length - 1) return;
		const next = [...ranking];
		[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		persistRanking(next);
	}

	function onAbstain() {
		if (disabled) return;
		const changed = saveProposalAbstain(ballot._id, proposal._id);
		if (changed) toast.success('Recorded as abstaining');
	}

	function onResumeVoting() {
		if (disabled) return;
		clearProposalDraft(ballot._id, proposal._id);
	}

	function onClear() {
		if (disabled) return;
		const changed = clearProposalDraft(ballot._id, proposal._id);
		if (changed) toast.success('Vote cleared');
	}

	function labelFor(id) {
		return options.find((o) => o.id === id)?.label ?? String(id);
	}

	function optionFor(id) {
		return options.find((o) => o.id === id) ?? null;
	}
</script>

<div class="relative">
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<h3 class="text-base font-semibold">
			{ranking.length > 0 ? 'Your Ranking' : 'Vote Options'}
		</h3>
		{#if ballot.voteWeighted && !disabled && ballot.votingPower}
			<span class="font-mono text-xs tabular-nums text-muted-foreground">
				Voting Power: {lovelaceToAda(ballot.votingPower)}
			</span>
		{/if}
	</div>

	<div class={isAbstaining ? 'pointer-events-none opacity-50' : disabled ? 'opacity-60' : ''}>
		{#if ranking.length > 0}
			<div class="mb-3">
				<div
					class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				>
					Ranked (1 = highest)
				</div>
				<ol class="space-y-1">
					{#each ranking as id, i}
						{@const opt = optionFor(id)}
						<li class="flex items-center gap-2 rounded-md border bg-slate-50 px-2 py-1">
							<span class="font-mono text-sm font-semibold tabular-nums text-orange-600">
								{i + 1}.
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-1.5">
									<span class="truncate text-sm">{labelFor(id)}</span>
									{#if opt}
										<OptionDetails option={opt} {capacityUnits} />
									{/if}
								</div>
								{#if opt?.description}
									<p class="line-clamp-1 text-[11px] text-muted-foreground">
										{opt.description}
									</p>
								{/if}
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								disabled={disabled || isAbstaining || i === 0}
								onclick={() => moveUp(i)}
								aria-label="Move up"
							>
								<ChevronUp class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								disabled={disabled || isAbstaining || i === ranking.length - 1}
								onclick={() => moveDown(i)}
								aria-label="Move down"
							>
								<ChevronDown class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7 text-muted-foreground hover:text-red-600"
								disabled={disabled || isAbstaining}
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

		{#if unrankedOptions.length > 0 && ranking.length < rankCount}
			<div>
				{#if ranking.length > 0}
					<div
						class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						Add to your ranking
					</div>
				{/if}
				<div class="flex flex-wrap gap-1">
					{#each unrankedOptions as option}
						<div class="inline-flex items-center gap-0.5 rounded-md border border-input">
							<Button
								variant="ghost"
								size="sm"
								class="rounded-r-none border-0 text-xs"
								disabled={disabled || isAbstaining}
								onclick={() => addToRanking(option.id)}
							>
								+ {option.label}
							</Button>
							<OptionDetails {option} {capacityUnits} />
						</div>
					{/each}
				</div>
			</div>
		{:else if isComplete}
			<p class="text-xs text-muted-foreground">All {rankCount} positions filled.</p>
		{/if}
	</div>

	{#if hasSelection && !isComplete && !isAbstaining}
		<div
			class="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
			role="status"
		>
			<TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
			<div>
				<div class="font-semibold">Ranking incomplete</div>
				<p class="mt-0.5">
					Rank {remainingToRank} more option{remainingToRank === 1 ? '' : 's'} before submitting.
					Partial rankings are saved as drafts but will be rejected on submission — abstain
					if you don't want to rank this question.
				</p>
			</div>
		</div>
	{/if}

	<AbstainToggle
		{isAbstaining}
		{hasSelection}
		{canAbstain}
		{disabled}
		{onAbstain}
		{onResumeVoting}
		{onClear}
	/>
</div>

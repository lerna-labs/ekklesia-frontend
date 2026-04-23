<script>
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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

	// Legacy voteType. Pre-schema-v2 ballots still emit voteType:'default' for
	// yes/no/abstain-style questions; backend is expected to migrate these to
	// explicit `binary` or `single-choice` over time. The wire shape here is
	// the same regardless: selection: [optionId] on the single chosen option.
	let { proposal, ballot, disabled = false } = $props();

	const options = $derived(Array.isArray(proposal.voteOptions) ? proposal.voteOptions : []);
	const canAbstain = $derived(isAbstainAllowed(proposal));
	const capacityUnits = $derived(proposal?.data?.capacityUnits || null);

	// Derived (not $state) so external store changes — bulk clear,
	// cross-tab draft sync, broker post-submit wipe — propagate into the
	// UI without needing to remount. Falls back to the server-side
	// `voterVote` (the voter's last submitted selection, if any) when
	// there's no local vote.
	const draft = $derived.by(() => {
		const stored = $draftsTree?.[ballot._id]?.[proposal._id];
		if (stored != null) return stored;
		if (Array.isArray(proposal.voterVote) && proposal.voterVote.length > 0) {
			const first = proposal.voterVote[0];
			if (first === 'abstain') return { kind: 'abstain' };
			return { kind: 'selection', selection: [first] };
		}
		return null;
	});

	const isAbstaining = $derived(draftIsAbstaining(draft));
	const hasSelection = $derived(draftHasSelection(draft));
	const currentValue = $derived(
		hasSelection ? String(draft.selection[0]) : null
	);

	function onChange(nv) {
		if (disabled || isAbstaining) return;
		if (nv == null) {
			clearProposalDraft(ballot._id, proposal._id);
			return;
		}
		// RadioGroup.Item values are stringified (DOM attributes are
		// strings), so `nv` arrives as a string like "2". Coerce back
		// to the integer option id before persisting — the wire
		// contract on schema v2 is `selection: number[]`.
		const n = Number(nv);
		if (!Number.isFinite(n)) return;
		const changed = saveProposalSelection(ballot._id, proposal._id, [n]);
		if (changed) toast.success('Vote saved');
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

	<div class={isAbstaining ? 'pointer-events-none opacity-50' : ''}>
		<RadioGroup.Root value={currentValue} onValueChange={onChange}>
			{#each options as option}
				<div class="mb-2 flex items-start gap-2" class:opacity-60={disabled}>
					<RadioGroup.Item
						value={String(option.id)}
						id={'voteOption-' + proposal._id + '-' + option.id}
						disabled={disabled || isAbstaining}
						class="mt-0.5 shrink-0"
					/>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
							<Label
								for={'voteOption-' + proposal._id + '-' + option.id}
								class="leading-4"
							>
								{option.label}
							</Label>
							<OptionDetails {option} {capacityUnits} />
						</div>
						{#if option.description}
							<p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
								{option.description}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</RadioGroup.Root>
	</div>

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

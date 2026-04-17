<script>
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { lovelaceToAda } from './utils';
	import { getProposalDraft, saveProposalDraft } from '$lib/draftVotes.js';

	let { proposal, ballot, disabled = false } = $props();

	// Budget proposals split their UI in two: the grid of budget options
	// (checkboxes) plus a separate Abstain toggle that is mutually
	// exclusive with any picked option.
	const options = $derived(proposal.voteOptions ?? []);
	const abstainAllowed = $derived(proposal.abstainAllowed !== false);

	let value = $state(
		getProposalDraft(ballot._id, proposal._id) ??
			(Array.isArray(proposal.voterVote) ? [...proposal.voterVote] : [])
	);
	const isAbstaining = $derived(
		Array.isArray(value) && value.length === 1 && value[0] === 'abstain'
	);

	// Actual cost budget vs simple N-of-M preference — detected by
	// whether the option costs sum to something other than option-count.
	const actualBudgetVote = $derived(
		options.map((o) => o.cost || 0).reduce((a, b) => a + b, 0) !== options.length
	);

	function saveDraft(newValue) {
		const normalized = Array.isArray(newValue) && newValue.length > 0 ? newValue : null;
		const changed = saveProposalDraft(ballot._id, proposal._id, normalized);
		if (changed) toast.success('Vote saved as draft');
	}

	function toggleOption(optionId, checked) {
		if (disabled) return;
		const prev = Array.isArray(value) ? [...value] : [];
		let next;
		if (checked) {
			next = [...prev, optionId];
		} else {
			next = prev.filter((v) => v !== optionId);
		}
		// Preserve the option declaration order.
		next = options.map((opt) => opt.id).filter((id) => next.includes(id));
		value = next;
		saveDraft(next);
	}

	function toggleAbstain(checked) {
		if (disabled) return;
		const next = checked ? ['abstain'] : [];
		value = next;
		saveDraft(next);
	}
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
					Budget left: {options.length - (value?.length || 0)}
				</span>
			{:else}
				<span class="font-mono tabular-nums">
					Options selected: {isAbstaining ? 0 : value?.length || 0} of {proposal.voterBudget}
				</span>
			{/if}
		</div>
	</div>

	<div class={disabled ? 'opacity-60' : ''}>
		<div class="grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));">
			{#each options as option}
				<div
					class="mb-1 flex items-center space-x-2"
					title={!isAbstaining &&
					(value?.length || 0) >= proposal.voterBudget &&
					!value?.includes(option.id)
						? 'You have selected the maximum number of options.'
						: option.label}
				>
					<Checkbox
						id={'voteOption' + option.id}
						value={option.id}
						disabled={disabled ||
							isAbstaining ||
							((value?.length || 0) >= proposal.voterBudget && !value?.includes(option.id))}
						checked={value?.includes(option.id) || false}
						onCheckedChange={(c) => toggleOption(option.id, !!c)}
					/>
					<Label for={'voteOption' + option.id} class="truncate leading-4">{option.label}</Label>
				</div>
			{/each}
		</div>

		{#if abstainAllowed}
			<div class="mt-3 border-t pt-3">
				<div class="flex items-center space-x-2">
					<Checkbox
						id="voteOptionAbstain"
						value="abstain"
						disabled={disabled}
						checked={isAbstaining}
						onCheckedChange={(c) => toggleAbstain(!!c)}
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

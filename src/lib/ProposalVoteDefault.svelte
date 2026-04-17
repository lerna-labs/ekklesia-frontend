<script>
	import { onMount } from 'svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { lovelaceToAda } from './utils';
	import { getProposalDraft, saveProposalDraft } from '$lib/draftVotes.js';

	let { proposal, ballot, disabled = false } = $props();

	// Proposals carry only the explicit option set in `voteOptions` (e.g.
	// [Yes, No]) and signal Abstain via the separate `abstainAllowed`
	// flag. Render the synthetic Abstain row as part of the radio group.
	const options = $derived.by(() => {
		const base = Array.isArray(proposal.voteOptions) ? proposal.voteOptions : [];
		if (proposal.abstainAllowed === false) return base;
		if (base.some((o) => o.id === 'abstain')) return base;
		return [...base, { id: 'abstain', label: 'Abstain', cost: 0 }];
	});

	// Initial selection: any local draft first, else the server-side
	// `voterVote` (populated only after a proposal has been signed +
	// submitted through the broker for this voter). Drafts are
	// browser-local by design — they stay out of the backend until the
	// voter submits the full ballot package.
	let value = $state(
		getProposalDraft(ballot._id, proposal._id)?.[0] ??
			(proposal.voterVote ? proposal.voterVote[0] : null)
	);

	function onChange(nv) {
		if (disabled) return;
		value = nv;
		const changed = saveProposalDraft(ballot._id, proposal._id, nv != null ? [nv] : null);
		if (changed) toast.success('Vote saved as draft');
	}

	onMount(() => {});
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

	<RadioGroup.Root bind:value onValueChange={onChange}>
		{#each options as option}
			<div class="mb-1 flex items-start space-x-2" class:opacity-60={disabled}>
				<RadioGroup.Item
					value={option.id}
					id={'voteOption' + option.id}
					{disabled}
				/>
				<Label for={'voteOption' + option.id} class="leading-4">{option.label}</Label>
			</div>
		{/each}
	</RadioGroup.Root>
</div>

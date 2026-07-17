<script>
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from 'svelte-sonner';
  import { lovelaceToAda } from './utils';
  import {
    draftsTree,
    submittedTree,
    saveProposalSelection,
    saveProposalAbstain,
    clearProposalDraft,
    draftHasSelection,
    draftIsAbstaining,
    revertProposalDraftToBaseline,
    isProposalDraftDivergent,
    getProposalBaseline,
  } from '$lib/draftVotes.js';
  import { isAbstainAllowed } from '$lib/voteSchema.js';
  import AbstainToggle from '$lib/AbstainToggle.svelte';
  import OptionDetails from '$lib/OptionDetails.svelte';

  let { proposal, ballot, disabled = false } = $props();

  // `preference` (no cost-cap) and `budget` (cost-cap) both render as a
  // multi-choice checkbox list. Schema v2 also emits `multi-choice` as
  // the voteType; cost-variance across options decides which treatment
  // applies — uniform costs ⇒ preference, varying costs ⇒ budget.
  const options = $derived(Array.isArray(proposal.voteOptions) ? proposal.voteOptions : []);
  const canAbstain = $derived(isAbstainAllowed(proposal));
  const voterBudget = $derived(Number(proposal?.voterBudget) || 0);
  const capacityUnits = $derived(proposal?.data?.capacityUnits || null);

  const voteType = $derived(String(proposal?.voteType ?? '').toLowerCase());
  const optionCosts = $derived(options.map((o) => Number(o.cost) || 0));
  const uniformCosts = $derived(optionCosts.length === 0 || new Set(optionCosts).size === 1);
  const isBudget = $derived(
    voteType === 'budget' || (voteType === 'multi-choice' && !uniformCosts),
  );

  // Drafts are seeded from /mine by the page's synchronous seedBallotFromMine
  // call. No fallback to proposal.voterVote — see ProposalVoteLikert for
  // why (the fallback defeats per-proposal Clear).
  const draft = $derived($draftsTree?.[ballot._id]?.[proposal._id] ?? null);

  const isAbstaining = $derived(draftIsAbstaining(draft));
  const hasSelection = $derived(draftHasSelection(draft));
  const selected = $derived(hasSelection ? draft.selection : []);

  // Cost-cap math (budget mode only). Falls back to 0 when an option has
  // no declared cost so a malformed ballot doesn't blow up the sum.
  function costOf(id) {
    return Number(options.find((o) => o.id === id)?.cost) || 0;
  }
  const costUsed = $derived(isBudget ? selected.reduce((sum, id) => sum + costOf(id), 0) : 0);
  const costRemaining = $derived(isBudget ? voterBudget - costUsed : 0);
  const selectionsRemaining = $derived(isBudget ? 0 : Math.max(0, voterBudget - selected.length));

  // "engineer-months" → "engineer-month" when cost === 1; naive but
  // works for the common plural-ending-s case.
  function unitLabel(cost, units) {
    if (!units) return null;
    if (cost === 1 && units.endsWith('s')) return units.slice(0, -1);
    return units;
  }

  function persistSelection(next) {
    // Preserve option-declaration order for stable rendering.
    const ordered = options.map((o) => o.id).filter((id) => next.includes(id));
    if (ordered.length === 0) {
      clearProposalDraft(ballot._id, proposal._id);
      return;
    }
    const changed = saveProposalSelection(ballot._id, proposal._id, ordered);
    if (changed) toast.success('Vote saved');
  }

  function toggleOption(optionId, checked) {
    if (disabled || isAbstaining) return;
    const prev = selected;
    if (checked) persistSelection([...prev, optionId]);
    else persistSelection(prev.filter((v) => v !== optionId));
  }

  function isOptionLocked(optionId) {
    if (disabled || isAbstaining) return true;
    if (selected.includes(optionId)) return false;
    if (isBudget) return costOf(optionId) > costRemaining;
    return selected.length >= voterBudget;
  }

  function lockReason() {
    return isBudget ? 'Over budget' : 'Max reached';
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

  const canRevert = $derived.by(() => {
    void $submittedTree;
    void $draftsTree;
    if (getProposalBaseline(ballot._id, proposal._id) == null) return false;
    return isProposalDraftDivergent(ballot._id, proposal._id);
  });

  function onRevert() {
    if (disabled) return;
    const changed = revertProposalDraftToBaseline(ballot._id, proposal._id);
    if (changed) toast.success('Reverted to your submitted vote');
  }
</script>

<div class="relative">
  <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
    <h3 class="text-base font-semibold">
      {hasSelection ? 'Your Vote' : 'Vote Options'}
    </h3>
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {#if ballot.voteWeighted && !disabled && ballot.votingPower}
        <span class="font-mono tabular-nums">
          Voting Power: {lovelaceToAda(ballot.votingPower)}
        </span>
      {/if}
      {#if isBudget}
        <span class="font-mono tabular-nums">
          Cost used: {costUsed} of {voterBudget}{capacityUnits ? ` ${capacityUnits}` : ''}
          {#if costRemaining > 0 && !isAbstaining}
            <span class="text-muted-foreground/80">· {costRemaining} remaining</span>
          {:else if costRemaining === 0 && costUsed > 0 && !isAbstaining}
            <span class="text-emerald-700">· fully allocated</span>
          {/if}
        </span>
      {:else}
        <span class="font-mono tabular-nums">
          Options selected: {isAbstaining ? 0 : selected.length} of {voterBudget}
          {#if selectionsRemaining > 0 && !isAbstaining}
            <span class="text-muted-foreground/80">
              · {selectionsRemaining} remaining
            </span>
          {/if}
        </span>
      {/if}
    </div>
  </div>

  <div class={isAbstaining ? 'pointer-events-none opacity-50' : disabled ? 'opacity-60' : ''}>
    <ul class="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {#each options as option}
        {@const locked = isOptionLocked(option.id)}
        {@const isChecked = selected.includes(option.id)}
        {@const dim = locked && !isChecked}
        <li class="flex items-start gap-3 px-3 py-2 {dim ? 'opacity-60' : ''}">
          <Checkbox
            id={'voteOption-' + proposal._id + '-' + option.id}
            value={option.id}
            disabled={locked}
            checked={isChecked}
            onCheckedChange={(c) => toggleOption(option.id, !!c)}
            class="mt-0.5"
          />
          <div class="min-w-0 flex-1">
            <Label
              for={'voteOption-' + proposal._id + '-' + option.id}
              class="cursor-pointer leading-tight {locked ? 'cursor-not-allowed' : ''}"
            >
              {option.label}
            </Label>
            {#if option.description}
              <p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {option.description}
              </p>
            {/if}
          </div>
          {#if isBudget && option.cost != null}
            <span
              class="shrink-0 whitespace-nowrap pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground"
            >
              {option.cost}{#if capacityUnits}
                <span class="ml-1 text-muted-foreground/80">
                  {unitLabel(option.cost, capacityUnits)}
                </span>
              {/if}
            </span>
          {/if}
          {#if dim}
            <span
              class="mt-0.5 shrink-0 whitespace-nowrap rounded bg-amber-50 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-amber-700"
              title={isBudget
                ? 'This option costs more than your remaining budget.'
                : 'You have selected the maximum number of options.'}
            >
              {lockReason()}
            </span>
          {/if}
          <div class="mt-0.5 shrink-0">
            <OptionDetails {option} {capacityUnits} />
          </div>
        </li>
      {/each}
    </ul>
  </div>

  <AbstainToggle
    {isAbstaining}
    {hasSelection}
    {canAbstain}
    {disabled}
    {canRevert}
    {onAbstain}
    {onResumeVoting}
    {onClear}
    {onRevert}
  />
</div>

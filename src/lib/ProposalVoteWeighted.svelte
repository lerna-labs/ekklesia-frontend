<script>
  import { Label } from '$lib/components/ui/label/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { TriangleAlert, Sigma } from 'lucide-svelte';
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

  const options = $derived(Array.isArray(proposal?.voteOptions) ? proposal.voteOptions : []);
  const canAbstain = $derived(isAbstainAllowed(proposal));
  const voterBudget = $derived(Number(proposal?.voterBudget) || 0);

  // Drafts are seeded from /mine by the page's synchronous seedBallotFromMine
  // call. No fallback to proposal.voterVote — see ProposalVoteLikert for
  // why (the fallback defeats per-proposal Clear).
  const draft = $derived($draftsTree?.[ballot._id]?.[proposal._id] ?? null);

  const isAbstaining = $derived(draftIsAbstaining(draft));
  const hasSelection = $derived(draftHasSelection(draft));

  // Typing a number fires oninput per keystroke. Keep a local pending
  // allocation so the UI (input values, totalAllocated, sliders, Σ
  // button gating) reflects the voter's typing instantly, then
  // debounce the store write + toast. Cleared after the debounced save
  // commits so external store changes (bulk clear, cross-tab sync)
  // take over again.
  /** @type {import('$lib/voteSchema.js').SelectionEntry[] | null} */
  let pendingEntries = $state(null);
  let saveTimer = null;
  const SAVE_DEBOUNCE_MS = 200;

  /** @type {import('$lib/voteSchema.js').SelectionEntry[]} */
  const entries = $derived(pendingEntries ?? (hasSelection ? draft.selection : []));
  const totalAllocated = $derived(entries.reduce((s, e) => s + (Number(e.value) || 0), 0));
  const remaining = $derived(voterBudget - totalAllocated);
  const sumMatches = $derived(totalAllocated === voterBudget);
  const hasOverflow = $derived(totalAllocated > voterBudget);

  function valueFor(optionId) {
    const e = entries.find((e) => e.option === optionId);
    return e ? Number(e.value) : 0;
  }

  function setAllocation(optionId, raw) {
    if (disabled || isAbstaining) return;
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    // Zero-value entries are kept: schema v2 encourages one entry per
    // option so the wire payload is uniform even when the voter
    // allocated nothing to some options. Only when every option is
    // zero do we drop the draft entirely.
    const next = options.map((o) => ({
      option: o.id,
      value: o.id === optionId ? n : valueFor(o.id),
    }));
    pendingEntries = next;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const anyNonZero = next.some((e) => e.value > 0);
      if (!anyNonZero) {
        clearProposalDraft(ballot._id, proposal._id);
        pendingEntries = null;
        return;
      }
      const changed = saveProposalSelection(ballot._id, proposal._id, next);
      if (changed) toast.success('Allocation saved');
      // Release the local override — the derived chain takes over.
      pendingEntries = null;
    }, SAVE_DEBOUNCE_MS);
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
    // Drop any pending typed-but-not-yet-saved values so the form
    // snaps to the baseline immediately instead of waiting out the
    // debounce timer with stale local input.
    pendingEntries = null;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const changed = revertProposalDraftToBaseline(ballot._id, proposal._id);
    if (changed) toast.success('Reverted to your submitted vote');
  }

  function percentOf(value) {
    if (!voterBudget) return 0;
    return Math.min(100, (value / voterBudget) * 100);
  }
</script>

<div class="relative">
  <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
    <h3 class="text-base font-semibold">
      {hasSelection ? 'Your Allocation' : 'Allocate your budget'}
    </h3>
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {#if ballot.voteWeighted && !disabled && ballot.votingPower}
        <span class="font-mono tabular-nums">
          Voting Power: {lovelaceToAda(ballot.votingPower)}
        </span>
      {/if}
      <span
        class="font-mono tabular-nums {hasOverflow
          ? 'text-red-700'
          : sumMatches && hasSelection
            ? 'text-emerald-700'
            : ''}"
      >
        Allocated: {isAbstaining ? 0 : totalAllocated} of {voterBudget}
      </span>
    </div>
  </div>

  <div class={isAbstaining ? 'pointer-events-none opacity-50' : disabled ? 'opacity-60' : ''}>
    <table class="w-full border-collapse text-sm">
      <tbody>
        {#each options as option}
          {@const v = valueFor(option.id)}
          {@const pct = percentOf(v)}
          <tr class="border-t border-slate-100 align-top">
            <td class="py-2 pr-3">
              <div class="flex items-start gap-1.5">
                <Label class="leading-5" for={'voteWeighted-' + proposal._id + '-' + option.id}>
                  {option.label}
                </Label>
                <div class="shrink-0 pt-0.5">
                  <OptionDetails {option} />
                </div>
              </div>
              {#if option.description}
                <p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {option.description}
                </p>
              {/if}
            </td>
            <td class="w-36 py-2">
              <div class="flex items-center justify-end gap-1">
                <input
                  id={'voteWeighted-' + proposal._id + '-' + option.id}
                  type="number"
                  class="w-20 rounded-md border border-input bg-background px-2 py-1 text-right font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={0}
                  max={voterBudget}
                  step={1}
                  disabled={disabled || isAbstaining}
                  value={v}
                  onfocus={(e) => e.currentTarget.select()}
                  oninput={(e) => setAllocation(option.id, e.currentTarget.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 text-muted-foreground hover:text-orange-600"
                  disabled={disabled || isAbstaining || remaining <= 0}
                  onclick={() => setAllocation(option.id, v + remaining)}
                  aria-label="Add remaining {remaining} to {option.label}"
                  title={remaining > 0
                    ? `Add remaining ${remaining} to this option`
                    : 'No remaining budget to allocate'}
                >
                  <Sigma class="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </td>
            <td class="py-2 pl-3">
              <div
                class="relative h-1.5 w-full overflow-hidden rounded bg-slate-100"
                aria-hidden="true"
              >
                <div
                  class="h-full bg-orange-500 transition-[width] duration-200"
                  style="width: {pct}%"
                ></div>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if hasSelection && !sumMatches && !isAbstaining}
    <div
      class="mt-3 flex items-start gap-2 rounded-md border p-3 text-xs
				{hasOverflow
        ? 'border-red-300 bg-red-50 text-red-900'
        : 'border-amber-300 bg-amber-50 text-amber-900'}"
      role="status"
    >
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <div class="font-semibold">
          {hasOverflow ? 'Over budget' : 'Allocation incomplete'}
        </div>
        <p class="mt-0.5">
          {#if hasOverflow}
            You've allocated {totalAllocated - voterBudget} more than your budget of
            {voterBudget}. Reduce some values before submitting.
          {:else}
            Allocate exactly {voterBudget} across the options ({remaining} remaining) — partial allocations
            will be rejected on submission. Abstain if you'd prefer not to allocate at all.
          {/if}
        </p>
      </div>
    </div>
  {/if}

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

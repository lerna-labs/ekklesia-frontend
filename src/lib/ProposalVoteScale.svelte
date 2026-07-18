<script>
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

  let { proposal, ballot, disabled = false } = $props();

  // Schema v2 introduces `valueRange: {min, max, step}` as the canonical
  // shape for range-method questions. Pre-migration ballots still encode
  // the range as numeric `voteOptions[].id` with a `voteIncrement` step;
  // keep that fallback so a mixed-state backend doesn't break the UI.
  const rangeDef = $derived.by(() => {
    const vr = proposal?.valueRange;
    if (vr && Number.isFinite(Number(vr.min)) && Number.isFinite(Number(vr.max))) {
      return {
        min: Number(vr.min),
        max: Number(vr.max),
        step: Number(vr.step) || 1,
      };
    }
    const numericIds = (proposal?.voteOptions ?? [])
      .map((o) => Number(o.id))
      .filter((n) => Number.isFinite(n));
    return {
      min: numericIds.length ? Math.min(...numericIds) : 0,
      max: numericIds.length ? Math.max(...numericIds) : 100,
      step: Number(proposal?.voteIncrement) || 1,
    };
  });
  const min = $derived(rangeDef.min);
  const max = $derived(rangeDef.max);
  const step = $derived(rangeDef.step);
  const canAbstain = $derived(isAbstainAllowed(proposal));

  const anchors = $derived(
    (proposal?.voteOptions ?? [])
      .filter((o) => Number.isFinite(Number(o.id)))
      .sort((a, b) => Number(a.id) - Number(b.id)),
  );

  // Drafts are seeded from /mine by the page's synchronous seedBallotFromMine
  // call. No fallback to proposal.voterVote — see ProposalVoteLikert for
  // why (the fallback defeats per-proposal Clear).
  const draft = $derived($draftsTree?.[ballot._id]?.[proposal._id] ?? null);

  const isAbstaining = $derived(draftIsAbstaining(draft));
  const hasSelection = $derived(draftHasSelection(draft));
  const storedValue = $derived(hasSelection ? Number(draft.selection[0]) : null);

  // Slider / number input write at every tick while dragging or typing.
  // Keep `pendingValue` as a local override so the UI follows the input
  // instantly, then debounce the actual store write so we don't churn
  // localStorage + stack toasts for every intermediate position. `null`
  // means "no pending override — just show the stored value."
  let pendingValue = $state(null);
  let saveTimer = null;
  const SAVE_DEBOUNCE_MS = 200;

  const numericValue = $derived(pendingValue ?? storedValue);

  function clamp(n) {
    return Math.max(min, Math.min(max, Math.round((n - min) / step) * step + min));
  }

  function setNumeric(n) {
    if (disabled || isAbstaining) return;
    const v = clamp(n);
    pendingValue = v;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const changed = saveProposalSelection(ballot._id, proposal._id, [v]);
      if (changed) toast.success('Vote saved');
      // Release the local override now that the store reflects the
      // committed value — the derived chain takes over.
      pendingValue = null;
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
    // Drop pending typed-but-not-yet-saved value so the slider snaps
    // to the baseline instead of waiting out the debounce timer.
    pendingValue = null;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const changed = revertProposalDraftToBaseline(ballot._id, proposal._id);
    if (changed) toast.success('Reverted to your submitted vote');
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

  <div class={isAbstaining ? 'pointer-events-none opacity-50' : disabled ? 'opacity-60' : ''}>
    <div class="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span class="shrink-0 font-mono tabular-nums">{min}</span>
      <!-- Numeric input mirrors the slider — wide ranges (think
			     -1M..+1M step 1) can't practically be set via the slider
			     alone; a paired number input gives precise entry. -->
      <input
        type="number"
        class="w-28 rounded-md border border-input bg-background px-2 py-1 text-center font-mono text-lg tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        {min}
        {max}
        {step}
        disabled={disabled || isAbstaining}
        value={numericValue ?? ''}
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
      class="w-full accent-brand"
      {min}
      {max}
      {step}
      disabled={disabled || isAbstaining}
      value={numericValue ?? Math.round((min + max) / 2)}
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

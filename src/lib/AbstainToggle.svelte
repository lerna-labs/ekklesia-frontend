<script>
  import { Button } from '$lib/components/ui/button/index.js';
  import { MinusCircle, Eraser, UserX, Undo2 } from 'lucide-svelte';

  /**
   * Shared three-way draft-state controls that sit at the bottom of every
   * ProposalVote* card. Callers are responsible for rendering — and
   * disabling / fading — their own vote controls when `isAbstaining` is
   * true.
   *
   * Exposes three actions:
   *
   *   - Abstain: voter explicitly records no opinion. The backend tallies
   *     this in `abstainedByRole`. Clear warning copy — voting power does
   *     NOT count.
   *
   *   - Clear: voter removes the draft entirely. The question drops out
   *     of the submission payload (neither a selection nor an abstain).
   *     Distinct from abstain: no signal is sent at all.
   *
   *   - Revert: voter restores the submitted baseline (their previously-
   *     recorded selection on Hydra) into the draft, undoing any local
   *     edits. Only meaningful when this proposal has a server-side
   *     submission *and* the draft diverges from it.
   *
   * Abstain is hidden when the proposal opts out via schema-v2's
   * `requireAnswer: true` — at that point the only way to skip is to
   * simply not draft a vote at all.
   *
   * @typedef {object} Props
   * @property {boolean} isAbstaining       whether the current draft is `{ abstain: true }`
   * @property {boolean} hasSelection      whether a non-abstain draft exists
   * @property {boolean} canAbstain        false when proposal.requireAnswer === true
   * @property {boolean} [disabled]        ballot-level lock (closed / ineligible / etc.)
   * @property {boolean} [canRevert]       baseline exists AND draft differs from it
   * @property {() => void} onAbstain       enter abstaining state
   * @property {() => void} onResumeVoting  leave abstaining state (drops the abstain flag)
   * @property {() => void} onClear         wipe the draft entirely (neither selection nor abstain)
   * @property {() => void} [onRevert]      restore the submitted baseline into the draft
   */

  /** @type {Props} */
  let {
    isAbstaining,
    hasSelection,
    canAbstain,
    disabled = false,
    canRevert = false,
    onAbstain,
    onResumeVoting,
    onClear,
    onRevert,
  } = $props();

  // Every action button is gated on `!disabled` so a read-only vote form
  // (ballot closed, user ineligible, not logged in) hides the whole
  // abstain-action row instead of rendering disabled buttons the voter
  // can't interact with. The "You are abstaining" banner above still
  // surfaces when `isAbstaining` so prior-draft context isn't lost.
  const showAbstainButton = $derived(canAbstain && !isAbstaining && !disabled);
  const showResumeButton = $derived(isAbstaining && !disabled);
  const showClearButton = $derived(!disabled && (isAbstaining || hasSelection));
  const showRevertButton = $derived(!disabled && canRevert && typeof onRevert === 'function');
</script>

{#if isAbstaining}
  <div
    class="mt-3 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
    role="status"
  >
    <UserX class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
    <div class="flex-1">
      <div class="font-semibold">You are abstaining from this question</div>
      <p class="mt-0.5 text-xs">
        Your voting power will not be counted on this question. Your abstention is recorded
        separately from any per-option tally.
      </p>
    </div>
  </div>
{/if}

{#if showAbstainButton || showResumeButton || showClearButton || showRevertButton}
  <div class="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
    {#if showAbstainButton}
      <Button
        variant="outline"
        size="sm"
        {disabled}
        onclick={onAbstain}
        aria-label="Abstain from this question"
      >
        <MinusCircle class="h-4 w-4" aria-hidden="true" />
        Abstain from this question
      </Button>
    {/if}

    {#if showResumeButton}
      <Button variant="outline" size="sm" {disabled} onclick={onResumeVoting}>Resume voting</Button>
    {/if}

    {#if showRevertButton}
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-foreground"
        {disabled}
        onclick={onRevert}
        aria-label="Revert this draft to your previously-submitted vote"
        title="Restore the selection you previously submitted on-chain."
      >
        <Undo2 class="h-4 w-4" aria-hidden="true" />
        Revert to submitted
      </Button>
    {/if}

    {#if showClearButton}
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-foreground"
        {disabled}
        onclick={onClear}
        aria-label="Clear this draft"
      >
        <Eraser class="h-4 w-4" aria-hidden="true" />
        Clear
      </Button>
    {/if}

    {#if showAbstainButton}
      <p class="basis-full text-[11px] text-muted-foreground">
        Abstaining records no opinion and counts toward a separate abstention tally — distinct from
        clearing, which leaves the question out of your submission entirely.
      </p>
    {/if}
  </div>
{/if}

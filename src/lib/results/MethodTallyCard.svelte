<script>
  import GroupCardShell from './GroupCardShell.svelte';
  import DiscreteMethodTally from './DiscreteMethodTally.svelte';
  import RangeMethodTally from './RangeMethodTally.svelte';
  import RankedMethodTally from './RankedMethodTally.svelte';
  import WeightedMethodTally from './WeightedMethodTally.svelte';
  import LikertMethodTally from './LikertMethodTally.svelte';
  import { VOTE_METHODS } from '$lib/voteSchema.js';

  /**
   * Per-group renderer for Hydra's final results. Dispatches on the
   * question's `method` — the discriminated union described in
   * FRONTEND_BALLOT_SCHEMA_V2.md §3. Each per-method component owns
   * its own GroupCardShell wrapping (matching the provisional
   * renderers), so this file is a thin router.
   *
   * Per-group MethodTally is resolved from `result.roleResults[group.key]`.
   * The `method` discriminator lives on the tally itself (`tally.method`)
   * but can fall back to a top-level `result.method` if the backend
   * lifted it there for convenience.
   */
  let { group, ballot, proposal, result } = $props();

  const tally = $derived(result?.roleResults?.[group.key] ?? null);
  const method = $derived(tally?.method ?? result?.method ?? null);
</script>

{#if !tally}
  <GroupCardShell {group} {ballot}>
    {#snippet visualization()}
      <div
        class="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center md:h-full"
      >
        <p class="text-xs text-muted-foreground">Final tally not yet available for this group.</p>
      </div>
    {/snippet}
  </GroupCardShell>
{:else if method === VOTE_METHODS.BINARY || method === VOTE_METHODS.SINGLE_CHOICE || method === VOTE_METHODS.MULTI_CHOICE}
  <DiscreteMethodTally {tally} {group} {ballot} {proposal} />
{:else if method === VOTE_METHODS.RANGE}
  <RangeMethodTally {tally} {group} {ballot} {proposal} />
{:else if method === VOTE_METHODS.RANKED}
  <RankedMethodTally {tally} {group} {ballot} {proposal} />
{:else if method === VOTE_METHODS.WEIGHTED}
  <WeightedMethodTally {tally} {group} {ballot} {proposal} />
{:else if method === VOTE_METHODS.LIKERT}
  <LikertMethodTally {tally} {group} {ballot} {proposal} />
{:else}
  <GroupCardShell {group} {ballot}>
    {#snippet visualization()}
      <div
        class="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center md:h-full"
      >
        <p class="text-xs text-muted-foreground">
          Unknown tally method:
          <code class="font-mono">{method ?? '(none)'}</code>
        </p>
      </div>
    {/snippet}
  </GroupCardShell>
{/if}

<script>
  import { MinusCircle } from 'lucide-svelte';
  import { GROUP_ACCENTS, groupIdentity } from './groupResults.js';

  /**
   * Per-question panel for `abstainedByRole` — a separate signal from the
   * per-option tally. Voters who submit `{abstain: true}` at the question
   * level land here, NOT in any `MethodTally.results` row.
   *
   * Per FRONTEND_BALLOT_SCHEMA_V2.md §3: hidden entirely when the field is
   * absent or all-zero (Hydra omits it on questions with no abstentions).
   * Visual treatment is deliberately distinct from the per-option tally so
   * readers never fold it in — neutral slate with a divider from the
   * option tally above.
   */
  let { abstainedByRole = null } = $props();

  const entries = $derived.by(() => {
    if (!abstainedByRole || typeof abstainedByRole !== 'object') return [];
    return Object.entries(abstainedByRole)
      .map(([key, count]) => ({
        key,
        count: Number(count) || 0,
        identity: groupIdentity(key, key),
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  const total = $derived(entries.reduce((s, e) => s + e.count, 0));
</script>

{#if entries.length > 0}
  <section
    class="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
    aria-label="Abstentions by voter role"
  >
    <div class="mb-3 flex items-center gap-2">
      <MinusCircle class="h-4 w-4 text-slate-500" aria-hidden="true" />
      <h4 class="text-sm font-semibold text-slate-800">Abstentions</h4>
      <span class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Separate from per-option tally
      </span>
    </div>
    <p class="mb-3 text-xs text-muted-foreground">
      Voters who explicitly recorded no opinion on this question. Their voting power is not counted
      in the per-option results above — they're tallied here instead.
    </p>
    <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
      {#each entries as entry}
        {@const palette = GROUP_ACCENTS[entry.identity.accent]}
        <div class="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset {palette.chip} {palette.icon}"
          >
            {#if entry.identity.Icon}
              {@const Icon = entry.identity.Icon}
              <Icon class="h-4 w-4" aria-hidden="true" />
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {entry.identity.role}
            </div>
            <div class="whitespace-nowrap font-mono text-sm tabular-nums">
              {entry.count} abstained
            </div>
          </div>
        </div>
      {/each}
    </div>
    {#if entries.length > 1}
      <div class="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
        Total: {total} abstention{total === 1 ? '' : 's'} across roles
      </div>
    {/if}
  </section>
{/if}

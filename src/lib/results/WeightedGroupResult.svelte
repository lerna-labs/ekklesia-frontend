<script>
  import GroupCardShell from './GroupCardShell.svelte';
  import { GROUP_ACCENTS, groupIdentity, optionColor } from './groupResults.js';
  import { formatPercent, lovelaceToAdaCompact } from '$lib/utils.js';
  import { Scale } from 'lucide-svelte';
  import OptionDetails from '$lib/OptionDetails.svelte';

  /**
   * Per-group visualization for `weighted` (point-allocation) vote types,
   * consuming the backend's provisional aggregation shape:
   *
   *   group.weighted = {
   *     budget,             // per-voter point budget
   *     answeringBallots,   // voters who submitted a non-abstain allocation
   *     results: [{
   *       option, label,
   *       totalPoints, voterCount,         // count dimension
   *       mean, stdDev,                    // ditto, per answering ballot
   *       powerTotalPoints, powerMean      // voting-power dimension
   *     }]
   *   }
   *
   * Mean is defined per answering ballot — voters who allocated 0 to an
   * option count in the denominator as implicit zeros (matches Hydra's
   * schema-v2 `weighted.mean` semantics). A contributors-only mean is
   * derivable locally as `total / contributors`.
   */
  let { group, ballot, proposal } = $props();

  function optionFor(id) {
    if (!Array.isArray(proposal?.voteOptions)) return null;
    return proposal.voteOptions.find((o) => String(o.id) === String(id)) ?? null;
  }

  const weighted = $derived(group?.weighted ?? null);
  const hasWeighted = $derived(
    !!weighted && Array.isArray(weighted.results) && weighted.results.length > 0,
  );
  const hasWeight = $derived(!!ballot?.voteWeighted);
  const budget = $derived(Number(weighted?.budget) || 0);
  const answeringBallots = $derived(Number(weighted?.answeringBallots) || 0);

  let dimension = $state('count');

  function totalFor(opt) {
    return dimension === 'power'
      ? Number(opt?.powerTotalPoints) || 0
      : Number(opt?.totalPoints) || 0;
  }

  function meanFor(opt) {
    return dimension === 'power' ? Number(opt?.powerMean) || 0 : Number(opt?.mean) || 0;
  }

  // Sort by active dimension's total descending — leaders read top-down.
  const sortedOptions = $derived.by(() => {
    if (!hasWeighted) return [];
    return [...weighted.results].sort((a, b) => totalFor(b) - totalFor(a));
  });

  const sumTotals = $derived(sortedOptions.reduce((s, o) => s + totalFor(o), 0));

  // Abstain lives alongside the weighted aggregate in the group's
  // `results[]` (same synthetic-row convention as scale / ranked /
  // likert). Fold it into the split bar at the top.
  const abstainRow = $derived.by(() => {
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    return rows.find((r) => String(r.id).toLowerCase() === 'abstain') ?? null;
  });
  const abstainCount = $derived(abstainRow?.count ?? 0);
  const abstainPower = $derived(abstainRow?.votingPower ?? 0);

  const ABSTAIN_COLOR = '#1e293b';
  const accent = $derived(GROUP_ACCENTS[groupIdentity(group.key, group.label).accent]);
  const accentColor = $derived(accent.stroke);

  function fmtRaw(v) {
    if (dimension === 'power') return lovelaceToAdaCompact(v).replace(/\s*ADA$/, '');
    if (!Number.isFinite(v)) return '—';
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function fmt(n, digits = 2) {
    if (n == null || !Number.isFinite(n)) return '—';
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }

  // Tabulated values are per answering ballot; the "mass" a voter assigned
  // to an option is meaningful relative to the budget they started from.
  function meanPct(opt) {
    if (dimension === 'power') return 0;
    return budget > 0 ? ((Number(opt.mean) || 0) / budget) * 100 : 0;
  }

  function contributorsMean(opt) {
    const total = Number(opt?.totalPoints) || 0;
    const contributors = Number(opt?.voterCount) || 0;
    return contributors > 0 ? total / contributors : 0;
  }

  // Contributors-only mean only differs from the Hydra per-answering-
  // ballot mean when some voter allocated 0 to some option. If every
  // row has voterCount === answeringBallots, the two are identical on
  // every row and the column is visual noise.
  const hasZeroAllocations = $derived(
    answeringBallots > 0 &&
      sortedOptions.some((o) => (Number(o?.voterCount) || 0) !== answeringBallots),
  );
</script>

<GroupCardShell {group} {ballot}>
  {#snippet visualization()}
    {#if hasWeighted}
      <div class="flex h-full flex-col">
        {#if hasWeight}
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Point allocation
            </div>
            <div class="inline-flex rounded-md bg-slate-100 p-0.5 text-[10px]">
              <button
                type="button"
                class="rounded px-2 py-0.5 font-medium uppercase tracking-wider transition-colors {dimension ===
                'count'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}"
                onclick={() => (dimension = 'count')}
              >
                By voters
              </button>
              <button
                type="button"
                class="rounded px-2 py-0.5 font-medium uppercase tracking-wider transition-colors {dimension ===
                'power'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}"
                onclick={() => (dimension = 'power')}
              >
                By power
              </button>
            </div>
          </div>
        {:else}
          <div
            class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Point allocation
          </div>
        {/if}

        {#if abstainCount > 0}
          {@const allocVal = answeringBallots}
          {@const abstainVal = abstainCount}
          {@const total = allocVal + abstainVal}
          {@const allocPct = total ? (allocVal / total) * 100 : 0}
          {@const abstainPct = total ? (abstainVal / total) * 100 : 0}
          <div class="mb-3">
            <div
              class="relative flex h-2 w-full overflow-hidden rounded ring-1 ring-inset ring-slate-200"
              role="img"
              aria-label="Allocated vs abstained split"
            >
              {#if allocVal > 0}
                <div
                  class="h-full"
                  style="width: {allocPct}%; background-color: {accentColor};"
                ></div>
              {/if}
              {#if abstainVal > 0}
                <div
                  class="h-full"
                  style="width: {abstainPct}%; background-color: {ABSTAIN_COLOR};"
                ></div>
              {/if}
            </div>
            <div class="mt-1 flex flex-col gap-y-1 text-[10px]">
              <span
                class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground"
              >
                <span
                  class="inline-block h-2 w-2 rounded-sm"
                  style="background-color: {accentColor};"
                  aria-hidden="true"
                ></span>
                <span class="font-mono tabular-nums">{allocVal}</span>
                allocated
                <span class="font-mono tabular-nums">({formatPercent(allocPct, 1)})</span>
              </span>
              <span
                class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground"
              >
                <span
                  class="inline-block h-2 w-2 rounded-sm"
                  style="background-color: {ABSTAIN_COLOR};"
                  aria-hidden="true"
                ></span>
                <span class="font-mono tabular-nums">{abstainVal}</span>
                abstained
                <span class="font-mono tabular-nums">({formatPercent(abstainPct, 1)})</span>
              </span>
            </div>
          </div>
        {/if}

        <!-- Per-option allocation bars (sorted by active dimension total) -->
        <div class="space-y-2.5">
          {#each sortedOptions as opt, i}
            {@const total = totalFor(opt)}
            {@const pct = sumTotals ? (total / sumTotals) * 100 : 0}
            {@const color = optionColor(opt.label, i)}
            <div>
              <div class="mb-1 flex items-baseline justify-between gap-2">
                <span class="flex items-baseline gap-1.5 truncate text-xs">
                  <span class="font-mono text-[10px] font-semibold tabular-nums text-slate-500">
                    #{i + 1}
                  </span>
                  <span class="truncate font-medium">{opt.label}</span>
                </span>
                <span class="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {fmtRaw(total)}
                  <span class="ml-1">({formatPercent(pct, 1)})</span>
                </span>
              </div>
              <div
                class="relative h-2.5 w-full overflow-hidden rounded bg-slate-100"
                aria-hidden="true"
              >
                <div
                  class="h-full transition-[width] duration-500"
                  style="width: {Math.min(100, pct)}%; background-color: {color};"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center md:h-full"
      >
        <Scale class="h-8 w-8 text-slate-400" aria-hidden="true" />
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-600">
          No allocations in this group
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet details()}
    {#if hasWeighted}
      <div class="border-t pt-3">
        {#if budget > 0}
          <div
            class="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2 text-[11px]"
          >
            <span class="font-semibold text-slate-700">Budget per voter:</span>
            <span class="font-mono tabular-nums text-slate-900">{budget} points</span>
            {#if answeringBallots > 0}
              <span class="text-muted-foreground">
                · {answeringBallots} answering ballot{answeringBallots === 1 ? '' : 's'}
              </span>
            {/if}
          </div>
        {/if}
        <div class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Per-option statistics
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr
                class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                <th class="py-2 pr-2 text-left font-semibold">Option</th>
                <th class="px-2 py-2 text-right font-semibold">
                  {#if dimension === 'power'}
                    Total <span class="font-normal text-muted-foreground/70">(ADA)</span>
                  {:else}
                    Total pts
                  {/if}
                </th>
                <th
                  class="px-2 py-2 text-right font-semibold"
                  title="Mean per answering ballot — voters who allocated 0 count as implicit zeros"
                >
                  Mean
                </th>
                {#if dimension === 'count'}
                  <th class="px-2 py-2 text-right font-semibold">Std dev</th>
                  {#if hasZeroAllocations}
                    <th
                      class="px-2 py-2 text-right font-semibold"
                      title="Contributors-only mean: total / voters who allocated > 0"
                    >
                      Contrib. mean
                    </th>
                  {/if}
                {/if}
                <th
                  class="py-2 pl-2 text-right font-semibold"
                  title="Voters who allocated > 0 to this option"
                >
                  Contributors
                </th>
              </tr>
            </thead>
            <tbody>
              {#each sortedOptions as opt}
                {@const origOpt = optionFor(opt.option)}
                <tr class="border-t border-slate-100">
                  <td class="py-2 pr-2 font-medium">
                    <span class="inline-flex items-center gap-1.5">
                      {opt.label}
                      {#if origOpt}
                        <OptionDetails option={origOpt} />
                      {/if}
                    </span>
                  </td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums">
                    {fmtRaw(totalFor(opt))}
                  </td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums">
                    {fmtRaw(meanFor(opt))}
                    {#if dimension === 'count' && budget > 0}
                      <span class="ml-1 text-[10px] text-muted-foreground">
                        ({formatPercent(meanPct(opt), 0)})
                      </span>
                    {/if}
                  </td>
                  {#if dimension === 'count'}
                    <td class="px-2 py-2 text-right font-mono tabular-nums">
                      {fmt(opt.stdDev, 2)}
                    </td>
                    {#if hasZeroAllocations}
                      <td class="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {fmt(contributorsMean(opt), 2)}
                      </td>
                    {/if}
                  {/if}
                  <td class="py-2 pl-2 text-right font-mono tabular-nums">
                    {opt.voterCount ?? 0}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-[10px] italic text-muted-foreground">
          <strong>Mean</strong> is per answering ballot — voters who allocated 0 to an option count
          in the denominator as implicit zeros. The parenthesized percent shows the mean as a share
          of the voter budget.
          <strong>Std dev</strong> measures how much voters disagreed on this option's allocation —
          low values indicate consensus, high values indicate divided opinion. Shares the same
          per-answering-ballot denominator, so implicit zeros from voters who skipped this option
          widen the spread.
          {#if hasZeroAllocations}
            <strong>Contrib. mean</strong> is the contributors-only average (<code
              >total / contributors</code
            >) — useful to read alongside the Hydra mean when some voters skipped this option
            entirely.
          {/if}
          The voting authority publishes the canonical interpretation of these numbers.
        </p>
      </div>
    {/if}
  {/snippet}
</GroupCardShell>

<script>
  import GroupCardShell from './GroupCardShell.svelte';
  import Histogram from '$lib/charts/Histogram.svelte';
  import { GROUP_ACCENTS, groupIdentity } from './groupResults.js';
  import { BarChart3 } from 'lucide-svelte';

  /**
   * MethodTally renderer for `range`. Consumes `tally.distribution` —
   * one DistributionEntry (`{value, count}`) per grid position — plus
   * `tally.stats` (n / mean / median / min / max / stdDev).
   *
   * The x-axis is discrete: each bin is a single grid position, not a
   * bucketed range. The Histogram chart is fed single-point bucket
   * objects so label rendering still works.
   */
  let { tally, group, ballot } = $props();

  const distribution = $derived(Array.isArray(tally?.distribution) ? tally.distribution : []);
  const stats = $derived(tally?.stats ?? null);
  const hasData = $derived(distribution.length > 0);

  const accent = $derived(GROUP_ACCENTS[groupIdentity(group.key, group.label).accent]);

  const buckets = $derived(
    distribution.map((d) => ({
      bucketMin: Number(d.value),
      bucketMax: Number(d.value),
      count: Number(d.count) || 0,
      power: 0,
    })),
  );

  function fmt(n, digits = 2) {
    if (n == null || !Number.isFinite(n)) return '—';
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }
</script>

<GroupCardShell {group} {ballot}>
  {#snippet visualization()}
    {#if hasData}
      <div class="flex h-full flex-col">
        <div class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Distribution
        </div>
        <div class="h-40 w-full md:h-44">
          <Histogram
            {buckets}
            dimension="count"
            color={accent.stroke}
            medianMark={stats?.median ?? null}
            ariaLabel="{group.label} range distribution"
          />
        </div>
        {#if stats}
          <div
            class="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground"
          >
            <span>{fmt(stats.min)}</span>
            <span>{fmt(stats.max)}</span>
          </div>
        {/if}
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center md:h-full"
      >
        <BarChart3 class="h-8 w-8 text-slate-400" aria-hidden="true" />
        <div class="space-y-1">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-600">
            No range votes in this group
          </div>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet details()}
    {#if stats}
      <div class="border-t pt-3">
        <div
          class="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
        >
          <span>Descriptive statistics</span>
          <span class="font-mono tabular-nums">n = {stats.n ?? 0}</span>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Mean
            </dt>
            <dd class="font-mono tabular-nums">{fmt(stats.mean, 2)}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Median
            </dt>
            <dd class="font-mono tabular-nums">{fmt(stats.median, 2)}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Std dev
            </dt>
            <dd class="font-mono tabular-nums">{fmt(stats.stdDev, 2)}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Range
            </dt>
            <dd class="font-mono tabular-nums">{fmt(stats.min)} to {fmt(stats.max)}</dd>
          </div>
        </dl>
      </div>
    {/if}
  {/snippet}
</GroupCardShell>

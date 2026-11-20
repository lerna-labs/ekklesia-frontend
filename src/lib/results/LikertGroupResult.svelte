<script>
  import GroupCardShell from './GroupCardShell.svelte';
  import { GROUP_ACCENTS, groupIdentity } from './groupResults.js';
  import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
  import { BarChart3 } from 'lucide-svelte';
  import OptionDetails from '$lib/OptionDetails.svelte';

  /**
   * Per-group visualization for `likert` vote types, consuming the
   * backend's provisional aggregation shape:
   *
   *   group.likert = {
   *     ratingRange: { min, max, step },
   *     options: [{
   *       id, label,
   *       stats:         { count, mean, median, mode, stdDev, distribution:[c1..cN] },
   *       weightedStats: { count, mean, median, mode, stdDev, powerDistribution:[p1..pN], totalPower }
   *     }]
   *   }
   *
   * Options render in ballot-declared order. The card deliberately does
   * NOT impose an ordering on top of the raw data — Likert interpretation
   * (Majority Judgment, median-grade ranking, any winner declaration)
   * is the voting authority's responsibility, not the renderer's. Each
   * row shows a stacked distribution bar colored by rating grade plus
   * descriptive statistics.
   *
   * Final Hydra results go through a distinct `LikertMethodTally` path
   * (see GroupResultCard routing); this component is strictly the
   * provisional renderer.
   */
  let { group, ballot, proposal } = $props();

  function optionFor(id) {
    if (!Array.isArray(proposal?.voteOptions)) return null;
    return proposal.voteOptions.find((o) => String(o.id) === String(id)) ?? null;
  }

  const hasWeight = $derived(!!ballot?.voteWeighted);
  const likert = $derived(group?.likert ?? null);
  const options = $derived(Array.isArray(likert?.options) ? likert.options : []);
  const hasLikert = $derived(options.length > 0);

  const rangeDef = $derived({
    min: Number(likert?.ratingRange?.min) || 1,
    max: Number(likert?.ratingRange?.max) || 5,
    step: Number(likert?.ratingRange?.step) || 1,
  });

  const grades = $derived.by(() => {
    const out = [];
    for (let v = rangeDef.min; v <= rangeDef.max + 1e-9; v += rangeDef.step) {
      out.push(Math.round(v * 1e6) / 1e6);
    }
    return out;
  });

  // Abstain split bar — backend parks abstainers in results[] as a
  // synthetic row, same convention as scale / ranked.
  const abstainRow = $derived.by(() => {
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    return rows.find((r) => String(r.id).toLowerCase() === 'abstain') ?? null;
  });
  const abstainCount = $derived(abstainRow?.count ?? 0);
  const abstainPower = $derived(abstainRow?.votingPower ?? 0);

  // Every voter rates every option, so per-option count and totalPower
  // are identical across rows — read the first option's stats as the
  // group-level rated total.
  const ratedCount = $derived(options[0]?.stats?.count ?? 0);
  const ratedPower = $derived(options[0]?.weightedStats?.totalPower ?? 0);

  const ABSTAIN_COLOR = '#1e293b';
  const accent = $derived(GROUP_ACCENTS[groupIdentity(group.key, group.label).accent]);
  const ratedColor = $derived(accent.stroke);

  let dimension = $state('count');

  function gradeColor(i, total) {
    // Red → yellow → green across the rating spectrum. Low grades
    // (i=0) are "least preferred" → red-ish; high grades (i=total-1)
    // are "most preferred" → green. HSL hue 10 (red) → 140 (green).
    if (total <= 1) return 'hsl(10, 70%, 55%)';
    const ratio = i / (total - 1);
    const hue = 10 + ratio * 130;
    return `hsl(${Math.round(hue)}, 70%, 55%)`;
  }

  function distributionFor(opt) {
    if (dimension === 'power') return opt?.weightedStats?.powerDistribution ?? [];
    return opt?.stats?.distribution ?? [];
  }

  function totalFor(dist) {
    return dist.reduce((s, v) => s + (Number(v) || 0), 0);
  }

  function fmt(n, digits = 2) {
    if (n == null || !Number.isFinite(n)) return '—';
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }

  function fmtMode(mode) {
    if (mode == null) return '—';
    if (Array.isArray(mode)) return mode.join(', ');
    return String(mode);
  }

  function gradeLabelFor(grade) {
    // Ratings can optionally ship labels on the proposal data
    // (proposal.data.ratingLabels). Those aren't forwarded to the
    // result document, so the visualization just labels numerically.
    return String(grade);
  }

  // Resolve the active-dimension distribution + total for an option.
  // Honors the "By voters / By power" card toggle so weighted MJ math
  // matches what the voting authority sees when they flip to power.
  function distributionAndTotal(opt) {
    if (dimension === 'power') {
      return {
        dist: opt?.weightedStats?.powerDistribution ?? [],
        total: Number(opt?.weightedStats?.totalPower) || 0,
      };
    }
    return {
      dist: opt?.stats?.distribution ?? [],
      total: Number(opt?.stats?.count) || 0,
    };
  }

  // For each grade column, work out which option would win the
  // Majority Judgment tiebreaker if that grade were the candidate
  // median. Runs against whichever dimension (count vs. voting power)
  // is currently active.
  //
  // Hierarchical tiebreaker per the voting-authority spec:
  //   1. Higher support (share above this grade) wins.
  //   2. If tied on support, lower opposition (share below) wins.
  //   3. If still tied, ties remain — the "higher parameter value" rule
  //      some ballots apply is ballot-specific and not implemented
  //      generically; tied options are all flagged so the authority can
  //      break the final tie themselves.
  //
  // Returns Map<gradeIndex, Set<optionId>>. Set size > 1 ⇒ a genuine
  // tie after both support AND opposition — rendered amber at the
  // render layer, distinct from the emerald used for a unique winner.
  function computeColumnWinners() {
    const result = new Map();
    if (!hasLikert) return result;
    for (let gi = 0; gi < grades.length; gi++) {
      let bestP = -Infinity;
      let bestQ = Infinity;
      let winners = new Set();
      for (const opt of options) {
        const { dist, total } = distributionAndTotal(opt);
        if (!total) continue;
        const vals = grades.map((_g, i) => Number(dist[i]) || 0);
        const above = vals.slice(gi + 1).reduce((s, v) => s + v, 0);
        const below = vals.slice(0, gi).reduce((s, v) => s + v, 0);
        const p = above / total;
        const q = below / total;
        // Primary: higher p. Secondary: lower q (only when p ties).
        if (p > bestP || (p === bestP && q < bestQ)) {
          bestP = p;
          bestQ = q;
          winners = new Set([opt.id]);
        } else if (p === bestP && q === bestQ) {
          winners.add(opt.id);
        }
      }
      result.set(gi, winners);
    }
    return result;
  }

  const columnWinners = $derived(computeColumnWinners());

  // Render a raw per-grade value — count as plain number, power as
  // truncated numeric (no "ADA" suffix; the unit is implicit and the
  // table is too dense for suffix labels without wrapping).
  function fmtRaw(v) {
    if (dimension === 'power') {
      // Strip the "ADA" suffix from lovelaceToAdaCompact — every
      // power cell shares the unit, so labeling each one wastes
      // space and causes wrap.
      return lovelaceToAdaCompact(v).replace(/\s*ADA$/, '');
    }
    return String(v);
  }

  /**
   * Copy-event handler on the distribution table: when a voting authority
   * selects cells and copies, swap the on-screen truncated values (e.g.
   * "1.2M") for the full lovelace amounts stashed in each cell's
   * `data-full` attribute. Emits tab-separated rows so spreadsheet software
   * parses the paste as a table.
   *
   * `text/plain` only — most spreadsheet apps happily ingest TSV. We could
   * also emit `text/html`, but that tends to bring unwanted styling along
   * for the ride; plain text lets the target tool apply its own formatting.
   */
  function handleDistributionCopy(ev) {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    // Replace every element carrying a `data-full` attribute with that
    // attribute's value, so precision survives the copy.
    container.querySelectorAll('[data-full]').forEach((el) => {
      el.textContent = el.getAttribute('data-full') ?? el.textContent ?? '';
    });

    // If the selection spans table rows, stitch them as TSV; otherwise
    // fall through to the cloned text content.
    const rows = container.querySelectorAll('tr');
    let text;
    if (rows.length > 0) {
      text = Array.from(rows)
        .map((row) =>
          Array.from(row.querySelectorAll('td, th'))
            .map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
            .join('\t'),
        )
        .join('\n');
    } else {
      text = (container.textContent || '').replace(/\s+/g, ' ').trim();
    }
    if (!text) return;

    ev.clipboardData?.setData('text/plain', text);
    ev.preventDefault();
  }
</script>

<GroupCardShell {group} {ballot}>
  {#snippet visualization()}
    {#if hasLikert}
      <div class="flex h-full flex-col">
        {#if hasWeight}
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Rating distribution
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
            Rating distribution
          </div>
        {/if}

        {#if abstainCount > 0}
          {@const ratedVal = dimension === 'power' ? ratedPower : ratedCount}
          {@const abstainVal = dimension === 'power' ? abstainPower : abstainCount}
          {@const total = ratedVal + abstainVal}
          {@const ratedPct = total ? (ratedVal / total) * 100 : 0}
          {@const abstainPct = total ? (abstainVal / total) * 100 : 0}
          <div class="mb-3">
            <div
              class="relative flex h-2 w-full overflow-hidden rounded ring-1 ring-inset ring-slate-200"
              role="img"
              aria-label="Rated vs abstained split"
            >
              {#if ratedVal > 0}
                <div
                  class="h-full"
                  style="width: {ratedPct}%; background-color: {ratedColor};"
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
                  style="background-color: {ratedColor};"
                  aria-hidden="true"
                ></span>
                <span class="font-mono tabular-nums">
                  {dimension === 'power' ? lovelaceToAdaCompact(ratedVal) : ratedVal}
                </span>
                rated
                <span class="font-mono tabular-nums">({formatPercent(ratedPct, 1)})</span>
              </span>
              <span
                class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground"
              >
                <span
                  class="inline-block h-2 w-2 rounded-sm"
                  style="background-color: {ABSTAIN_COLOR};"
                  aria-hidden="true"
                ></span>
                <span class="font-mono tabular-nums">
                  {dimension === 'power' ? lovelaceToAdaCompact(abstainVal) : abstainVal}
                </span>
                abstained
                <span class="font-mono tabular-nums">({formatPercent(abstainPct, 1)})</span>
              </span>
            </div>
          </div>
        {/if}

        <!-- Grade legend -->
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          {#each grades as grade, i}
            <span class="inline-flex items-center gap-1 text-muted-foreground">
              <span
                class="inline-block h-2 w-2 rounded-sm"
                style="background-color: {gradeColor(i, grades.length)};"
                aria-hidden="true"
              ></span>
              {gradeLabelFor(grade)}
            </span>
          {/each}
        </div>

        <!-- Per-option stacked bars, ballot-declared order. -->
        <div class="space-y-2.5">
          {#each options as opt}
            {@const dist = distributionFor(opt)}
            {@const total = totalFor(dist)}
            {@const s = dimension === 'power' ? opt.weightedStats : opt.stats}
            <div>
              <div class="mb-1 flex items-baseline justify-between gap-2">
                <span class="truncate text-xs font-medium">{opt.label}</span>
                <span class="font-mono text-[10px] tabular-nums text-muted-foreground">
                  median {fmt(s?.median, 1)}
                </span>
              </div>
              <div
                class="relative flex h-3.5 w-full overflow-hidden rounded bg-slate-50 ring-1 ring-inset ring-slate-200"
                role="img"
                aria-label="Rating distribution for {opt.label}"
              >
                {#if total === 0}
                  <div class="flex-1"></div>
                {:else}
                  {#each dist as v, i}
                    {@const pct = total ? ((Number(v) || 0) / total) * 100 : 0}
                    {#if pct > 0}
                      <div
                        class="h-full transition-[width] duration-500"
                        style="width: {pct}%; background-color: {gradeColor(i, dist.length)};"
                        title="Grade {gradeLabelFor(grades[i])}: {dimension === 'power'
                          ? lovelaceToAda(v)
                          : `${v} voter${v === 1 ? '' : 's'}`} ({formatPercent(pct, 1)})"
                      ></div>
                    {/if}
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center md:h-full"
      >
        <BarChart3 class="h-8 w-8 text-slate-400" aria-hidden="true" />
        <div class="space-y-1">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Rating distribution pending
          </div>
          <div class="max-w-[30ch] text-xs text-muted-foreground">
            Likert aggregates will appear here after the next tally run.
          </div>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet details()}
    {#if hasLikert}
      <div class="border-t pt-3">
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
                <th class="px-2 py-2 text-right font-semibold">Mean</th>
                <th class="px-2 py-2 text-right font-semibold">Median</th>
                <th class="px-2 py-2 text-right font-semibold">Mode</th>
                <th class="px-2 py-2 text-right font-semibold">Std dev</th>
                <th class="px-2 py-2 text-right font-semibold">n</th>
              </tr>
            </thead>
            <tbody>
              {#each options as opt}
                {@const s = dimension === 'power' ? opt.weightedStats : opt.stats}
                {@const origOpt = optionFor(opt.id)}
                <tr class="border-t border-slate-100">
                  <td class="py-2 pr-2 font-medium">
                    <span class="inline-flex items-center gap-1.5">
                      {opt.label}
                      {#if origOpt}
                        <OptionDetails option={origOpt} />
                      {/if}
                    </span>
                  </td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums">{fmt(s?.mean, 2)}</td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums">{fmt(s?.median, 1)}</td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums">{fmtMode(s?.mode)}</td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums">{fmt(s?.stdDev, 2)}</td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums">{s?.count ?? 0}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Raw per-grade distribution for voting authorities and auditors
				     who need to tabulate Majority Judgment (or any other
				     rating-aggregation rule) themselves. Each grade header spans
				     two body columns — one for the raw value at that grade, one
				     for the above/below percentages (support/opposition if the
				     grade is treated as MJ median). Separate <td>s so the table
				     copy-pastes cleanly into spreadsheet software without merged
				     cells. Honors the card's "By voters / By power" toggle — the
				     values and the tiebreaker-winner highlight both reflect the
				     active dimension. -->
        <details class="mt-3 rounded-md border border-slate-200 bg-slate-50/60">
          <summary
            class="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            Full grade distribution ({dimension === 'power'
              ? 'weighted by voting power'
              : 'unweighted'}) — expand for MJ tabulation
          </summary>
          <div class="border-t border-slate-200 p-3">
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-xs" oncopy={handleDistributionCopy}>
                <thead>
                  <tr
                    class="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    <th class="py-2 pr-2 text-left font-semibold" rowspan="2">Option</th>
                    {#each grades as grade, i}
                      <th class="px-2 py-2 text-center font-semibold" colspan="2">
                        <span class="inline-flex items-center justify-center gap-1">
                          <span
                            class="inline-block h-2 w-2 rounded-sm"
                            style="background-color: {gradeColor(i, grades.length)};"
                            aria-hidden="true"
                          ></span>
                          {gradeLabelFor(grade)}
                        </span>
                      </th>
                    {/each}
                    <th class="py-2 pl-2 text-right font-semibold" rowspan="2">n</th>
                  </tr>
                  <tr
                    class="border-b border-slate-200 text-[10px] font-medium normal-case tracking-normal text-muted-foreground"
                  >
                    {#each grades as _grade}
                      <th
                        class="px-2 py-1 text-right font-normal"
                        title={dimension === 'power'
                          ? 'Voting power (ADA) that gave this grade'
                          : 'Voters who gave this grade'}
                      >
                        {#if dimension === 'power'}
                          power <span class="text-muted-foreground/70">(ADA)</span>
                        {:else}
                          count
                        {/if}
                      </th>
                      <th
                        class="px-2 py-1 text-right font-normal"
                        title={dimension === 'power'
                          ? 'Power above / below this grade (support / opposition if treated as MJ median)'
                          : 'Voters above / below this grade (support / opposition if treated as MJ median)'}
                      >
                        ↑ / ↓
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each options as opt}
                    {@const dt = distributionAndTotal(opt)}
                    {@const vals = grades.map((_g, i) => Number(dt.dist[i]) || 0)}
                    <tr class="border-t border-slate-100">
                      <td class="py-2 pr-2 font-medium">{opt.label}</td>
                      {#each grades as _grade, i}
                        {@const c = vals[i]}
                        {@const above = vals.slice(i + 1).reduce((s, v) => s + v, 0)}
                        {@const below = vals.slice(0, i).reduce((s, v) => s + v, 0)}
                        {@const abovePct = dt.total ? (above / dt.total) * 100 : 0}
                        {@const belowPct = dt.total ? (below / dt.total) * 100 : 0}
                        {@const colWinners = columnWinners.get(i)}
                        {@const wins = colWinners?.has(opt.id) ?? false}
                        {@const tied = (colWinners?.size ?? 0) > 1}
                        {@const winClass = wins ? (tied ? 'bg-amber-50' : 'bg-emerald-50') : ''}
                        {@const winText = wins
                          ? tied
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                          : ''}
                        <td
                          class="px-2 py-2 text-right font-mono tabular-nums {winClass}"
                          title={wins
                            ? tied
                              ? 'Tied on support and opposition — apply the ballot\u2019s remaining tiebreaker rules to pick a winner'
                              : 'MJ tiebreaker winner if this grade is the candidate median'
                            : null}
                          data-full={dimension === 'power' ? String(c) : null}
                        >
                          {#if wins}
                            <span class={winText}>{fmtRaw(c)}</span>
                          {:else}
                            {fmtRaw(c)}
                          {/if}
                        </td>
                        <td
                          class="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground {winClass}"
                        >
                          <div class="whitespace-nowrap">↑{formatPercent(abovePct, 0)}</div>
                          <div class="whitespace-nowrap">↓{formatPercent(belowPct, 0)}</div>
                        </td>
                      {/each}
                      <td
                        class="py-2 pl-2 text-right font-mono tabular-nums"
                        data-full={dimension === 'power' ? String(dt.total) : null}
                        >{fmtRaw(dt.total)}</td
                      >
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-[10px] italic text-muted-foreground">
              Each grade has two columns: the raw {dimension === 'power' ? 'voting power' : 'count'} at
              that grade, and the <em>above</em> / <em>below</em> percentages — support / opposition
              if the grade is treated as the candidate MJ median. Columns are discrete
              <code>td</code>s for clean spreadsheet copy. A
              <span class="rounded bg-emerald-50 px-1 py-[1px] text-emerald-700"> green cell </span>
              marks a unique MJ tiebreaker winner for that candidate median — higher support, or lower
              opposition when support ties. An
              <span class="rounded bg-amber-50 px-1 py-[1px] text-amber-700"> amber cell </span>
              marks options that tied on both support AND opposition — apply the ballot's remaining tiebreaker
              rules to resolve. Toggle "By power" above to run the same tabulation against weighted voting
              power.
            </p>
          </div>
        </details>

        <p class="mt-2 text-[10px] italic text-muted-foreground">
          The voting authority publishes the canonical interpretation of these ratings — this card
          presents the raw per-option distribution and descriptive statistics only, in
          ballot-declared order.
        </p>
      </div>
    {/if}
  {/snippet}
</GroupCardShell>

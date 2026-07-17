<script>
  import GroupCardShell from './GroupCardShell.svelte';
  import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
  import { ListOrdered } from 'lucide-svelte';
  import OptionDetails from '$lib/OptionDetails.svelte';
  import { brandColor } from '$lib/base/brandColor.js';

  /**
   * Per-group visualization for `ranked` (ranked-choice) vote types.
   *
   * Backend shape (per BACKEND_RESULTS_AGGREGATION.md):
   *   group.ranked = {
   *     rankDepth: <int>,
   *     rows: [{
   *       id, label,
   *       counts:   [<count at rank 1>, ..., <count at rank N>],
   *       power:    [...],                 // voting-power weighted
   *       unranked: { count, power }
   *     }]
   *   }
   *
   * Renders each option as a full-width stacked horizontal bar. Segments
   * read left-to-right as rank 1, rank 2, …, then unranked in a muted
   * slate. First-choice dominance shows as a long leftmost segment;
   * "compromise consensus" options read as broad middle segments with
   * little unranked tail.
   */
  let { group, ballot, proposal } = $props();

  function optionFor(id) {
    if (!Array.isArray(proposal?.voteOptions)) return null;
    return proposal.voteOptions.find((o) => String(o.id) === String(id)) ?? null;
  }

  const hasWeight = $derived(!!ballot?.voteWeighted);
  const hasRanked = $derived(
    !!group.ranked && Array.isArray(group.ranked.rows) && group.ranked.rows.length > 0,
  );
  const rankDepth = $derived(group.ranked?.rankDepth ?? 0);

  // Abstention: voters who abstained are filtered out of ranked.rows by
  // the backend cron and parked in results[] as the Abstain row. We
  // visualize the split so stake that chose to abstain isn't hidden
  // from the reader. (Final-results view has a dedicated
  // AbstainedByRolePanel rendered at page level.)
  const abstainRow = $derived.by(() => {
    // The page's `groups` derivation forwards the results array as
    // `group.rows` (sorted copy). Older `group.results` is never set.
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    return rows.find((r) => r.id === 'abstain') ?? null;
  });
  const abstainCount = $derived(abstainRow?.count ?? 0);
  const abstainPower = $derived(abstainRow?.votingPower ?? 0);
  // Each voter appears exactly once at rank-1 across options, so the sum
  // of first-rank counts/power is the distinct-voter count/power who
  // ranked anything on this proposal.
  const rankedCount = $derived(
    (group.ranked?.rows ?? []).reduce((s, r) => s + (r.counts?.[0] || 0), 0),
  );
  const rankedPower = $derived(
    (group.ranked?.rows ?? []).reduce((s, r) => s + (r.power?.[0] || 0), 0),
  );
  const ABSTAIN_COLOR = '#1e293b';
  // Rank-1 / accent both read brand. The deployment's `--brand-hover` flows
  // into anything tied to the "winner" position.
  const RANKED_ACCENT = brandColor('brand-hover');

  // Dimension toggle mirrors the scale card: count vs voting power. Only
  // available when the ballot is weighted.
  let dimension = $state('count');

  // Rank-position palette. Rank 1 leads with the deployment's brand colour
  // (the "winner" position); subsequent ranks step into curated contrasting
  // hues rather than a single-hue tint ramp so adjacent ranks read as
  // distinct at a glance. All 700-weight for consistent visual mass.
  // (Ranks 2-8 are intentionally not themed — they're a fixed distinct-hue
  // palette, independent of brand.)
  const RANK_COLORS = [
    brandColor('brand-hover'), // rank 1 — brand / winner
    '#1d4ed8', // rank 2 — blue-700
    '#047857', // rank 3 — emerald-700
    '#be123c', // rank 4 — rose-700
    '#6d28d9', // rank 5 — violet-700
    '#0e7490', // rank 6 — cyan-700
    '#a21caf', // rank 7 — fuchsia-700
    '#a16207', // rank 8 — yellow-700
  ];
  const UNRANKED_COLOR = '#94a3b8'; // slate-400 — clearly "not a rank"

  function rankColor(i) {
    return RANK_COLORS[i] ?? RANK_COLORS[RANK_COLORS.length - 1];
  }

  // Sort rows by first-choice dominance on the active dimension so the
  // strongest option reads top. Keep ballot-declared order as a
  // secondary tiebreaker via stable sort.
  const sortedRows = $derived.by(() => {
    if (!hasRanked) return [];
    const rows = group.ranked.rows.map((r, idx) => ({ ...r, _originalIdx: idx }));
    return rows.sort((a, b) => {
      const va = dimension === 'power' ? (a.power?.[0] ?? 0) : (a.counts?.[0] ?? 0);
      const vb = dimension === 'power' ? (b.power?.[0] ?? 0) : (b.counts?.[0] ?? 0);
      if (vb !== va) return vb - va;
      return a._originalIdx - b._originalIdx;
    });
  });

  // Per-option segment data for rendering. Each segment carries width%
  // and a color; unranked always trails at the right.
  function segmentsFor(row) {
    const arr = dimension === 'power' ? row.power || [] : row.counts || [];
    const unrankedVal =
      dimension === 'power' ? (row.unranked?.power ?? 0) : (row.unranked?.count ?? 0);
    const total = arr.reduce((s, v) => s + (v || 0), 0) + unrankedVal;
    if (total === 0) return { total: 0, segments: [] };
    const segments = [];
    arr.forEach((v, i) => {
      if (!v) return;
      segments.push({
        kind: 'rank',
        rank: i + 1,
        value: v,
        pct: (v / total) * 100,
        color: rankColor(i),
      });
    });
    if (unrankedVal > 0) {
      segments.push({
        kind: 'unranked',
        value: unrankedVal,
        pct: (unrankedVal / total) * 100,
        color: UNRANKED_COLOR,
      });
    }
    return { total, segments };
  }

  function formatValue(v) {
    return dimension === 'power' ? lovelaceToAda(v) : `${v} vote${v === 1 ? '' : 's'}`;
  }

  // --- Auditor disclosure helpers ---

  function rankLabel(i) {
    const n = i + 1;
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  }

  function countAtRank(row, i) {
    return Number(row?.counts?.[i]) || 0;
  }

  function powerAtRank(row, i) {
    return Number(row?.power?.[i]) || 0;
  }

  function unrankedValue(row) {
    return dimension === 'power'
      ? Number(row?.unranked?.power) || 0
      : Number(row?.unranked?.count) || 0;
  }

  function valueAt(row, i) {
    return dimension === 'power' ? powerAtRank(row, i) : countAtRank(row, i);
  }

  function totalFor(row) {
    let sum = 0;
    for (let i = 0; i < rankDepth; i++) sum += valueAt(row, i);
    sum += unrankedValue(row);
    return sum;
  }

  // Compact-no-suffix for power (same trick as Likert) so narrow cells
  // don't wrap. The unit lives on the column header.
  function fmtRaw(v) {
    if (dimension === 'power') return lovelaceToAdaCompact(v).replace(/\s*ADA$/, '');
    return String(v);
  }

  // Copy-event handler on the disclosure table: swap on-screen truncated
  // values for the full lovelace amounts stashed in `data-full` so a
  // paste into a spreadsheet carries precision.
  function handleDistributionCopy(ev) {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    container.querySelectorAll('[data-full]').forEach((el) => {
      el.textContent = el.getAttribute('data-full') ?? el.textContent ?? '';
    });
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
    {#if hasRanked}
      <div class="flex h-full flex-col">
        {#if hasWeight}
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Rank distribution
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
            Rank distribution
          </div>
        {/if}

        {#if abstainCount > 0}
          {@const rankedVal = dimension === 'power' ? rankedPower : rankedCount}
          {@const abstainVal = dimension === 'power' ? abstainPower : abstainCount}
          {@const total = rankedVal + abstainVal}
          {@const rankedPct = total ? (rankedVal / total) * 100 : 0}
          {@const abstainPct = total ? (abstainVal / total) * 100 : 0}
          <div class="mb-3">
            <div
              class="relative flex h-2 w-full overflow-hidden rounded ring-1 ring-inset ring-slate-200"
              role="img"
              aria-label="Ranked vs abstained split"
            >
              {#if rankedVal > 0}
                <div
                  class="h-full"
                  style="width: {rankedPct}%; background-color: {RANKED_ACCENT};"
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
                title="Voters who ranked at least one option"
              >
                <span
                  class="inline-block h-2 w-2 rounded-sm"
                  style="background-color: {RANKED_ACCENT};"
                  aria-hidden="true"
                ></span>
                <span class="font-mono tabular-nums">
                  {dimension === 'power' ? lovelaceToAdaCompact(rankedVal) : rankedVal}
                </span>
                ranked
                <span class="font-mono tabular-nums">({formatPercent(rankedPct, 1)})</span>
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

        <!-- Rank legend -->
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          {#each Array.from({ length: Math.min(rankDepth, RANK_COLORS.length) }) as _, i}
            <span class="inline-flex items-center gap-1 text-muted-foreground">
              <span
                class="inline-block h-2 w-2 rounded-sm"
                style="background-color: {rankColor(i)};"
                aria-hidden="true"
              ></span>
              {#if i === 0}
                1st
              {:else if i === 1}
                2nd
              {:else if i === 2}
                3rd
              {:else}
                {i + 1}th
              {/if}
            </span>
          {/each}
          <span class="inline-flex items-center gap-1 text-muted-foreground">
            <span
              class="inline-block h-2 w-2 rounded-sm"
              style="background-color: {UNRANKED_COLOR};"
              aria-hidden="true"
            ></span>
            Unranked
          </span>
        </div>

        <!-- Per-option stacked bars -->
        <div class="space-y-2.5">
          {#each sortedRows as row}
            {@const seg = segmentsFor(row)}
            <div>
              <div class="mb-1 flex items-baseline justify-between gap-2">
                <span class="truncate text-xs font-medium">{row.label}</span>
                <span class="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {formatValue(seg.total)}
                </span>
              </div>
              <div
                class="relative flex h-4 w-full overflow-hidden rounded bg-slate-50 ring-1 ring-inset ring-slate-200"
                role="img"
                aria-label="Rank distribution for {row.label}"
              >
                {#if seg.segments.length === 0}
                  <div class="flex-1"></div>
                {:else}
                  {#each seg.segments as s}
                    <div
                      class="h-full transition-[width] duration-500"
                      style="width: {s.pct}%; background-color: {s.color};"
                      title={s.kind === 'rank'
                        ? `Rank ${s.rank}: ${formatValue(s.value)} (${formatPercent(s.pct, 1)})`
                        : `Unranked: ${formatValue(s.value)} (${formatPercent(s.pct, 1)})`}
                    ></div>
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
        <ListOrdered class="h-8 w-8 text-slate-400" aria-hidden="true" />
        <div class="space-y-1">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Rank distribution pending
          </div>
          <div class="max-w-[30ch] text-xs text-muted-foreground">
            Per-rank aggregates will appear here after the next tally run.
          </div>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet details()}
    {#if hasRanked}
      <div class="border-t pt-3">
        <div
          class="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
        >
          <span>First-choice tally</span>
          <span class="font-normal italic text-muted-foreground">
            Headline number — the bars above show the full picture
          </span>
        </div>
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr
              class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              <th class="py-2 text-left font-semibold">Option</th>
              <th class="py-2 text-right font-semibold">1st-choice voters</th>
              {#if hasWeight}
                <th class="py-2 text-right font-semibold">1st-choice power</th>
              {/if}
            </tr>
          </thead>
          <tbody>
            {#each sortedRows as row}
              {@const firstCount = row.counts?.[0] ?? 0}
              {@const firstPower = row.power?.[0] ?? 0}
              {@const totalFirstCount = sortedRows.reduce((s, r) => s + (r.counts?.[0] ?? 0), 0)}
              {@const totalFirstPower = sortedRows.reduce((s, r) => s + (r.power?.[0] ?? 0), 0)}
              {@const opt = optionFor(row.id)}
              <tr class="border-t border-slate-100 align-middle">
                <td class="py-2 font-medium">
                  <span class="inline-flex items-center gap-1.5">
                    {row.label}
                    {#if opt}
                      <OptionDetails option={opt} />
                    {/if}
                  </span>
                </td>
                <td class="py-2 text-right font-mono tabular-nums">
                  {firstCount}
                  <span class="ml-1 text-muted-foreground">
                    {formatPercent(totalFirstCount ? (firstCount / totalFirstCount) * 100 : 0, 1)}
                  </span>
                </td>
                {#if hasWeight}
                  <td class="py-2 text-right font-mono tabular-nums">
                    {lovelaceToAda(firstPower)}
                    <span class="ml-1 text-muted-foreground">
                      {formatPercent(totalFirstPower ? (firstPower / totalFirstPower) * 100 : 0, 1)}
                    </span>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>

        <!-- Full rank distribution matrix for voting authorities /
				     auditors running IRV / STV / Borda / Condorcet
				     themselves. Options × rank positions with an Unranked
				     tail column and a Total. Honors the card's dimension
				     toggle. Power cells carry data-full for clean
				     spreadsheet paste. -->
        <details class="mt-3 rounded-md border border-slate-200 bg-slate-50/60">
          <summary
            class="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            Full rank distribution ({dimension === 'power'
              ? 'weighted by voting power'
              : 'unweighted'}) — expand for copy / custom tabulation
          </summary>
          <div class="border-t border-slate-200 p-3">
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-xs" oncopy={handleDistributionCopy}>
                <thead>
                  <tr
                    class="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    <th class="py-2 pr-2 text-left font-semibold">Option</th>
                    {#each Array.from({ length: rankDepth }) as _, i}
                      <th class="px-2 py-2 text-right font-semibold">
                        <span class="inline-flex items-center justify-end gap-1">
                          <span
                            class="inline-block h-2 w-2 rounded-sm"
                            style="background-color: {rankColor(i)};"
                            aria-hidden="true"
                          ></span>
                          {rankLabel(i)}
                        </span>
                      </th>
                    {/each}
                    <th class="px-2 py-2 text-right font-semibold">
                      <span class="inline-flex items-center justify-end gap-1">
                        <span
                          class="inline-block h-2 w-2 rounded-sm"
                          style="background-color: {UNRANKED_COLOR};"
                          aria-hidden="true"
                        ></span>
                        Unranked
                      </span>
                    </th>
                    <th class="py-2 pl-2 text-right font-semibold">
                      {#if dimension === 'power'}
                        Total <span class="text-muted-foreground/70">(ADA)</span>
                      {:else}
                        Total
                      {/if}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {#each sortedRows as row}
                    {@const rowTotal = totalFor(row)}
                    <tr class="border-t border-slate-100">
                      <td class="py-2 pr-2 font-medium">{row.label}</td>
                      {#each Array.from({ length: rankDepth }) as _, i}
                        {@const v = valueAt(row, i)}
                        {@const pct = rowTotal ? (v / rowTotal) * 100 : 0}
                        <td
                          class="px-2 py-2 text-right font-mono tabular-nums"
                          data-full={dimension === 'power' ? String(v) : null}
                        >
                          {fmtRaw(v)}
                          <span class="ml-1 text-[10px] text-muted-foreground">
                            ({formatPercent(pct, 0)})
                          </span>
                        </td>
                      {/each}
                      <td
                        class="px-2 py-2 text-right font-mono tabular-nums"
                        data-full={dimension === 'power' ? String(unrankedValue(row)) : null}
                      >
                        {fmtRaw(unrankedValue(row))}
                        <span class="ml-1 text-[10px] text-muted-foreground">
                          ({formatPercent(rowTotal ? (unrankedValue(row) / rowTotal) * 100 : 0, 0)})
                        </span>
                      </td>
                      <td
                        class="py-2 pl-2 text-right font-mono tabular-nums"
                        data-full={dimension === 'power' ? String(rowTotal) : null}
                      >
                        {fmtRaw(rowTotal)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-[10px] italic text-muted-foreground">
              Each cell is the {dimension === 'power'
                ? 'voting power (compact ADA)'
                : 'voter count'}
              that placed the option at that rank (or left it unranked). Totals sum across ranks + unranked;
              they should match the number of
              {dimension === 'power' ? 'lovelace of ' : ''}non-abstaining
              {dimension === 'power' ? 'power' : 'voters'} in this group. The matrix has no interpretation
              baked in — authorities apply their own rule (IRV / STV / Borda / Condorcet). Toggle "By
              power" above to run the same tabulation on weighted voting power.
            </p>
          </div>
        </details>
      </div>
    {/if}
  {/snippet}
</GroupCardShell>

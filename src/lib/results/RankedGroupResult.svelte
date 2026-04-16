<script>
	import GroupCardShell from './GroupCardShell.svelte';
	import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
	import { ListOrdered } from 'lucide-svelte';

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
	let { group, ballot } = $props();

	const hasWeight = $derived(!!ballot?.voteWeighted);
	const hasRanked = $derived(
		!!group.ranked && Array.isArray(group.ranked.rows) && group.ranked.rows.length > 0
	);
	const rankDepth = $derived(group.ranked?.rankDepth ?? 0);

	// Abstention: voters who submitted ["abstain"] are filtered out of
	// ranked.rows by the backend cron and parked in results[] as the
	// Abstain row. We visualize the split so stake that chose to abstain
	// isn't hidden from the reader.
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
		(group.ranked?.rows ?? []).reduce((s, r) => s + (r.counts?.[0] || 0), 0)
	);
	const rankedPower = $derived(
		(group.ranked?.rows ?? []).reduce((s, r) => s + (r.power?.[0] || 0), 0)
	);
	const SLATE_600 = '#475569';
	const RANKED_ACCENT = '#c2410e'; // orange-700 — matches the rank-1 bar color

	// Dimension toggle mirrors the scale card: count vs voting power. Only
	// available when the ballot is weighted.
	let dimension = $state('count');

	// Rank-position palette. Rank 1 leads with the brand orange (the
	// "winner" position); subsequent ranks step into contrasting hues
	// rather than a single-hue tint ramp so adjacent ranks read as
	// distinct at a glance. All 700-weight for consistent visual mass.
	const RANK_COLORS = [
		'#c2410e', // rank 1 — orange-700 (brand / winner)
		'#1d4ed8', // rank 2 — blue-700
		'#047857', // rank 3 — emerald-700
		'#be123c', // rank 4 — rose-700
		'#6d28d9', // rank 5 — violet-700
		'#0e7490', // rank 6 — cyan-700
		'#a21caf', // rank 7 — fuchsia-700
		'#a16207' // rank 8 — yellow-700
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
			const va = dimension === 'power' ? a.power?.[0] ?? 0 : a.counts?.[0] ?? 0;
			const vb = dimension === 'power' ? b.power?.[0] ?? 0 : b.counts?.[0] ?? 0;
			if (vb !== va) return vb - va;
			return a._originalIdx - b._originalIdx;
		});
	});

	// Per-option segment data for rendering. Each segment carries width%
	// and a color; unranked always trails at the right.
	function segmentsFor(row) {
		const arr = dimension === 'power' ? row.power || [] : row.counts || [];
		const unrankedVal =
			dimension === 'power' ? row.unranked?.power ?? 0 : row.unranked?.count ?? 0;
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
				color: rankColor(i)
			});
		});
		if (unrankedVal > 0) {
			segments.push({
				kind: 'unranked',
				value: unrankedVal,
				pct: (unrankedVal / total) * 100,
				color: UNRANKED_COLOR
			});
		}
		return { total, segments };
	}

	function formatValue(v) {
		return dimension === 'power' ? lovelaceToAda(v) : `${v} vote${v === 1 ? '' : 's'}`;
	}
</script>

<GroupCardShell {group} {ballot}>
	{#snippet visualization()}
		{#if hasRanked}
			<div class="flex h-full flex-col">
				{#if hasWeight}
					<div class="mb-2 flex items-center justify-between gap-2">
						<div
							class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
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
								<div class="h-full" style="width: {abstainPct}%; background-color: {SLATE_600};"></div>
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
									style="background-color: {SLATE_600};"
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
							{@const totalFirstCount = sortedRows.reduce(
								(s, r) => s + (r.counts?.[0] ?? 0),
								0
							)}
							{@const totalFirstPower = sortedRows.reduce(
								(s, r) => s + (r.power?.[0] ?? 0),
								0
							)}
							<tr class="border-t border-slate-100 align-middle">
								<td class="py-2 font-medium">{row.label}</td>
								<td class="py-2 text-right font-mono tabular-nums">
									{firstCount}
									<span class="ml-1 text-muted-foreground">
										{formatPercent(
											totalFirstCount ? (firstCount / totalFirstCount) * 100 : 0,
											1
										)}
									</span>
								</td>
								{#if hasWeight}
									<td class="py-2 text-right font-mono tabular-nums">
										{lovelaceToAda(firstPower)}
										<span class="ml-1 text-muted-foreground">
											{formatPercent(
												totalFirstPower ? (firstPower / totalFirstPower) * 100 : 0,
												1
											)}
										</span>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/snippet}
</GroupCardShell>

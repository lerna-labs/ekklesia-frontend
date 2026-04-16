<script>
	import GroupCardShell from './GroupCardShell.svelte';
	import Histogram from '$lib/charts/Histogram.svelte';
	import { GROUP_ACCENTS, groupIdentity } from './groupResults.js';
	import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
	import { BarChart3 } from 'lucide-svelte';

	/**
	 * Per-group visualization for `scale` (numeric range) vote types.
	 *
	 * Backend shape (per TRD + BACKEND_RESULTS_AGGREGATION.md):
	 *   group.scale = {
	 *     min, max, increment,
	 *     stats: { count, mean, median, mode, stdDev, iqr:[q1,q3], min, max },
	 *     weightedStats: same shape | null,
	 *     histogram: [{bucketMin, bucketMax, count, power}] | null
	 *   }
	 *
	 * Degrades when `group.scale` is absent (shows the dashed "pending"
	 * placeholder). All votes are public record on-chain, so there is no
	 * privacy concept — every group, no matter how small, gets the full
	 * histogram.
	 */
	let { group, ballot } = $props();

	const hasWeight = $derived(!!ballot?.voteWeighted);
	const hasScale = $derived(!!group.scale);
	const hasHistogram = $derived(
		hasScale && Array.isArray(group.scale.histogram) && group.scale.histogram.length > 0
	);
	const stats = $derived(group.scale?.stats ?? null);
	const weightedStats = $derived(group.scale?.weightedStats ?? null);

	// Abstainers are intentionally excluded from the numeric stats (you
	// can't take a mean of "abstain"). Surface count AND voting power
	// so the split-bar above the histogram can visualize how much of the
	// group chose to abstain.
	const abstainRow = $derived.by(() => {
		// The page's `groups` derivation forwards the results array as
		// `group.rows` (sorted copy). Older `group.results` is never set.
		const rows = Array.isArray(group?.rows) ? group.rows : [];
		return rows.find((r) => r.id === 'abstain') ?? null;
	});
	const abstainCount = $derived(abstainRow?.count ?? 0);
	const abstainPower = $derived(abstainRow?.votingPower ?? 0);
	const numericCount = $derived(group.scale?.stats?.count ?? 0);
	const numericPower = $derived(
		(group.scale?.histogram ?? []).reduce((s, b) => s + (b.power || 0), 0)
	);

	// Accent color for the "numeric" half of the split bar — matches the
	// histogram bars so the eye reads them as the same dimension.
	const SLATE_600 = '#475569';

	// A ballot-weighted scale proposal gets two views: by voters and by
	// voting power. Default to voters; a tiny pill toggles between.
	let dimension = $state('count');
	const accent = $derived(GROUP_ACCENTS[groupIdentity(group.key, group.label).accent]);

	const histogramColor = $derived(accent.stroke);
	const medianValue = $derived(
		dimension === 'power' ? weightedStats?.median ?? null : stats?.median ?? null
	);

	function fmt(n, digits = 2) {
		if (n == null || !Number.isFinite(n)) return '—';
		if (Number.isInteger(n)) return n.toLocaleString();
		return n.toLocaleString(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: digits
		});
	}

	// Range votes rarely produce a "true" mode — with a span like -100..100
	// and only a handful of voters, almost every value is unique, so the
	// backend returns `mode: null`. The closest practically useful answer
	// is the modal bucket (the histogram bucket with the most mass), which
	// tells viewers "where the crowd actually clustered." Pick-by-count for
	// unweighted, pick-by-power for weighted.
	function modalBucket(histogram, weighted) {
		if (!Array.isArray(histogram) || !histogram.length) return null;
		const key = weighted ? 'power' : 'count';
		let best = null;
		let bestVal = 0;
		for (const b of histogram) {
			const v = b[key] || 0;
			if (v > bestVal) {
				bestVal = v;
				best = b;
			}
		}
		return bestVal > 0 ? best : null;
	}

	function fmtMode(m, histogramFallback, weighted) {
		if (m != null) {
			return Array.isArray(m) ? m.map((v) => fmt(v, 2)).join(', ') : fmt(m, 2);
		}
		const bucket = modalBucket(histogramFallback, weighted);
		if (!bucket) return '—';
		return `${fmt(bucket.bucketMin, 1)} to ${fmt(bucket.bucketMax, 1)}`;
	}
</script>

<GroupCardShell {group} {ballot}>
	{#snippet visualization()}
		{#if hasHistogram}
			<div class="flex h-full flex-col">
				{#if hasWeight}
					<div class="mb-2 flex items-center justify-between gap-2">
						<div
							class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Distribution
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
						Distribution
					</div>
				{/if}
				{#if abstainCount > 0}
					{@const totalCount = numericCount + abstainCount}
					{@const totalPower = numericPower + abstainPower}
					{@const numericVal = dimension === 'power' ? numericPower : numericCount}
					{@const abstainVal = dimension === 'power' ? abstainPower : abstainCount}
					{@const total = dimension === 'power' ? totalPower : totalCount}
					{@const numericPct = total ? (numericVal / total) * 100 : 0}
					{@const abstainPct = total ? (abstainVal / total) * 100 : 0}
					<div class="mb-2">
						<div
							class="relative flex h-2 w-full overflow-hidden rounded ring-1 ring-inset ring-slate-200"
							role="img"
							aria-label="Expressed vs abstained split"
						>
							{#if numericVal > 0}
								<div
									class="h-full"
									style="width: {numericPct}%; background-color: {histogramColor};"
								></div>
							{/if}
							{#if abstainVal > 0}
								<div class="h-full" style="width: {abstainPct}%; background-color: {SLATE_600};"></div>
							{/if}
						</div>
						<div class="mt-1 flex flex-col gap-y-1 text-[10px]">
							<span
								class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground"
								title="Voters who submitted a numeric value"
							>
								<span
									class="inline-block h-2 w-2 rounded-sm"
									style="background-color: {histogramColor};"
									aria-hidden="true"
								></span>
								<span class="font-mono tabular-nums">
									{dimension === 'power' ? lovelaceToAdaCompact(numericVal) : numericVal}
								</span>
								expressed
								<span class="font-mono tabular-nums">({formatPercent(numericPct, 1)})</span>
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
				<div class="h-40 w-full md:h-44">
					<Histogram
						buckets={group.scale.histogram}
						{dimension}
						color={histogramColor}
						medianMark={medianValue}
						ariaLabel="{group.label} scale vote distribution"
					/>
				</div>
				<div class="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
					<span>{fmt(group.scale.min)}</span>
					<span>{fmt(group.scale.max)}</span>
				</div>
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center md:h-full"
			>
				<BarChart3 class="h-8 w-8 text-slate-400" aria-hidden="true" />
				<div class="space-y-1">
					<div class="text-xs font-semibold uppercase tracking-wider text-slate-600">
						Distribution pending
					</div>
					<div class="max-w-[28ch] text-xs text-muted-foreground">
						Range-vote aggregates will appear here after the next tally run.
					</div>
				</div>
			</div>
		{/if}
	{/snippet}

	{#snippet details()}
		{#if stats}
			{@const active = dimension === 'power' && weightedStats ? weightedStats : stats}
			<div class="border-t pt-3">
				<div
					class="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				>
					<span>Descriptive statistics</span>
					<span class="font-mono tabular-nums">
						n = {active.count} numeric{#if abstainCount > 0}
							<span class="ml-2 font-normal normal-case tracking-normal">
								({abstainCount} abstain{abstainCount === 1 ? '' : 'ed'}, excluded)
							</span>
						{/if}
					</span>
				</div>
				<dl
					class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-6"
				>
					<div>
						<dt
							class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Mean
						</dt>
						<dd class="font-mono tabular-nums">{fmt(active.mean, 2)}</dd>
					</div>
					<div>
						<dt
							class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Median
						</dt>
						<dd class="font-mono tabular-nums">{fmt(active.median, 2)}</dd>
					</div>
					<div>
						<dt
							class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							{active.mode != null ? 'Mode' : 'Modal range'}
						</dt>
						<dd class="font-mono tabular-nums">
							{fmtMode(active.mode, group.scale?.histogram, dimension === 'power')}
						</dd>
					</div>
					<div>
						<dt
							class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Std dev
						</dt>
						<dd class="font-mono tabular-nums">{fmt(active.stdDev, 2)}</dd>
					</div>
					<div>
						<dt
							class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							IQR
						</dt>
						<dd class="font-mono tabular-nums">
							{#if Array.isArray(active.iqr)}
								{fmt(active.iqr[0], 1)} to {fmt(active.iqr[1], 1)}
							{:else}
								—
							{/if}
						</dd>
					</div>
					<div>
						<dt
							class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Range
						</dt>
						<dd class="font-mono tabular-nums">{fmt(active.min)} to {fmt(active.max)}</dd>
					</div>
				</dl>

				{#if hasWeight && weightedStats && dimension === 'count'}
					<p class="mt-2 text-[10px] italic text-muted-foreground">
						Weighted medians / means visible via the "By power" toggle.
					</p>
				{/if}
			</div>
		{/if}
	{/snippet}
</GroupCardShell>

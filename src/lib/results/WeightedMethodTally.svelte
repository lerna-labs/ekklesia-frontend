<script>
	import GroupCardShell from './GroupCardShell.svelte';
	import { optionColor } from './groupResults.js';
	import { formatPercent } from '$lib/utils.js';
	import { Scale, Info } from 'lucide-svelte';

	/**
	 * MethodTally renderer for `weighted` — point allocation across options.
	 * Consumes `tally.results: WeightedOptionTally[]` where each row carries
	 * totalPoints, voterCount, mean, and stdDev.
	 *
	 * FRONTEND_BALLOT_SCHEMA_V2.md §3 / FRONTEND_VOTE_VALIDATION_DELTAS.md §2:
	 * `mean` is over every answering ballot (voters who allocated 0 are
	 * included in the denominator as implicit zeros) — label it as "mean per
	 * answering ballot" to prevent it being read as "contributors-only
	 * average." A contributors-only mean can be computed locally as
	 * `totalPoints / voterCount`; surface it as a secondary stat.
	 */
	let { tally, group, ballot, proposal } = $props();

	const options = $derived(Array.isArray(proposal?.voteOptions) ? proposal.voteOptions : []);
	const voterBudget = $derived(Number(proposal?.voterBudget) || 0);

	function labelFor(optionId) {
		const opt = options.find((o) => String(o.id) === String(optionId));
		return opt?.label ?? String(optionId);
	}

	const rows = $derived.by(() => {
		const src = Array.isArray(tally?.results) ? tally.results : [];
		return src
			.map((r, i) => ({
				id: r.option,
				label: labelFor(r.option),
				totalPoints: Number(r.totalPoints) || 0,
				voterCount: Number(r.voterCount) || 0,
				mean: Number(r.mean) || 0,
				stdDev: Number(r.stdDev) || 0,
				color: optionColor(labelFor(r.option), i)
			}))
			.sort((a, b) => b.totalPoints - a.totalPoints);
	});

	const totalPoints = $derived(rows.reduce((s, r) => s + r.totalPoints, 0));
	const hasData = $derived(totalPoints > 0);

	function contributorMean(row) {
		return row.voterCount > 0 ? row.totalPoints / row.voterCount : 0;
	}

	function fmt(n, digits = 2) {
		if (n == null || !Number.isFinite(n)) return '—';
		if (Number.isInteger(n)) return n.toLocaleString();
		return n.toLocaleString(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: digits
		});
	}
</script>

<GroupCardShell {group} {ballot}>
	{#snippet visualization()}
		{#if hasData}
			<div class="flex h-full flex-col">
				<div
					class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				>
					Points allocated
				</div>
				<div class="space-y-2">
					{#each rows as row}
						{@const pct = totalPoints ? (row.totalPoints / totalPoints) * 100 : 0}
						<div>
							<div class="mb-1 flex items-baseline justify-between gap-2">
								<span class="truncate text-xs font-medium">{row.label}</span>
								<span class="font-mono text-[10px] tabular-nums text-muted-foreground">
									{row.totalPoints} ({formatPercent(pct, 1)})
								</span>
							</div>
							<div
								class="relative h-2 w-full overflow-hidden rounded bg-slate-100"
								aria-hidden="true"
							>
								<div
									class="h-full"
									style="width: {Math.min(100, pct)}%; background-color: {row.color};"
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
		{#if hasData}
			<div class="mt-3 border-t pt-3">
				<div
					class="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				>
					<span>Per-option statistics</span>
					{#if voterBudget}
						<span class="font-normal normal-case text-muted-foreground">
							Budget per voter: <span class="font-mono tabular-nums">{voterBudget}</span>
						</span>
					{/if}
				</div>
				<table class="w-full border-collapse text-xs">
					<thead>
						<tr
							class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							<th class="py-2 text-left font-semibold">Option</th>
							<th class="py-2 text-right font-semibold">Total pts</th>
							<th class="py-2 text-right font-semibold">
								Mean <span class="font-normal normal-case tracking-normal">(per answering ballot)</span>
							</th>
							<th class="py-2 text-right font-semibold">Std dev</th>
							<th class="py-2 text-right font-semibold">Contributors</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row}
							<tr class="border-t border-slate-100">
								<td class="py-2 font-medium">{row.label}</td>
								<td class="py-2 text-right font-mono tabular-nums">{row.totalPoints}</td>
								<td class="py-2 text-right font-mono tabular-nums">
									{fmt(row.mean, 2)}
									<span class="ml-1 text-[10px] text-muted-foreground"
										title="Among voters who allocated > 0 to this option">
										({fmt(contributorMean(row), 2)})
									</span>
								</td>
								<td class="py-2 text-right font-mono tabular-nums">{fmt(row.stdDev, 2)}</td>
								<td class="py-2 text-right font-mono tabular-nums">{row.voterCount}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<div
					class="mt-2 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50/70 p-2 text-[11px] text-muted-foreground"
				>
					<Info class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
					<p>
						Mean counts voters who allocated 0 to this option. The parenthesized value
						is the contributors-only mean (`totalPoints / contributors`). Standard
						deviation shares the answering-ballot denominator, so a lot of zeros inflate
						variance relative to a contributors-only reading.
					</p>
				</div>
			</div>
		{/if}
	{/snippet}
</GroupCardShell>

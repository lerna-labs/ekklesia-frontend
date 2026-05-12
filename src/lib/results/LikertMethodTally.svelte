<script>
	import GroupCardShell from './GroupCardShell.svelte';
	import { formatPercent } from '$lib/utils.js';
	import { BarChart3 } from 'lucide-svelte';

	/**
	 * MethodTally renderer for `likert`. Consumes
	 * `tally.results: LikertOptionTally[]` — one entry per option with
	 * mean, median, and a rating→voters distribution map.
	 *
	 * FRONTEND_BALLOT_SCHEMA_V2.md §3: Hydra's mean/median are authoritative
	 * — they're anchored on-chain via `resultsHash`. Any further
	 * interpretation (Majority Judgment, etc.) is the voting authority's
	 * call and lives outside this renderer.
	 */
	let { tally, group, ballot, proposal } = $props();

	const options = $derived(Array.isArray(proposal?.voteOptions) ? proposal.voteOptions : []);

	function labelFor(optionId) {
		const opt = options.find((o) => String(o.id) === String(optionId));
		return opt?.label ?? String(optionId);
	}

	const rows = $derived.by(() => {
		const src = Array.isArray(tally?.results) ? tally.results : [];
		return src.map((r) => {
			const dist = r.distribution && typeof r.distribution === 'object' ? r.distribution : {};
			const grades = Object.keys(dist)
				.map((k) => Number(k))
				.filter((n) => Number.isFinite(n))
				.sort((a, b) => a - b);
			const total = grades.reduce((s, g) => s + (Number(dist[g]) || 0), 0);
			return {
				id: r.option,
				label: labelFor(r.option),
				mean: Number(r.mean) || 0,
				median: Number(r.median) || 0,
				count: Number(r.count) || 0,
				grades: grades.map((g) => ({
					grade: g,
					count: Number(dist[g]) || 0,
					pct: total ? ((Number(dist[g]) || 0) / total) * 100 : 0
				})),
				total
			};
		});
	});

	const hasData = $derived(rows.some((r) => r.count > 0 || r.total > 0));

	// Shared rating range across all rows so each distribution bar reads
	// consistently. Infer from the union of grade keys.
	const gradeUnion = $derived.by(() => {
		const set = new Set();
		for (const r of rows) for (const g of r.grades) set.add(g.grade);
		return [...set].sort((a, b) => a - b);
	});

	function pctOf(row, grade) {
		const entry = row.grades.find((g) => g.grade === grade);
		return entry ? entry.pct : 0;
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
					Rating distribution
				</div>
				<div class="space-y-2">
					{#each rows as row}
						<div>
							<div class="mb-1 flex items-baseline justify-between gap-2">
								<span class="truncate text-xs font-medium">{row.label}</span>
								<span class="font-mono text-[10px] tabular-nums text-muted-foreground">
									mean {fmt(row.mean, 2)} · median {fmt(row.median, 2)}
								</span>
							</div>
							<div
								class="relative flex h-2.5 w-full overflow-hidden rounded bg-slate-100"
								aria-hidden="true"
							>
								{#each gradeUnion as grade, i}
									{@const pct = pctOf(row, grade)}
									{#if pct > 0}
										{@const ratio = gradeUnion.length > 1 ? i / (gradeUnion.length - 1) : 0}
										{@const hue = 10 + ratio * 130}
										<div
											class="h-full"
											style="width: {pct}%; background-color: hsl({hue}, 70%, 55%);"
											title="Grade {grade}: {Math.round(pct * 10) / 10}%"
										></div>
									{/if}
								{/each}
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
				<div class="text-xs font-semibold uppercase tracking-wider text-slate-600">
					No ratings in this group
				</div>
			</div>
		{/if}
	{/snippet}

	{#snippet details()}
		{#if hasData}
			<div class="mt-3 border-t pt-3">
				<div
					class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				>
					Per-option statistics
				</div>
				<table class="w-full border-collapse text-xs">
					<thead>
						<tr
							class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							<th class="py-2 text-left font-semibold">Option</th>
							<th class="py-2 text-right font-semibold">Mean</th>
							<th class="py-2 text-right font-semibold">Median</th>
							<th class="py-2 text-right font-semibold">Ratings</th>
							{#each gradeUnion as grade}
								<th class="py-2 text-right font-semibold">{grade}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row}
							<tr class="border-t border-slate-100">
								<td class="py-2 font-medium">{row.label}</td>
								<td class="py-2 text-right font-mono tabular-nums">{fmt(row.mean, 2)}</td>
								<td class="py-2 text-right font-mono tabular-nums">{fmt(row.median, 2)}</td>
								<td class="py-2 text-right font-mono tabular-nums">{row.count}</td>
								{#each gradeUnion as grade}
									{@const entry = row.grades.find((g) => g.grade === grade)}
									<td class="py-2 text-right font-mono tabular-nums">
										{entry ? entry.count : 0}
										<span class="text-[10px] text-muted-foreground">
											({formatPercent(entry?.pct ?? 0, 0)})
										</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/snippet}
</GroupCardShell>

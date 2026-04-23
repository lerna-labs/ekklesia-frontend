<script>
	import GroupCardShell from './GroupCardShell.svelte';
	import { optionColor } from './groupResults.js';
	import { formatPercent } from '$lib/utils.js';
	import { Info, ListOrdered } from 'lucide-svelte';

	/**
	 * MethodTally renderer for `ranked`. Per FRONTEND_BALLOT_SCHEMA_V2.md §3,
	 * Hydra publishes three distinct tallies for a ranked question and
	 * declines to pick a single winner — IRV / STV / Condorcet all need
	 * tie-break rules that aren't canonical. The UI renders the raw data;
	 * the voting authority publishes an interpretation alongside.
	 *
	 * Consumes:
	 *   firstPreference: OptionCount[]       — rank-1 mass per option
	 *   borda:           BordaEntry[]        — {option, score}, higher wins
	 *   pairwise:        PairwiseMatrix      — {options, matrix[i][j] = wins}
	 */
	let { tally, group, ballot, proposal } = $props();

	const options = $derived(Array.isArray(proposal?.voteOptions) ? proposal.voteOptions : []);

	function labelFor(optionId) {
		const opt = options.find((o) => String(o.id) === String(optionId));
		return opt?.label ?? String(optionId);
	}

	const firstPref = $derived(
		Array.isArray(tally?.firstPreference)
			? tally.firstPreference.map((r, i) => ({
					id: r.option,
					label: labelFor(r.option),
					count: Number(r.count) || 0,
					color: optionColor(labelFor(r.option), i)
				}))
			: []
	);
	const firstPrefTotal = $derived(firstPref.reduce((s, r) => s + r.count, 0));
	const hasFirstPref = $derived(firstPrefTotal > 0);

	const borda = $derived(
		Array.isArray(tally?.borda)
			? [...tally.borda]
					.map((r) => ({ id: r.option, label: labelFor(r.option), score: Number(r.score) || 0 }))
					.sort((a, b) => b.score - a.score)
			: []
	);
	const bordaTop = $derived(borda[0]?.score ?? 0);

	const pairwise = $derived(tally?.pairwise ?? null);
	const pairwiseOptions = $derived(
		Array.isArray(pairwise?.options) ? pairwise.options : []
	);
	const pairwiseMatrix = $derived(
		Array.isArray(pairwise?.matrix) ? pairwise.matrix : []
	);
	const pairwiseMax = $derived(
		pairwiseMatrix.reduce(
			(m, row) => row.reduce((mm, v) => (v > mm ? v : mm), m),
			0
		)
	);
</script>

<GroupCardShell {group} {ballot}>
	{#snippet visualization()}
		{#if hasFirstPref}
			<div class="flex h-full flex-col">
				<div
					class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				>
					First-preference
				</div>
				<div class="space-y-2">
					{#each firstPref as row}
						{@const pct = firstPrefTotal ? (row.count / firstPrefTotal) * 100 : 0}
						<div>
							<div class="mb-1 flex items-baseline justify-between gap-2">
								<span class="truncate text-xs font-medium">{row.label}</span>
								<span class="font-mono text-[10px] tabular-nums text-muted-foreground">
									{row.count} ({formatPercent(pct, 1)})
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
				<ListOrdered class="h-8 w-8 text-slate-400" aria-hidden="true" />
				<div class="text-xs font-semibold uppercase tracking-wider text-slate-600">
					No ranked votes in this group
				</div>
			</div>
		{/if}
	{/snippet}

	{#snippet details()}
		{#if hasFirstPref}
			<div
				class="mt-3 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700"
			>
				<Info class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
				<p>
					Hydra publishes the raw rank data without naming a winner —
					IRV / STV / Condorcet all require tie-break rules that aren't universally canonical.
					The voting authority may publish their chosen interpretation separately.
				</p>
			</div>

			{#if borda.length > 0}
				<div class="mt-4 border-t pt-3">
					<div
						class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						Borda scores
					</div>
					<table class="w-full border-collapse text-xs">
						<thead>
							<tr
								class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
							>
								<th class="py-2 text-left font-semibold">Option</th>
								<th class="py-2 text-right font-semibold">Score</th>
							</tr>
						</thead>
						<tbody>
							{#each borda as row}
								{@const pct = bordaTop ? (row.score / bordaTop) * 100 : 0}
								<tr class="border-t border-slate-100">
									<td class="py-2 font-medium">{row.label}</td>
									<td class="relative py-2 pl-4 text-right">
										<span
											class="pointer-events-none absolute inset-y-1 right-0 rounded-sm bg-indigo-400"
											style="width: {Math.min(100, pct)}%; opacity: 0.15;"
											aria-hidden="true"
										></span>
										<span class="relative z-10 font-mono tabular-nums">{row.score}</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if pairwiseOptions.length > 0 && pairwiseMatrix.length > 0}
				<div class="mt-4 border-t pt-3">
					<div
						class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						Pairwise comparisons
					</div>
					<p class="mb-2 text-[11px] text-muted-foreground">
						Cell [row, col] = ballots where the row option ranked above the column option.
					</p>
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-[11px]">
							<thead>
								<tr>
									<th class="py-1 pr-2"></th>
									{#each pairwiseOptions as colId}
										<th
											class="py-1 px-1 text-center font-normal text-muted-foreground"
											style="min-width: 56px;"
										>
											{labelFor(colId)}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each pairwiseOptions as rowId, i}
									<tr class="border-t border-slate-100">
										<th
											class="py-1 pr-2 text-right font-medium text-slate-700"
											style="min-width: 100px;"
										>
											{labelFor(rowId)}
										</th>
										{#each pairwiseOptions as _colId, j}
											{@const v = pairwiseMatrix[i]?.[j] ?? 0}
											{@const isDiag = i === j}
											{@const opacity = pairwiseMax ? Math.min(1, v / pairwiseMax) * 0.35 : 0}
											<td
												class="relative py-1 text-center font-mono tabular-nums"
												style={isDiag ? 'color: #94a3b8;' : ''}
											>
												{#if !isDiag}
													<span
														class="pointer-events-none absolute inset-1 rounded bg-emerald-500"
														style="opacity: {opacity};"
														aria-hidden="true"
													></span>
												{/if}
												<span class="relative z-10">{isDiag ? '—' : v}</span>
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{/if}
	{/snippet}
</GroupCardShell>

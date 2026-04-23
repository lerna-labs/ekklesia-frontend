<script>
	import DonutChart from '$lib/charts/DonutChart.svelte';
	import GroupCardShell from './GroupCardShell.svelte';
	import { optionColor } from './groupResults.js';
	import { formatPercent } from '$lib/utils.js';

	/**
	 * MethodTally renderer for `binary` / `single-choice` / `multi-choice`.
	 * Consumes `tally.results: OptionCount[]` — pure vote counts from Hydra's
	 * on-chain settle. No voting-power dimension on the final path; Hydra's
	 * tally is unweighted. A voting authority can publish a weighted
	 * supplementary tally separately (FRONTEND_BALLOT_SCHEMA_V2.md §6).
	 */
	let { tally, group, ballot, proposal } = $props();

	const options = $derived(Array.isArray(proposal?.voteOptions) ? proposal.voteOptions : []);
	const rows = $derived.by(() => {
		const tallyRows = Array.isArray(tally?.results) ? tally.results : [];
		return tallyRows.map((r) => {
			const opt = options.find((o) => String(o.id) === String(r.option));
			return {
				id: r.option,
				label: opt?.label ?? String(r.option),
				count: Number(r.count) || 0
			};
		});
	});
	const totalCount = $derived(rows.reduce((s, r) => s + r.count, 0));
	const hasVotes = $derived(totalCount > 0);

	const optionColors = $derived(rows.map((r, i) => optionColor(r.label, i)));

	const leadingId = $derived.by(() => {
		if (!hasVotes) return null;
		const [lead] = [...rows].sort((a, b) => b.count - a.count);
		return lead?.id ?? null;
	});

	const donutData = $derived({
		labels: rows.map((r) => r.label),
		datasets: [
			{
				data: rows.map((r) => r.count),
				backgroundColor: optionColors,
				borderColor: '#ffffff',
				borderWidth: 2,
				hoverOffset: 4
			}
		]
	});
</script>

<GroupCardShell {group} {ballot}>
	{#snippet visualization()}
		{#if hasVotes}
			<div class="flex flex-col items-center">
				<div
					class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
				>
					By voters
				</div>
				<div class="aspect-square w-full max-w-[140px]">
					<DonutChart data={donutData} title="" />
				</div>
				<div class="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
					{totalCount} vote{totalCount === 1 ? '' : 's'}
				</div>
			</div>
		{:else}
			<div
				class="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center md:h-full"
			>
				<p class="text-xs text-muted-foreground">No votes cast in this group.</p>
			</div>
		{/if}
	{/snippet}

	{#snippet details()}
		{#if hasVotes}
			<table class="w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						<th class="py-2 text-left font-semibold">Option</th>
						<th class="py-2 text-right font-semibold">Votes</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row, i}
						{@const pct = totalCount ? (row.count / totalCount) * 100 : 0}
						{@const leading = row.id === leadingId}
						<tr class="border-t border-slate-100 align-middle">
							<td class="py-2">
								<div class="flex items-center gap-2">
									<span
										class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
										style="background-color: {optionColors[i]};"
										aria-hidden="true"
									></span>
									<span class="font-medium">{row.label}</span>
									{#if leading}
										<span
											class="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-emerald-800"
										>
											Leading
										</span>
									{/if}
								</div>
							</td>
							<td class="relative py-2 pl-4 text-right">
								<span
									class="pointer-events-none absolute inset-y-1 right-0 rounded-sm"
									style="width: {Math.min(100, pct)}%; background-color: {optionColors[
										i
									]}; opacity: 0.12;"
									aria-hidden="true"
								></span>
								<span class="relative z-10 font-mono tabular-nums">
									{row.count}
									<span class="ml-1 text-muted-foreground">{formatPercent(pct, 1)}</span>
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/snippet}
</GroupCardShell>

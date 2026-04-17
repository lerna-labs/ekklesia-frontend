<script>
	import DonutChart from '$lib/charts/DonutChart.svelte';
	import GroupCardShell from './GroupCardShell.svelte';
	import { optionColor, GROUP_ACCENTS, groupIdentity } from './groupResults.js';
	import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';

	/**
	 * Per-group visualization for discrete-choice vote types: `default`,
	 * `preference`, `budget`. Shows By-voters and By-voting-power donut
	 * charts plus a numeric breakdown table where each cell has a low-
	 * opacity proportional bar behind the value (so the table doubles as
	 * a subtle horizontal bar chart).
	 */
	let { group, ballot } = $props();

	const hasVotes = $derived(group.activeVoters > 0);
	const hasWeight = $derived(!!ballot?.voteWeighted);
	const totalGroupCount = $derived(group.rows.reduce((s, r) => s + (r.count || 0), 0));
	const totalGroupPower = $derived(group.rows.reduce((s, r) => s + (r.votingPower || 0), 0));

	const optionColors = $derived(group.rows.map((r, i) => optionColor(r.label, i)));

	const abstainRow = $derived(group.rows.find((r) => String(r.id).toLowerCase() === 'abstain') ?? null);
	const abstainCount = $derived(abstainRow?.count ?? 0);
	const abstainPower = $derived(abstainRow?.votingPower ?? 0);
	const expressedCount = $derived(totalGroupCount - abstainCount);
	const expressedPower = $derived(totalGroupPower - abstainPower);
	const SLATE_600 = '#475569';
	const expressedColor = $derived(GROUP_ACCENTS[groupIdentity(group.key, group.label).accent].stroke);

	// Leading option uses the authoritative dimension for this ballot
	const leadingId = $derived.by(() => {
		if (!hasVotes) return null;
		const key = hasWeight ? 'votingPower' : 'count';
		const [lead] = [...group.rows].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
		return lead?.id ?? null;
	});

	const countDonut = $derived({
		labels: group.rows.map((r) => r.label),
		datasets: [
			{
				data: group.rows.map((r) => r.count),
				backgroundColor: optionColors,
				borderColor: '#ffffff',
				borderWidth: 2,
				hoverOffset: 4
			}
		]
	});

	const powerDonut = $derived({
		labels: group.rows.map((r) => r.label),
		datasets: [
			{
				data: group.rows.map((r) => r.votingPower),
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
			{#if abstainCount > 0}
				{@const countTotal = expressedCount + abstainCount}
				{@const expressedPct = countTotal ? (expressedCount / countTotal) * 100 : 0}
				{@const abstainPct = countTotal ? (abstainCount / countTotal) * 100 : 0}
				<div class="mb-4">
					<div
						class="relative flex h-2 w-full overflow-hidden rounded ring-1 ring-inset ring-slate-200"
						role="img"
						aria-label="Expressed vs abstained split"
					>
						{#if expressedCount > 0}
							<div
								class="h-full"
								style="width: {expressedPct}%; background-color: {expressedColor};"
							></div>
						{/if}
						{#if abstainCount > 0}
							<div class="h-full" style="width: {abstainPct}%; background-color: {SLATE_600};"></div>
						{/if}
					</div>
					<div class="mt-1 flex flex-col gap-y-1 text-[10px]">
						<span
							class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground"
						>
							<span
								class="inline-block h-2 w-2 rounded-sm"
								style="background-color: {expressedColor};"
								aria-hidden="true"
							></span>
							<span class="font-mono tabular-nums">{expressedCount}</span>
							expressed
							<span class="font-mono tabular-nums">({formatPercent(expressedPct, 1)})</span>
							{#if hasWeight}
								<span class="ml-1 font-mono tabular-nums text-muted-foreground/60">
									{lovelaceToAdaCompact(expressedPower)}
								</span>
							{/if}
						</span>
						<span
							class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground"
						>
							<span
								class="inline-block h-2 w-2 rounded-sm"
								style="background-color: {SLATE_600};"
								aria-hidden="true"
							></span>
							<span class="font-mono tabular-nums">{abstainCount}</span>
							abstained
							<span class="font-mono tabular-nums">({formatPercent(abstainPct, 1)})</span>
							{#if hasWeight}
								<span class="ml-1 font-mono tabular-nums text-muted-foreground/60">
									{lovelaceToAdaCompact(abstainPower)}
								</span>
							{/if}
						</span>
					</div>
				</div>
			{/if}
			<div class="grid grid-cols-2 gap-4 md:gap-6">
				<div class="flex flex-col items-center">
					<div
						class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						By voters
					</div>
					<div class="aspect-square w-full max-w-[140px]">
						<DonutChart data={countDonut} title="" />
					</div>
					<div class="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
						{totalGroupCount} vote{totalGroupCount === 1 ? '' : 's'}
					</div>
				</div>

				{#if hasWeight}
					<div class="flex flex-col items-center">
						<div
							class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							By voting power
						</div>
						<div class="aspect-square w-full max-w-[140px]">
							<DonutChart data={powerDonut} title="" />
						</div>
						<div class="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
							{lovelaceToAda(totalGroupPower)}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div
				class="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center md:h-full"
			>
				<p class="text-xs text-muted-foreground">No votes cast yet in this group.</p>
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
						<th class="py-2 text-right font-semibold">By voters</th>
						{#if hasWeight}
							<th class="py-2 text-right font-semibold">By voting power</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each group.rows as row, i}
						{@const countPct = totalGroupCount ? (row.count / totalGroupCount) * 100 : 0}
						{@const powerPctRow = totalGroupPower
							? (row.votingPower / totalGroupPower) * 100
							: 0}
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
									style="width: {Math.min(100, countPct)}%; background-color: {optionColors[
										i
									]}; opacity: 0.12;"
									aria-hidden="true"
								></span>
								<span class="relative z-10 font-mono tabular-nums">
									{row.count}
									<span class="ml-1 text-muted-foreground">{formatPercent(countPct, 1)}</span>
								</span>
							</td>
							{#if hasWeight}
								<td class="relative py-2 pl-4 text-right">
									<span
										class="pointer-events-none absolute inset-y-1 right-0 rounded-sm"
										style="width: {Math.min(
											100,
											powerPctRow
										)}%; background-color: {optionColors[i]}; opacity: 0.12;"
										aria-hidden="true"
									></span>
									<span class="relative z-10 font-mono tabular-nums">
										{lovelaceToAda(row.votingPower)}
										<span class="ml-1 text-muted-foreground">
											{formatPercent(powerPctRow, 1)}
										</span>
									</span>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/snippet}
</GroupCardShell>

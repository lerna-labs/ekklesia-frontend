<script>
	import { untrack } from 'svelte';
	import DonutChart from '$lib/charts/DonutChart.svelte';
	import GroupCardShell from './GroupCardShell.svelte';
	import { optionColor, GROUP_ACCENTS, groupIdentity } from './groupResults.js';
	import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
	import OptionDetails from '$lib/OptionDetails.svelte';

	/**
	 * Per-group visualization for discrete-choice vote types: `default`,
	 * `preference`, `budget`. Shows By-voters and By-voting-power donut
	 * charts plus a numeric breakdown table where each cell has a low-
	 * opacity proportional bar behind the value (so the table doubles as
	 * a subtle horizontal bar chart).
	 *
	 * `budget` voteType gets additional cost-aware treatment: a header
	 * strip showing the per-voter budget (with unit label from
	 * `proposal.data.capacityUnits` when present), a Cost column per
	 * option, and a Cumulative column that tallies costs going down the
	 * sorted list. Cells whose cumulative would exceed voterBudget tint
	 * amber to flag the greedy-by-votes cutoff.
	 */
	let { group, ballot, proposal } = $props();

	const hasVotes = $derived(group.activeVoters > 0);
	const hasWeight = $derived(!!ballot?.voteWeighted);
	const totalGroupCount = $derived(group.rows.reduce((s, r) => s + (r.count || 0), 0));
	const totalGroupPower = $derived(group.rows.reduce((s, r) => s + (r.votingPower || 0), 0));

	// Colors keyed by option id so sort order changes don't shuffle the
	// donut / table color mapping. `optionColor(label, i)` uses `i` to
	// cycle through the "other" palette for non-canonical labels — if we
	// sort rows locally, that index would shift and colors would dance.
	const colorByOptionId = $derived.by(() => {
		const map = new Map();
		group.rows.forEach((r, i) => map.set(String(r.id), optionColor(r.label, i)));
		return map;
	});
	const optionColors = $derived(group.rows.map((r) => colorByOptionId.get(String(r.id))));

	const abstainRow = $derived(
		group.rows.find((r) => String(r.id).toLowerCase() === 'abstain') ?? null
	);
	const abstainCount = $derived(abstainRow?.count ?? 0);
	const abstainPower = $derived(abstainRow?.votingPower ?? 0);
	const expressedCount = $derived(totalGroupCount - abstainCount);
	const expressedPower = $derived(totalGroupPower - abstainPower);
	// Abstain bar uses near-black slate (800) so it reads distinctly
	// against every group accent — including the `slate` accent used by
	// the stake group, which would otherwise produce a gray-on-gray bar.
	const ABSTAIN_COLOR = '#1e293b';
	const expressedColor = $derived(
		GROUP_ACCENTS[groupIdentity(group.key, group.label).accent].stroke
	);

	// Leading option uses the authoritative dimension for this ballot
	const leadingId = $derived.by(() => {
		if (!hasVotes) return null;
		const key = hasWeight ? 'votingPower' : 'count';
		const [lead] = [...group.rows].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
		return lead?.id ?? null;
	});

	// --- Selection-bounded voteType additions (budget + preference) ---
	//
	// Budget: voter picks a subset with Σ cost ≤ voterBudget (per-option
	//         cost varies).
	// Preference: voter picks up to voterBudget options (uniform cost).
	//
	// Schema v2 collapses both onto the Hydra `multi-choice` method, so
	// the backend may emit either the legacy ekklesia voteType
	// (`preference` / `budget`) or the new method name (`multi-choice`).
	// When the method name comes through, cost variance across options
	// decides which treatment applies — uniform costs ⇒ preference,
	// varying costs ⇒ budget.

	const voteType = $derived(String(proposal?.voteType ?? '').toLowerCase());
	const optionCosts = $derived(
		(proposal?.voteOptions ?? []).map((o) => Number(o.cost) || 0)
	);
	const uniformCosts = $derived(
		optionCosts.length === 0 || new Set(optionCosts).size === 1
	);

	const isBudget = $derived(
		voteType === 'budget' || (voteType === 'multi-choice' && !uniformCosts)
	);
	const isPreference = $derived(
		voteType === 'preference' || (voteType === 'multi-choice' && uniformCosts)
	);
	const hasSelectionBudget = $derived(isBudget || isPreference);
	const voterBudget = $derived(Number(proposal?.voterBudget) || 0);
	const capacityUnits = $derived(proposal?.data?.capacityUnits || null);

	const costByOptionId = $derived.by(() => {
		const map = new Map();
		if (Array.isArray(proposal?.voteOptions)) {
			for (const opt of proposal.voteOptions) map.set(String(opt.id), Number(opt.cost) || 0);
		}
		return map;
	});

	function costOf(optionId) {
		return costByOptionId.get(String(optionId)) ?? 0;
	}

	function isAbstainRow(row) {
		return String(row?.id).toLowerCase() === 'abstain';
	}

	// Look up the original voteOption so OptionDetails can surface its
	// description / referenceUrl / imageUrl / metadata in the modal. The
	// result `row` only carries {id, label, count, votingPower}; rich
	// option metadata stays on `proposal.voteOptions`.
	function optionFor(id) {
		if (!Array.isArray(proposal?.voteOptions)) return null;
		return proposal.voteOptions.find((o) => String(o.id) === String(id)) ?? null;
	}

	// Sort dimension for the budget cumulative cutoff. Weighted ballots
	// default to "power" — that's the authoritative dimension for those
	// votes, so a viewer's first read should match how the outcome will
	// be measured. Toggling to "count" surfaces whale/headcount disparity,
	// which is the secondary read. Unweighted ballots default (and stay)
	// at "count" since power is meaningless. Read once via `untrack` —
	// re-reactivity would re-snap the toggle every time the parent passed
	// a new `ballot` object and stomp on a viewer's manual selection.
	let dimension = $state(untrack(() => (ballot?.voteWeighted ? 'power' : 'count')));

	// Re-sort rows locally by the active dimension so the top of the
	// list always reads as "leading" under whichever dimension the user
	// has selected. Abstain always sinks to the bottom — it's not a
	// selection choice. Applies to every discrete voteType (default /
	// preference / budget / binary / single-choice / multi-choice).
	const tableRows = $derived.by(() => {
		const key = dimension === 'power' ? 'votingPower' : 'count';
		return [...group.rows].sort((a, b) => {
			const aAbs = isAbstainRow(a);
			const bAbs = isAbstainRow(b);
			if (aAbs !== bAbs) return aAbs ? 1 : -1;
			return (b[key] ?? 0) - (a[key] ?? 0);
		});
	});

	// Running cost going down the sorted list, aligned to tableRows.
	// Abstain rows are skipped (marked null). Cells where cumulative
	// exceeds voterBudget are flagged for the amber over-budget treatment.
	const cumulativeCosts = $derived.by(() => {
		if (!isBudget) return [];
		let running = 0;
		return tableRows.map((row) => {
			if (isAbstainRow(row)) return { value: null, overBudget: false };
			running += costOf(row.id);
			return { value: running, overBudget: voterBudget > 0 && running > voterBudget };
		});
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
			{#if abstainCount > 0}
				{@const countTotal = expressedCount + abstainCount}
				{@const expressedPct = countTotal ? (expressedCount / countTotal) * 100 : 0}
				{@const abstainPct = countTotal ? (abstainCount / countTotal) * 100 : 0}
				<div class="mb-4">
					<div
						class="relative flex h-2.5 w-full overflow-hidden rounded ring-1 ring-inset ring-slate-200"
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
							<div
								class="h-full"
								style="width: {abstainPct}%; background-color: {ABSTAIN_COLOR};"
							></div>
						{/if}
					</div>
					<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
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
								style="background-color: {ABSTAIN_COLOR};"
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
			{#if (hasSelectionBudget && voterBudget > 0) || hasWeight}
				<div
					class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2 text-[11px]"
				>
					<div class="flex items-center gap-2">
						{#if isBudget && voterBudget > 0}
							<span class="font-semibold text-slate-700">Budget per voter:</span>
							<span class="font-mono tabular-nums text-slate-900">
								{voterBudget}{capacityUnits ? ` ${capacityUnits}` : ''}
							</span>
						{:else if isPreference && voterBudget > 0}
							<span class="font-semibold text-slate-700">Voters may pick up to</span>
							<span class="font-mono tabular-nums text-slate-900">
								{voterBudget} option{voterBudget === 1 ? '' : 's'}
							</span>
						{:else}
							<!-- No selection budget — keep the left side empty so the
							     sort toggle still anchors to the right edge. -->
							<span aria-hidden="true"></span>
						{/if}
					</div>
					{#if hasWeight}
						<div
							class="inline-flex items-center gap-2 text-[10px] text-muted-foreground"
							title={isBudget
								? 'Cumulative sort dimension — swap to see how a whale voter reshapes the budget cutoff.'
								: 'Sort dimension — swap to see how a whale voter reshapes the leading options.'}
						>
							<span class="font-medium uppercase tracking-wider">Sort by</span>
							<div class="inline-flex rounded-md bg-slate-100 p-0.5">
								<button
									type="button"
									class="rounded px-2 py-0.5 font-medium uppercase tracking-wider transition-colors {dimension ===
									'count'
										? 'bg-white text-slate-800 shadow-sm'
										: 'text-slate-500 hover:text-slate-700'}"
									onclick={() => (dimension = 'count')}
								>
									Voters
								</button>
								<button
									type="button"
									class="rounded px-2 py-0.5 font-medium uppercase tracking-wider transition-colors {dimension ===
									'power'
										? 'bg-white text-slate-800 shadow-sm'
										: 'text-slate-500 hover:text-slate-700'}"
									onclick={() => (dimension = 'power')}
								>
									Voting power
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
			<table class="w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						<th class="py-2 text-left font-semibold">Option</th>
						{#if isBudget}
							<th
								class="py-2 px-2 text-right font-semibold"
								title={capacityUnits
									? `Cost per option, in ${capacityUnits}`
									: 'Cost per option'}
							>
								Cost
							</th>
						{/if}
						<th class="py-2 text-right font-semibold">Voters</th>
						{#if hasWeight}
							<th class="py-2 text-right font-semibold">Voting power</th>
						{/if}
						{#if isBudget}
							<th
								class="py-2 pl-2 text-right font-semibold"
								title="Running cost going top-down through this sorted list. Amber cells are over the voter budget."
							>
								Cumulative
							</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each tableRows as row}
						{@const countPct = totalGroupCount ? (row.count / totalGroupCount) * 100 : 0}
						{@const powerPctRow = totalGroupPower
							? (row.votingPower / totalGroupPower) * 100
							: 0}
						{@const leading = row.id === leadingId}
						{@const color = colorByOptionId.get(String(row.id))}
						{@const rowIdx = tableRows.indexOf(row)}
						{@const cum = isBudget ? cumulativeCosts[rowIdx] : null}
						{@const abstain = isAbstainRow(row)}
						{@const opt = optionFor(row.id)}
						<tr class="border-t border-slate-100 align-middle">
							<td class="py-2">
								<div class="flex items-center gap-2">
									<span
										class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
										style="background-color: {color};"
										aria-hidden="true"
									></span>
									<span class="font-medium">{row.label}</span>
									{#if opt && !abstain}
										<OptionDetails option={opt} {capacityUnits} />
									{/if}
								</div>
							</td>
							{#if isBudget}
								<td class="py-2 px-2 text-right font-mono tabular-nums">
									{#if abstain}
										<span class="text-muted-foreground">—</span>
									{:else}
										{costOf(row.id)}
									{/if}
								</td>
							{/if}
							<td class="relative py-2 pl-4 text-right">
								<span
									class="pointer-events-none absolute inset-y-1 right-0 rounded-sm"
									style="width: {Math.min(100, countPct)}%; background-color: {color}; opacity: 0.12;"
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
										)}%; background-color: {color}; opacity: 0.12;"
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
							{#if isBudget}
								<td
									class="py-2 pl-2 text-right font-mono tabular-nums {cum?.overBudget
										? 'bg-amber-50 text-amber-700'
										: ''}"
									title={cum?.overBudget
										? 'Cumulative cost exceeds the voter budget'
										: null}
								>
									{#if cum?.value == null}
										<span class="text-muted-foreground">—</span>
									{:else}
										{cum.value}{capacityUnits ? '' : ''}
										<span class="ml-1 text-muted-foreground text-[10px]">
											/ {voterBudget}
										</span>
									{/if}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
			{#if isBudget}
				<p class="mt-2 text-[10px] italic text-muted-foreground">
					The Cumulative column assumes a top-{dimension === 'power'
						? 'voting-power'
						: 'votes'}-first selection rule — amber cells are where that rule would exceed
					the voter budget.{hasWeight
						? ' Flip the Sort-by toggle above to see how the cutoff moves under the other dimension.'
						: ''} The voting authority may apply a different rule (optimal knapsack,
					weighted threshold, etc.), so treat this cutoff as one possible reading rather
					than the authoritative outcome.
				</p>
			{:else if isPreference}
				<p class="mt-2 text-[10px] italic text-muted-foreground">
					Options are ordered by {dimension === 'power' ? 'voting power' : 'voter count'}.{hasWeight
						? ' Flip the Sort-by toggle above to see the other dimension.'
						: ''} The voting authority may apply rules this card can't represent
					(acceptance thresholds, minimum vote share, quorum-per-option, etc.), so treat
					this ordering as descriptive rather than authoritative.
				</p>
			{/if}
		{/if}
	{/snippet}
</GroupCardShell>

<script>
	import { untrack } from 'svelte';
	import GroupCardShell from './GroupCardShell.svelte';
	import { optionColor } from './groupResults.js';
	import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
	import OptionDetails from '$lib/OptionDetails.svelte';
	import { Info } from 'lucide-svelte';

	/**
	 * Per-group results renderer used when the ballot opts into
	 * `resultsCalculationMode: 'participation'` (e.g. the Intersect Budget
	 * vote). Reframes the "yes %" denominator so it includes voters who
	 * participated in the ballot but skipped this particular proposal, and
	 * excludes voters who explicitly abstained on this proposal.
	 *
	 * The four cohorts surfaced per group are:
	 *
	 *   - Yes              counts in numerator and denominator
	 *   - No               counts in denominator only
	 *   - Did not vote     counts in denominator only (participated in the
	 *                      ballot somewhere but cast no explicit vote here)
	 *   - Abstain          excluded from denominator; shown for honesty
	 *
	 * Ekklesia stays neutral on what percentage a proposal "needs" — no
	 * threshold marker, no pass/fail badge. The voting authority publishes
	 * its own determination.
	 *
	 * Inputs on `group` beyond the standard shape (all plumbed by the
	 * results +page.svelte):
	 *   - participatingVoters         per BACKEND_…_V1_RESPONSE.md §2,
	 *     participatingPower            the ballot-wide pool for this voter
	 *                                   group — distinct voters in this
	 *                                   group who cast ≥1 non-abstain vote
	 *                                   anywhere on the ballot.
	 *   - participatingAbstainCount   per BACKEND_…_V1_RESPONSE.md §3, the
	 *     participatingAbstainPower     intersection: pool members who
	 *                                   explicitly abstained on THIS
	 *                                   proposal. This is what we subtract
	 *                                   to form the denominator and also
	 *                                   what we display as the Abstain
	 *                                   segment. The raw abstain row in
	 *                                   `group.rows` includes all-abstain
	 *                                   voters who were never in the pool
	 *                                   to begin with — using it would
	 *                                   over-shrink the denominator.
	 */
	let { group, ballot, proposal } = $props();

	const hasWeight = $derived(!!ballot?.voteWeighted);

	// Toggle which numeric dimension drives the headline yes-share + bar
	// widths. Mirrors the toggle in DiscreteGroupResult so a reader who
	// switches modes mid-ballot doesn't have to relearn the affordance.
	// Weighted ballots default to "power" so the headline yes-share
	// matches the dimension the authority's threshold is measured
	// against; "count" toggle exposes whale/headcount disparity.
	// `untrack` pins the initial read so a re-supplied ballot prop can't
	// stomp a viewer's manual toggle mid-session.
	let dimension = $state(untrack(() => (ballot?.voteWeighted ? 'power' : 'count')));

	function rowFor(label) {
		if (!Array.isArray(group?.rows)) return null;
		const target = String(label).toLowerCase();
		return group.rows.find((r) => String(r.label).toLowerCase() === target) ?? null;
	}
	function rowForId(id) {
		if (!Array.isArray(group?.rows)) return null;
		const target = String(id).toLowerCase();
		return group.rows.find((r) => String(r.id).toLowerCase() === target) ?? null;
	}

	// Yes / No rows. Match by label first (canonical) and fall back to id
	// — schema-v2 ballots emit id="yes"/"no" with the proposal's display
	// label which the authority may override. We deliberately do NOT read
	// the abstain row from group.rows here: see the doc comment above.
	const yesRow = $derived(rowFor('yes') ?? rowForId('yes'));
	const noRow = $derived(rowFor('no') ?? rowForId('no'));

	const yesCount = $derived(yesRow?.count ?? 0);
	const noCount = $derived(noRow?.count ?? 0);
	const yesPower = $derived(yesRow?.votingPower ?? 0);
	const noPower = $derived(noRow?.votingPower ?? 0);

	const participatingVoters = $derived(group?.participatingVoters ?? null);
	const participatingPower = $derived(group?.participatingPower ?? null);
	const abstainCount = $derived(group?.participatingAbstainCount ?? null);
	const abstainPower = $derived(group?.participatingAbstainPower ?? null);

	// Need BOTH the pool size AND the intersection abstain count to compute
	// an honest denominator. Either being null means the cron hasn't
	// emitted the participation fields yet (rare, transitional); render a
	// clear placeholder instead of wrong numbers.
	const hasParticipationData = $derived(participatingVoters != null && abstainCount != null);

	// Denominators per dimension. Defensive clamp so a data-quality issue
	// (intersection larger than the pool, etc.) doesn't produce negative
	// percentages — Math.max keeps the math honest without silently lying
	// about which cohort is in scope.
	const denomVoters = $derived(
		Math.max(0, (participatingVoters ?? 0) - (abstainCount ?? 0))
	);
	const denomPower = $derived(
		Math.max(0, (participatingPower ?? 0) - (abstainPower ?? 0))
	);

	const didNotVoteVoters = $derived(Math.max(0, denomVoters - yesCount - noCount));
	const didNotVotePower = $derived(Math.max(0, denomPower - yesPower - noPower));

	const yesShareVoters = $derived(denomVoters > 0 ? (yesCount / denomVoters) * 100 : 0);
	const yesSharePower = $derived(denomPower > 0 ? (yesPower / denomPower) * 100 : 0);

	const yesShare = $derived(dimension === 'power' && hasWeight ? yesSharePower : yesShareVoters);

	// Bar widths add to 100% of the participation pool so the abstain
	// segment is honestly proportional alongside the in-denominator cohorts.
	// (Each segment's *label* % is share-of-denominator, except abstain
	// which is labelled excluded.)
	const poolVoters = $derived(Math.max(0, participatingVoters ?? 0));
	const poolPower = $derived(Math.max(0, participatingPower ?? 0));
	const activePool = $derived(dimension === 'power' && hasWeight ? poolPower : poolVoters);

	function pct(part, whole) {
		return whole > 0 ? (part / whole) * 100 : 0;
	}

	const segments = $derived.by(() => {
		const isPower = dimension === 'power' && hasWeight;
		const totals = isPower
			? { yes: yesPower, no: noPower, didNot: didNotVotePower, abstain: abstainPower }
			: { yes: yesCount, no: noCount, didNot: didNotVoteVoters, abstain: abstainCount };
		const denom = isPower ? denomPower : denomVoters;
		return [
			{ key: 'yes', label: 'Yes', value: totals.yes, color: optionColor('yes'), inDenom: true },
			{ key: 'no', label: 'No', value: totals.no, color: optionColor('no'), inDenom: true },
			{
				key: 'didNot',
				label: 'Did not vote',
				value: totals.didNot,
				color: '#94a3b8', // slate-400 — the muted "no engagement" hue
				inDenom: true,
				denom
			},
			{
				key: 'abstain',
				label: 'Abstain',
				value: totals.abstain,
				color: '#1e293b', // slate-800 — categorically distinct (outside denom)
				inDenom: false
			}
		];
	});

	// Look up rich option metadata so the table rows can surface the
	// description/referenceUrl modal the rest of the results UI offers.
	function optionFor(id) {
		if (!Array.isArray(proposal?.voteOptions)) return null;
		return proposal.voteOptions.find((o) => String(o.id) === String(id)) ?? null;
	}
	const yesOption = $derived(yesRow ? optionFor(yesRow.id) : null);
	const noOption = $derived(noRow ? optionFor(noRow.id) : null);
</script>

<GroupCardShell {group} {ballot}>
	{#snippet visualization()}
		{#if !hasParticipationData}
			<div
				class="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center md:h-full"
			>
				<p class="text-xs text-muted-foreground">
					Participation-pool data isn't available yet for this group. The yes share
					can't be computed until the next results refresh.
				</p>
			</div>
		{:else if denomVoters === 0 && denomPower === 0}
			<div
				class="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center md:h-full"
			>
				<p class="text-xs text-muted-foreground">
					No voters from this group are in the participation pool for this proposal
					(everyone in the pool explicitly abstained, or no one in the group has
					voted yet).
				</p>
			</div>
		{:else}
			<div class="flex flex-col items-start gap-2 md:items-center md:text-center">
				<div
					class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
				>
					Yes share
				</div>
				<div class="font-mono text-4xl font-semibold leading-none tabular-nums tracking-tight">
					{formatPercent(yesShare, 1)}
				</div>
				<div class="text-[11px] leading-snug text-muted-foreground">
					of participating {group.label}{group.label?.toLowerCase().endsWith('s')
						? ''
						: 's'}, excluding abstainers
				</div>
				{#if hasWeight}
					<div
						class="mt-2 inline-flex items-center gap-2 text-[10px] text-muted-foreground"
						title="Switch the headline dimension between voter headcount and stake-weighted voting power."
					>
						<span class="font-medium uppercase tracking-wider">Show</span>
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
	{/snippet}

	{#snippet details()}
		{#if hasParticipationData}
			{@const totalForBar = activePool}
			<div class="mb-3 mt-2">
				<div
					class="relative flex h-3 w-full overflow-hidden rounded ring-1 ring-inset ring-slate-200"
					role="img"
					aria-label="Yes / No / Did not vote / Abstain breakdown of the participation pool"
				>
					{#each segments as seg (seg.key)}
						{#if seg.value > 0 && totalForBar > 0}
							<div
								class="h-full transition-[width] duration-500"
								style="width: {pct(seg.value, totalForBar)}%; background-color: {seg.color};"
								title="{seg.label}: {seg.value}{seg.inDenom
									? ` (${formatPercent(pct(seg.value, dimension === 'power' && hasWeight ? denomPower : denomVoters), 1)} of denominator)`
									: ' (excluded from denominator)'}"
							></div>
						{/if}
					{/each}
				</div>
				<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
					{#each segments as seg (seg.key)}
						{#if seg.value > 0}
							<span
								class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground"
							>
								<span
									class="inline-block h-2 w-2 rounded-sm"
									style="background-color: {seg.color};"
									aria-hidden="true"
								></span>
								<span class="font-medium text-slate-700">{seg.label}</span>
								<span class="font-mono tabular-nums">{seg.value}</span>
								{#if seg.inDenom}
									<span class="font-mono tabular-nums">
										({formatPercent(
											pct(seg.value, dimension === 'power' && hasWeight ? denomPower : denomVoters),
											1
										)})
									</span>
								{:else}
									<span class="italic">excluded</span>
								{/if}
							</span>
						{/if}
					{/each}
				</div>
			</div>

			<table class="mb-3 w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-t border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						<th class="py-2 text-left font-semibold">Cohort</th>
						<th class="py-2 text-right font-semibold">Voters</th>
						{#if hasWeight}
							<th class="py-2 text-right font-semibold">Voting power</th>
						{/if}
						<th class="py-2 pl-4 text-right font-semibold">% of denominator</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-t border-slate-100 align-middle">
						<td class="py-2">
							<div class="flex items-center gap-2">
								<span
									class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
									style="background-color: {optionColor('yes')};"
									aria-hidden="true"
								></span>
								<span class="font-medium">Yes</span>
								{#if yesOption}
									<OptionDetails option={yesOption} />
								{/if}
							</div>
						</td>
						<td class="py-2 text-right font-mono tabular-nums">{yesCount}</td>
						{#if hasWeight}
							<td class="py-2 text-right font-mono tabular-nums">
								{lovelaceToAda(yesPower)}
							</td>
						{/if}
						<td class="py-2 pl-4 text-right font-mono tabular-nums">
							{formatPercent(
								pct(
									dimension === 'power' && hasWeight ? yesPower : yesCount,
									dimension === 'power' && hasWeight ? denomPower : denomVoters
								),
								1
							)}
						</td>
					</tr>
					<tr class="border-t border-slate-100 align-middle">
						<td class="py-2">
							<div class="flex items-center gap-2">
								<span
									class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
									style="background-color: {optionColor('no')};"
									aria-hidden="true"
								></span>
								<span class="font-medium">No</span>
								{#if noOption}
									<OptionDetails option={noOption} />
								{/if}
							</div>
						</td>
						<td class="py-2 text-right font-mono tabular-nums">{noCount}</td>
						{#if hasWeight}
							<td class="py-2 text-right font-mono tabular-nums">
								{lovelaceToAda(noPower)}
							</td>
						{/if}
						<td class="py-2 pl-4 text-right font-mono tabular-nums">
							{formatPercent(
								pct(
									dimension === 'power' && hasWeight ? noPower : noCount,
									dimension === 'power' && hasWeight ? denomPower : denomVoters
								),
								1
							)}
						</td>
					</tr>
					<tr class="border-t border-slate-100 align-middle">
						<td class="py-2">
							<div class="flex items-center gap-2">
								<span
									class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
									style="background-color: #94a3b8;"
									aria-hidden="true"
								></span>
								<span class="font-medium">Did not vote on this proposal</span>
							</div>
						</td>
						<td class="py-2 text-right font-mono tabular-nums">{didNotVoteVoters}</td>
						{#if hasWeight}
							<td class="py-2 text-right font-mono tabular-nums">
								{lovelaceToAda(didNotVotePower)}
							</td>
						{/if}
						<td class="py-2 pl-4 text-right font-mono tabular-nums">
							{formatPercent(
								pct(
									dimension === 'power' && hasWeight ? didNotVotePower : didNotVoteVoters,
									dimension === 'power' && hasWeight ? denomPower : denomVoters
								),
								1
							)}
						</td>
					</tr>
					<tr class="border-t-2 border-slate-300 align-middle">
						<td class="py-2 pt-3">
							<div class="flex items-center gap-2">
								<span
									class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
									style="background-color: #1e293b;"
									aria-hidden="true"
								></span>
								<span class="font-medium">Abstain</span>
								<span class="text-[10px] italic text-muted-foreground">excluded from share</span>
							</div>
						</td>
						<td class="py-2 pt-3 text-right font-mono tabular-nums">{abstainCount}</td>
						{#if hasWeight}
							<td class="py-2 pt-3 text-right font-mono tabular-nums">
								{lovelaceToAda(abstainPower)}
							</td>
						{/if}
						<td class="py-2 pl-4 pt-3 text-right text-muted-foreground">—</td>
					</tr>
					<tr class="border-t border-slate-200 align-middle">
						<td
							class="py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
						>
							Denominator
						</td>
						<td class="py-2 text-right font-mono text-xs tabular-nums">{denomVoters}</td>
						{#if hasWeight}
							<td class="py-2 text-right font-mono text-xs tabular-nums">
								{lovelaceToAdaCompact(denomPower)}
							</td>
						{/if}
						<td class="py-2 pl-4 text-right font-mono text-xs tabular-nums">100.0%</td>
					</tr>
				</tbody>
			</table>

			<div
				class="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-3 text-[11px] text-slate-700"
				role="note"
			>
				<Info class="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
				<p class="leading-relaxed">
					Yes share is calculated as a proportion of voters in this group who cast at least
					one yes or no vote anywhere on this ballot, excluding voters who explicitly
					abstained on this proposal. Voters who didn't cast an explicit vote on this
					proposal are still counted in the denominator. The voting authority decides
					what threshold a proposal must meet to advance.
				</p>
			</div>
		{/if}
	{/snippet}
</GroupCardShell>

<script>
	import { Label } from '$lib/components/ui/label/index.js';
	import { TriangleAlert } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { lovelaceToAda } from './utils';
	import {
		draftsTree,
		submittedTree,
		saveProposalSelection,
		saveProposalAbstain,
		clearProposalDraft,
		draftHasSelection,
		draftIsAbstaining,
		revertProposalDraftToBaseline,
		isProposalDraftDivergent,
		getProposalBaseline
	} from '$lib/draftVotes.js';
	import { isAbstainAllowed } from '$lib/voteSchema.js';
	import AbstainToggle from '$lib/AbstainToggle.svelte';
	import OptionDetails from '$lib/OptionDetails.svelte';

	let { proposal, ballot, disabled = false } = $props();

	const options = $derived(Array.isArray(proposal?.voteOptions) ? proposal.voteOptions : []);
	const canAbstain = $derived(isAbstainAllowed(proposal));

	// ratingRange is the v2-canonical grid; fall back to voteIncrement +
	// numeric bounds for legacy-shape likert ballots.
	const ratingDef = $derived.by(() => {
		const rr = proposal?.ratingRange;
		if (rr && Number.isFinite(Number(rr.min)) && Number.isFinite(Number(rr.max))) {
			return {
				min: Number(rr.min),
				max: Number(rr.max),
				step: Number(rr.step) || 1
			};
		}
		return {
			min: Number(proposal?.ratingMin) || 1,
			max: Number(proposal?.ratingMax) || 5,
			step: Number(proposal?.voteIncrement) || 1
		};
	});

	const ratingGrid = $derived.by(() => {
		const grid = [];
		for (let v = ratingDef.min; v <= ratingDef.max + 1e-9; v += ratingDef.step) {
			grid.push(Math.round(v * 1e6) / 1e6);
		}
		return grid;
	});

	// Use a radio strip when the grid is narrow enough to be scannable;
	// fall back to a number input for wider ranges so voters aren't
	// clicking through 50+ radios per option.
	const useRadioStrip = $derived(ratingGrid.length <= 10);

	// Anchor labels for the scale (`proposal.data.ratingLabels`) — typically
	// only min and max are populated, but the schema permits any grade. We
	// surface min/max as a legend above the matrix and enrich aria-labels.
	const ratingLabels = $derived.by(() => {
		const raw = proposal?.data?.ratingLabels;
		if (!raw || typeof raw !== 'object') return {};
		const map = {};
		for (const [k, v] of Object.entries(raw)) {
			const n = Number(k);
			if (Number.isFinite(n) && typeof v === 'string' && v.trim()) {
				map[n] = v.trim();
			}
		}
		return map;
	});
	const labelForGrade = (g) => ratingLabels[g] ?? null;
	// All labeled grades, sorted ascending — supports min/max only ballots
	// (`{1: "Least", 5: "Most"}`) and multi-anchor ballots
	// (`{-5: "I hate it", 0: "Neutral", 5: "I love it"}`) alike.
	const labeledGrades = $derived(
		Object.keys(ratingLabels)
			.map(Number)
			.filter((n) => Number.isFinite(n))
			.sort((a, b) => a - b)
	);
	const hasAnchorLabels = $derived(labeledGrades.length > 0);

	// Drafts are seeded from /mine by the page's synchronous seedBallotFromMine
	// call so the form's first paint reads from the drafts store directly. No
	// fallback to proposal.voterVote: that fallback would silently re-derive
	// the previously-submitted selection the moment the voter clicks Clear,
	// making per-proposal Clear feel broken.
	const draft = $derived($draftsTree?.[ballot._id]?.[proposal._id] ?? null);

	const isAbstaining = $derived(draftIsAbstaining(draft));
	const hasSelection = $derived(draftHasSelection(draft));
	/** @type {import('$lib/voteSchema.js').SelectionEntry[]} */
	const entries = $derived(hasSelection ? draft.selection : []);
	const ratedCount = $derived(entries.length);
	const isComplete = $derived(ratedCount === options.length);

	function valueFor(optionId) {
		const e = entries.find((e) => e.option === optionId);
		return e ? e.value : null;
	}

	function clamp(n) {
		const { min, max, step } = ratingDef;
		return Math.max(min, Math.min(max, Math.round((n - min) / step) * step + min));
	}

	function rateOption(optionId, raw) {
		if (disabled || isAbstaining) return;
		const n = Number(raw);
		if (!Number.isFinite(n)) return;
		const value = clamp(n);
		const other = entries.filter((e) => e.option !== optionId);
		// Preserve option-declaration order so the wire payload is stable
		// across re-renders.
		const next = options
			.map((o) => {
				if (o.id === optionId) return { option: optionId, value };
				return other.find((e) => e.option === o.id) ?? null;
			})
			.filter(Boolean);
		const changed = saveProposalSelection(ballot._id, proposal._id, next);
		if (changed) toast.success('Rating saved');
	}

	function onAbstain() {
		if (disabled) return;
		const changed = saveProposalAbstain(ballot._id, proposal._id);
		if (changed) toast.success('Recorded as abstaining');
	}

	function onResumeVoting() {
		if (disabled) return;
		clearProposalDraft(ballot._id, proposal._id);
	}

	function onClear() {
		if (disabled) return;
		const changed = clearProposalDraft(ballot._id, proposal._id);
		if (changed) toast.success('Vote cleared');
	}

	const canRevert = $derived.by(() => {
		void $submittedTree;
		void $draftsTree;
		if (getProposalBaseline(ballot._id, proposal._id) == null) return false;
		return isProposalDraftDivergent(ballot._id, proposal._id);
	});

	function onRevert() {
		if (disabled) return;
		const changed = revertProposalDraftToBaseline(ballot._id, proposal._id);
		if (changed) toast.success('Reverted to your submitted vote');
	}
</script>

<div class="relative">
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
		<h3 class="text-base font-semibold">
			{hasSelection ? 'Your Ratings' : 'Rate each option'}
		</h3>
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
			{#if ballot.voteWeighted && !disabled && ballot.votingPower}
				<span class="font-mono tabular-nums">
					Voting Power: {lovelaceToAda(ballot.votingPower)}
				</span>
			{/if}
			<span class="font-mono tabular-nums">
				Rated: {isAbstaining ? 0 : ratedCount} of {options.length}
			</span>
		</div>
	</div>

	<p class="mb-2 text-xs text-muted-foreground">
		Each option is rated independently — multiple options can share the same rating.
	</p>

	<div class={isAbstaining ? 'pointer-events-none opacity-50' : disabled ? 'opacity-60' : ''}>
		<table class="w-full border-collapse text-sm">
			{#if hasAnchorLabels}
				<thead>
					<tr>
						<th class="w-0"></th>
						<th class="py-1 text-left align-bottom font-normal">
							<div
								class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground"
							>
								{#each labeledGrades as grade, i}
									{#if i > 0}
										<span aria-hidden="true" class="text-slate-300">→</span>
									{/if}
									<span>
										<span class="font-mono tabular-nums">{grade}</span>
										= {ratingLabels[grade]}
									</span>
								{/each}
							</div>
						</th>
					</tr>
				</thead>
			{/if}
			<tbody>
				{#each options as option}
					{@const current = valueFor(option.id)}
					<tr class="border-t border-slate-100 align-top">
						<td class="py-2 pr-3 align-top">
							<div class="flex items-start gap-1.5">
								<Label class="whitespace-nowrap leading-5">{option.label}</Label>
								<div class="shrink-0 pt-0.5">
									<OptionDetails {option} />
								</div>
							</div>
							{#if option.description}
								<p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
									{option.description}
								</p>
							{/if}
						</td>
						<td class="py-2">
							{#if useRadioStrip}
								<div class="flex flex-wrap items-center gap-1">
									{#each ratingGrid as grade}
										{@const selected = current === grade}
										<button
											type="button"
											class="rounded border px-2 py-1 font-mono text-xs tabular-nums transition-colors
												{selected
													? 'border-brand bg-brand-soft text-brand-soft-fg'
													: 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}"
											disabled={disabled || isAbstaining}
											onclick={() => rateOption(option.id, grade)}
											aria-pressed={selected}
											aria-label="Rate {option.label} {grade}{labelForGrade(grade)
												? ` (${labelForGrade(grade)})`
												: ''}"
											title={labelForGrade(grade)
												? `${grade} — ${labelForGrade(grade)}`
												: undefined}
										>
											{grade}
										</button>
									{/each}
								</div>
							{:else}
								<input
									type="number"
									class="w-24 rounded-md border border-input bg-background px-2 py-1 text-right font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
									min={ratingDef.min}
									max={ratingDef.max}
									step={ratingDef.step}
									disabled={disabled || isAbstaining}
									value={current ?? ''}
									placeholder="—"
									oninput={(e) => rateOption(option.id, e.currentTarget.value)}
								/>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if hasSelection && !isComplete && !isAbstaining}
		<div
			class="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
			role="status"
		>
			<TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
			<div>
				<div class="font-semibold">Rate all options</div>
				<p class="mt-0.5">
					Likert questions require a rating for every option. Rate the remaining
					{options.length - ratedCount} option{options.length - ratedCount === 1 ? '' : 's'},
					or abstain from the question entirely — partial ratings will be rejected on submission.
				</p>
			</div>
		</div>
	{/if}

	<AbstainToggle
		{isAbstaining}
		{hasSelection}
		{canAbstain}
		{disabled}
		{canRevert}
		{onAbstain}
		{onResumeVoting}
		{onClear}
		{onRevert}
	/>
</div>

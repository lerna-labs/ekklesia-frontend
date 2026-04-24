<script>
	import { convertTimestamp } from '$lib/utils.js';
	import { certificationState } from '$lib/certified.js';
	import { CircleCheck, TriangleAlert, FileText, ExternalLink } from 'lucide-svelte';

	/**
	 * @type {{
	 *   result: { source?: string, finalizedAt?: string|null, updatedAt?: string, hydraFinalizeTxHash?: string|null } | null,
	 *   certification?: { certified: boolean, version?: number, certifiedAt?: string, snapshotUrl?: string|null, snapshotHash?: string|null, snapshotEpoch?: number|null, narrative?: { url: string, label?: string } | null } | null,
	 *   ballot?: { status?: string } | null
	 * }}
	 */
	let { result, certification = null, ballot = null } = $props();

	const state = $derived(certificationState(certification, result, ballot));
	const narrative = $derived(certification?.narrative ?? null);
</script>

{#if narrative?.url}
	<a
		href={narrative.url}
		target="_blank"
		rel="noopener noreferrer"
		class="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-sky-800 underline decoration-sky-400 underline-offset-2 hover:text-sky-900 hover:decoration-sky-600"
	>
		<FileText class="h-4 w-4" aria-hidden="true" />
		{narrative.label || 'Voting authority — narrative'}
		<ExternalLink class="h-3 w-3" aria-hidden="true" />
	</a>
{/if}

{#if state === 'certified'}
	<div
		class="mb-4 flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
	>
		<div class="mt-0.5 shrink-0">
			<CircleCheck class="h-5 w-5" />
		</div>
		<div class="flex-1">
			<div class="font-semibold uppercase tracking-wide">
				Certified Results{certification?.version ? ` — v${certification.version}` : ''}
			</div>
			<p class="mt-1">
				These tallies have been re-weighted against the voting authority's audited
				snapshot{certification?.certifiedAt
					? ' on ' + convertTimestamp(certification.certifiedAt)
					: ''}{certification?.snapshotEpoch != null
					? ` (epoch ${certification.snapshotEpoch})`
					: ''}. Counts and voting power reflect who was eligible, and how much weight
				they carried, at the audited snapshot — not at the moment each vote was cast.
			</p>
			{#if certification?.snapshotUrl}
				<p class="mt-1 text-xs">
					<a
						href={certification.snapshotUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 underline decoration-emerald-400 underline-offset-2 hover:decoration-emerald-600"
					>
						Authority snapshot
						<ExternalLink class="h-3 w-3" aria-hidden="true" />
					</a>
					{#if certification.snapshotHash}
						<span class="ml-1 font-mono opacity-75">
							· {certification.snapshotHash.slice(0, 10)}…{certification.snapshotHash.slice(-6)}
						</span>
					{/if}
				</p>
			{/if}
			{#if result?.updatedAt}
				<p class="mt-1 text-xs opacity-75">
					Tally last updated {convertTimestamp(result.updatedAt)}
				</p>
			{/if}
		</div>
	</div>
{:else if state === 'narrative'}
	<div
		class="mb-4 flex items-start gap-3 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900"
	>
		<div class="mt-0.5 shrink-0">
			<FileText class="h-5 w-5" />
		</div>
		<div class="flex-1">
			<div class="font-semibold uppercase tracking-wide">Narrative endorsement</div>
			<p class="mt-1">
				The voting authority has published a narrative write-up of this ballot without
				re-weighting the tally. The numbers below are the Hydra-finalized record — what
				voters answered, weighted by the voting power snapshotted when each vote was
				validated. Read the authority's narrative for context on winners and losers.
			</p>
			{#if result?.updatedAt}
				<p class="mt-1 text-xs opacity-75">
					Tally last updated {convertTimestamp(result.updatedAt)}
				</p>
			{/if}
		</div>
	</div>
{:else if state === 'hydra-provisional'}
	<div
		class="mb-4 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
	>
		<div class="mt-0.5 shrink-0">
			<TriangleAlert class="h-5 w-5" />
		</div>
		<div class="flex-1">
			<div class="font-semibold uppercase tracking-wide">Provisional — awaiting certification</div>
			<p class="mt-1">
				Voting has closed and the tally has been committed on-chain, but the voting
				authority hasn't published an audited snapshot yet. These numbers are the
				Hydra-final record, weighted by voting power at the time each vote was cast —
				certification may adjust them once the authority's snapshot lands.
			</p>
			{#if result?.finalizedAt}
				<p class="mt-1 text-xs opacity-75">
					Finalized on-chain {convertTimestamp(result.finalizedAt)}
				</p>
			{/if}
		</div>
	</div>
{:else if state === 'voting'}
	<div
		class="mb-4 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
	>
		<div class="mt-0.5 shrink-0">
			<TriangleAlert class="h-5 w-5" />
		</div>
		<div class="flex-1">
			<div class="font-semibold uppercase tracking-wide">Provisional — voting in progress</div>
			<p class="mt-1">
				Voting is still open. These numbers are a running tally and will keep moving as
				new votes come in and voting power shifts. The backend recomputes the tally every
				few minutes.
			</p>
			{#if result?.updatedAt}
				<p class="mt-1 text-xs opacity-75">
					Last updated {convertTimestamp(result.updatedAt)}
				</p>
			{/if}
		</div>
	</div>
{/if}

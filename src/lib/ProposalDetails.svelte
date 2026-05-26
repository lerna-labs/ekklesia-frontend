<script>
	let { proposal, ballot } = $props();
	import { config } from '$stores/sessionManager.js';
	import { adaCompact } from '$lib/utils.js';
	import { ChevronDown } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';

	// Facet values live on the proposal's snapshot; the ballot declares
	// the schema (key, label, type, unit, multi). We join the two into
	// display rows — scalar facets carry a formatted `display` string;
	// multi-value facets carry an `entries` array, rendered one chip per
	// entry so list values don't collapse into an unreadable comma-run.
	const facetValues = $derived.by(() => {
		const schema = ballot?.facets ?? [];
		const values = proposal?.externalProposal?.snapshot?.facets ?? {};
		if (!schema.length || !Object.keys(values).length) return [];
		return schema
			.filter((f) => values[f.key] != null)
			.map((f) => {
				const raw = values[f.key];

				// Multi-value facets (e.g. Strategy Pillar) arrive as a
				// comma-joined string or an array. Split into discrete
				// entries so each renders as its own chip.
				if (f.multi) {
					const entries = (Array.isArray(raw) ? raw : String(raw).split(','))
						.map((s) => String(s).trim())
						.filter(Boolean);
					return { key: f.key, label: f.label, entries };
				}

				// Single-value facet — format the scalar for inline display.
				let display = raw;
				if (f.type === 'number' && f.unit === 'ADA' && typeof display === 'number') {
					// Facet ADA values are plain ADA figures, not lovelace —
					// format compactly without the lovelace→ADA division.
					display = adaCompact(display);
				} else if (f.type === 'number' && f.unit && typeof display === 'number') {
					display = display.toLocaleString() + ' ' + f.unit;
				} else if (typeof display === 'number') {
					display = display.toLocaleString();
				}
				return { key: f.key, label: f.label, display: String(display) };
			})
			.filter((fv) => (fv.entries ? fv.entries.length > 0 : true));
	});

	const authors = $derived.by(() => {
		const arr = proposal?.authors;
		if (Array.isArray(arr) && arr.length > 0) {
			return arr.map((a) => (typeof a === 'string' ? a : a?.name ?? '')).filter(Boolean);
		}
		const legacy = proposal?.data?.submittedBy;
		return legacy ? [legacy] : [];
	});

	let facetsOpen = $state(true);
</script>

<section class="mt-2 flex flex-col gap-1 text-xs">
	{#if authors.length > 0}
		<div>
			<span class="font-semibold">{authors.length === 1 ? 'Author:' : 'Authors:'}</span>
			{authors.join(', ')}
		</div>
	{/if}

	<div>
		<span class="font-semibold">Proposal ID:</span>
		{proposal._id}
	</div>

	{#if proposal.ipfsHash}
		<div>
			<span class="font-semibold">IPFS:</span>
			<a
				href={$config.ipfsGatewayBase + proposal.ipfsHash}
				target="_blank"
				rel="noopener noreferrer"
				class="link inline-block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap align-bottom"
				title={proposal.ipfsHash}
			>
				{proposal.ipfsHash}
			</a>
		</div>
	{/if}

	{#if facetValues.length > 0}
		<div class="mt-1">
			<button
				type="button"
				class="inline-flex items-center gap-1 font-semibold hover:underline"
				onclick={() => (facetsOpen = !facetsOpen)}
			>
				Properties ({facetValues.length})
				<ChevronDown
					class="h-3 w-3 transition-transform {facetsOpen ? 'rotate-180' : ''}"
				/>
			</button>
			{#if facetsOpen}
				<dl class="mt-1.5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
					{#each facetValues as fv (fv.key)}
						{#if fv.entries}
							<div class="col-span-2">
								<dt class="mb-1 font-semibold text-muted-foreground">{fv.label}</dt>
								<dd class="flex flex-wrap gap-1">
									{#each fv.entries as entry}
										<Badge variant="secondary" class="pointer-events-none font-normal">
											{entry}
										</Badge>
									{/each}
								</dd>
							</div>
						{:else}
							<dt class="font-semibold text-muted-foreground">{fv.label}</dt>
							<dd class="font-medium text-foreground">{fv.display}</dd>
						{/if}
					{/each}
				</dl>
			{/if}
		</div>
	{/if}
</section>

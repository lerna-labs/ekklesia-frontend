<script>
	let { proposal, ballot } = $props();
	import { config } from '$stores/sessionManager.js';
	import { lovelaceToAda } from '$lib/utils.js';
	import { ChevronDown } from 'lucide-svelte';

	// Facet values live on the proposal's snapshot; the ballot declares
	// the schema (key, label, type, unit). We join the two to produce
	// human-readable key:value rows.
	const facetValues = $derived.by(() => {
		const schema = ballot?.facets ?? [];
		const values = proposal?.externalProposal?.snapshot?.facets ?? {};
		if (!schema.length || !Object.keys(values).length) return [];
		return schema
			.filter((f) => values[f.key] != null)
			.map((f) => {
				let display = values[f.key];
				if (f.type === 'number' && f.unit === 'ADA' && typeof display === 'number') {
					display = lovelaceToAda(display);
				} else if (f.type === 'number' && f.unit && typeof display === 'number') {
					display = display.toLocaleString() + ' ' + f.unit;
				} else if (typeof display === 'number') {
					display = display.toLocaleString();
				}
				if (typeof display === 'string' && f.multi && display.includes(',')) {
					display = display.split(',').join(', ');
				}
				return { key: f.key, label: f.label, display };
			});
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
				<dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
					{#each facetValues as fv}
						<dt class="font-semibold text-muted-foreground">{fv.label}</dt>
						<dd>{fv.display}</dd>
					{/each}
				</dl>
			{/if}
		</div>
	{/if}
</section>

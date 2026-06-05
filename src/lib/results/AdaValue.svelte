<script>
	import { toast } from 'svelte-sonner';
	import { lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';

	/**
	 * Click-to-copy compact ADA value with the full amount stashed in the
	 * tooltip. The display uses `lovelaceToAdaCompact` so dense result
	 * tables stay scannable; the title attribute carries both the precise
	 * ADA figure and the raw lovelace so auditors who want to re-derive
	 * results can grab the exact number without losing the at-a-glance
	 * read. Clicking copies the raw lovelace integer (no commas, no unit)
	 * so it pastes cleanly into a spreadsheet or calculator.
	 *
	 * Visual cue: a dotted underline that only appears on hover, so the
	 * affordance is discoverable without adding chrome to every ADA cell
	 * in a dense table. Inherits font and color from the parent so it can
	 * drop into a `font-mono tabular-nums` cell without disrupting layout.
	 */
	let { lovelace, class: className = '', label = 'Value' } = $props();

	const n = $derived(Number(lovelace) || 0);
	const display = $derived(lovelaceToAdaCompact(n));
	const exact = $derived(lovelaceToAda(n));
	const rawLovelace = $derived(`${n.toLocaleString()} lovelace`);
	const titleText = $derived(`${exact} (${rawLovelace}) — click to copy`);

	// Pull the (number)(K|M|B)(unit) shape out of the compact output so the
	// magnitude letter can be rendered with a heavier weight. Without this
	// split the default sans glyph for "B" reads as "8" against flush
	// digits ("3.3B ADA" → "3.38 ADA"); bolding the letter signals "unit
	// modifier" rather than "another digit". The space between magnitude
	// letter and "ADA" comes straight from `lovelaceToAdaCompact`'s output
	// — preserved by rendering `unit` with its leading space.
	const parts = $derived.by(() => {
		const m = /^(-?[\d.,]+)([KMB])\s+(ADA|lovelace)$/.exec(display);
		if (m) return { numeric: m[1], magnitude: m[2], unit: m[3] };
		const m2 = /^(.+?)\s+(ADA|lovelace)$/.exec(display);
		if (m2) return { numeric: m2[1], magnitude: '', unit: m2[2] };
		return { numeric: display, magnitude: '', unit: '' };
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(String(n));
			toast.success(`${label}: ${exact} copied`);
		} catch {
			toast.error('Could not copy to clipboard');
		}
	}
</script>

<button
	type="button"
	class="cursor-pointer bg-transparent p-0 font-[inherit] text-[inherit] underline decoration-dotted decoration-transparent underline-offset-2 transition-colors hover:decoration-muted-foreground/60 focus-visible:decoration-muted-foreground/80 focus-visible:outline-none {className}"
	title={titleText}
	onclick={copy}
>{parts.numeric}{#if parts.magnitude}<span class="font-semibold">{parts.magnitude}</span>{/if}{#if parts.unit}{' '}{parts.unit}{/if}</button>

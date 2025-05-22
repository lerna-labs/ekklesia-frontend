<script>
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { cn } from '$lib/utils.js';
	let { status } = $props();

	let badgeClass = $derived.by(() => {
		return cn(
			'rounded-md text-xs pointer-events-none shadow-none inline-flex items-center py-1 mt-1 px-2 h-fit self-start',
			status.toLowerCase() === 'live'
				? 'bg-green-300 text-green-800 buzzing'
				: status.toLowerCase() === 'closed'
					? 'bg-red-300 text-red-800'
					: 'bg-slate-300 text-slate-800' // upcoming (default)
		);
	});
</script>

<Badge class={badgeClass}>{status.toUpperCase()}</Badge>

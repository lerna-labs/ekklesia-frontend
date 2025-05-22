<script>
	import { Badge } from '$lib/components/ui/badge/index.js';
	let { voterType } = $props();

	let label = $state('');

	if (voterType == 'stake') {
		label = 'Stake Address';
	} else if (voterType == 'pool') {
		label = 'Stake Pool';
	} else if (voterType == 'drep') {
		label = 'DRep';
	}
</script>

<Badge class="bg-slate-500">{label}</Badge>

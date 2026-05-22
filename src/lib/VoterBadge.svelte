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

<!-- Voter type is informational (not a state), so it picks up the
     themed `secondary` surface tokens rather than a fixed neutral. -->
<Badge variant="secondary">{label}</Badge>

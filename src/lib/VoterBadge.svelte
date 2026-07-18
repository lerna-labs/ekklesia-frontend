<script>
  import { Badge } from '$lib/components/ui/badge/index.js';
  let { voterType } = $props();

  let label = $derived.by(() => {
    if (voterType == 'stake') return 'Stake Address';
    if (voterType == 'pool') return 'Stake Pool';
    if (voterType == 'drep') return 'DRep';
    return '';
  });
</script>

<!-- Voter type is informational (not a state), so it picks up the
     themed `secondary` surface tokens rather than a fixed neutral. -->
<Badge variant="secondary">{label}</Badge>

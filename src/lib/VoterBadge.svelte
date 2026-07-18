<script>
  import { Badge } from '$lib/components/ui/badge/index.js';
  let { voterType } = $props();

  const label = $derived(
    voterType == 'stake'
      ? 'Stake Address'
      : voterType == 'pool'
        ? 'Stake Pool'
        : voterType == 'drep'
          ? 'DRep'
          : '',
  );
</script>

<Badge class="bg-slate-500">{label}</Badge>

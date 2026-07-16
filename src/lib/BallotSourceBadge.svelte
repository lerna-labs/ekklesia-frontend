<script>
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { cn } from '$lib/utils.js';
  import { Zap } from 'lucide-svelte';
  let { source } = $props();
</script>

{#if source === 'hydra'}
  <Badge
    class={cn(
      'inline-flex h-fit items-center gap-1 self-start rounded-md px-2 py-1 text-xs shadow-none',
      'pointer-events-none bg-indigo-200 text-indigo-900',
    )}
    title="Hydra-backed on-chain ballot"
  >
    <Zap class="h-3 w-3" />
    HYDRA
  </Badge>
{/if}

<script>
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { cn } from '$lib/utils.js';
  import { thresholdBadge } from '$lib/threshold.js';
  let { reached, ballot } = $props();

  const info = $derived(thresholdBadge(reached, ballot));
</script>

{#if info}
  <Badge
    title={info.rule}
    class={cn(
      'pointer-events-auto inline-flex h-fit items-center self-start rounded-md px-2 py-1 text-xs shadow-none',
      reached ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-300 text-slate-800',
    )}
  >
    {info.label}
    {#if info.rule}<span class="sr-only">. {info.rule}</span>{/if}
  </Badge>
{/if}

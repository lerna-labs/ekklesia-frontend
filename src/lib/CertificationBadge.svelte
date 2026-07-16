<script>
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { cn } from '$lib/utils.js';
  import { ShieldCheck, FileText, TriangleAlert } from 'lucide-svelte';

  // Compact pill suitable for the ballot-title row. Drive off either:
  //   - the full /certified payload (per-proposal results page), or
  //   - the `ballot.certification` summary embedded on /api/v1/ballots/:id
  //     ({ certified, version, narrative })
  //
  // Props:
  //   certification — { certified, version?, narrative? | null }
  //   ballotStatus  — 'live' | 'closed' | 'upcoming' (used to decide if
  //                   a ballot with no certification yet is still open or
  //                   genuinely awaiting certification)
  let { certification, ballotStatus } = $props();

  const state = $derived.by(() => {
    if (certification?.certified) return 'certified';
    if (certification?.narrative?.url) return 'narrative';
    if (ballotStatus === 'closed') return 'hydra-provisional';
    return null;
  });
</script>

{#if state === 'certified'}
  <Badge
    class={cn(
      'pointer-events-none inline-flex h-fit items-center gap-1 self-start rounded-md px-2 py-1 text-xs shadow-none',
      'bg-emerald-200 text-emerald-900',
    )}
    title="Authority-certified results{certification?.version
      ? ' (v' + certification.version + ')'
      : ''}"
  >
    <ShieldCheck class="h-3 w-3" />
    CERTIFIED{certification?.version ? ' v' + certification.version : ''}
  </Badge>
{:else if state === 'narrative'}
  <Badge
    class={cn(
      'pointer-events-none inline-flex h-fit items-center gap-1 self-start rounded-md px-2 py-1 text-xs shadow-none',
      'bg-sky-200 text-sky-900',
    )}
    title="Voting authority published a narrative endorsement without re-weighting the tally"
  >
    <FileText class="h-3 w-3" />
    ENDORSED
  </Badge>
{:else if state === 'hydra-provisional'}
  <Badge
    class={cn(
      'pointer-events-none inline-flex h-fit items-center gap-1 self-start rounded-md px-2 py-1 text-xs shadow-none',
      'bg-amber-200 text-amber-900',
    )}
    title="Tally finalized on-chain; awaiting authority certification"
  >
    <TriangleAlert class="h-3 w-3" />
    PROVISIONAL
  </Badge>
{/if}

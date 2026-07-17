<script>
  import { user } from '$stores/sessionManager.js';
  import { invalidateAll } from '$app/navigation';
  import { Button } from '$lib/components/ui/button/index.js';
  import { TriangleAlert, Trash2 } from 'lucide-svelte';
  import { fade } from 'svelte/transition';
  import { toast } from 'svelte-sonner';
  import { deletePackage } from '$lib/broker.js';

  const pending = $derived.by(() => {
    const list = $user?.pendingPackages ?? [];
    return Array.isArray(list) ? list : [];
  });
  const count = $derived(pending.length);

  // Unique ballots — one voter can legitimately have multiple packages on
  // the same ballot (e.g. a failed draft + a fresh one), so dedupe for
  // the "go sign" CTA.
  const uniqueBallots = $derived.by(() => {
    const seen = new Set();
    return pending.filter((p) => {
      if (!p?.ballotId || seen.has(p.ballotId)) return false;
      seen.add(p.ballotId);
      return true;
    });
  });

  /** @type {Set<string>} */
  let discarding = $state(new Set());

  async function discard(pkg) {
    const id = pkg?.packageId || pkg?.id || pkg?._id;
    if (!id || !pkg?.ballotId) return;
    // Multisig cosigners can't delete — only the original drafter.
    // Surface the server's 403 as a toast if the user tries anyway.
    discarding = new Set([...discarding, id]);
    try {
      await deletePackage(fetch, pkg.ballotId, id);
      toast.success('Draft cancelled');
      // Re-pull /session so pendingPackages reflects the abandonment.
      await invalidateAll();
    } catch (err) {
      const msg = err?.body?.message || err?.message || 'Could not cancel draft';
      toast.error(msg);
    }
    discarding = new Set([...discarding].filter((x) => x !== id));
  }
</script>

{#if count > 0}
  <div
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 200 }}
    class="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
  >
    <div class="mb-2 flex items-center gap-2 font-semibold">
      <TriangleAlert class="h-4 w-4" />
      {count === 1
        ? 'You have a vote package awaiting action'
        : `You have ${count} vote packages awaiting action`}
    </div>
    <p class="mb-2 text-xs">
      These packages were drafted but haven't completed signing or on-chain submission. Finish them
      before the ballot closes, otherwise your vote won't count. Stale packages auto-expire after an
      hour of inactivity; use Discard to release the slot now.
    </p>
    <div class="flex flex-col gap-2">
      {#each uniqueBallots as p}
        {@const id = p?.packageId || p?.id || p?._id}
        <div class="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            href={'/ballots/' + p.ballotId + '/proposals'}
            class="text-xs"
          >
            {p.isMultisig ? 'Cosigner action needed' : 'Resume signing'} →
          </Button>
          {#if !p.isMultisig}
            <Button
              variant="outline"
              size="sm"
              onclick={() => discard(p)}
              disabled={!id || discarding.has(id)}
              class="text-xs text-red-700 hover:bg-red-50"
              title="Cancel this draft on the server and release its nonce"
            >
              <Trash2 class="h-3 w-3" />
              {discarding.has(id) ? 'Cancelling…' : 'Discard'}
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

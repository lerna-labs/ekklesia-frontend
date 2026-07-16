<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Copy } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { convertTimestamp, shortenString, voterCredentialFromId, credentialLabel } from './utils';

  let { voterData } = $props();

  const userId = $derived(voterData?.userId ?? '');
  const credential = $derived(credentialLabel(voterCredentialFromId(userId)));

  async function copyId() {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      toast.success('Voter ID copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }
</script>

<Card.Root>
  <Card.Header class="pb-3">
    {#if credential}
      <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {credential}
      </div>
    {/if}
    <Card.Title class="pt-1">
      <button
        type="button"
        onclick={copyId}
        title="Click to copy full Voter ID"
        class="group inline-flex items-center gap-2 font-mono text-base font-semibold leading-tight hover:text-orange-600 sm:text-lg"
      >
        <span>{shortenString(userId, 24, true)}</span>
        <Copy class="h-4 w-4 text-slate-400 transition-colors group-hover:text-orange-600" />
      </button>
    </Card.Title>
    <Card.Description class="pt-1">
      Last login: {voterData.lastLogin ? convertTimestamp(voterData.lastLogin) : 'never'}
    </Card.Description>
  </Card.Header>
  <Card.Content class="text-sm">
    <p>Ballots voted on: {voterData.ballotsVoted}</p>
    <p>Proposals voted on: {voterData.proposalsVoted}</p>
  </Card.Content>
</Card.Root>

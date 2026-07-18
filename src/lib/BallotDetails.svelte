<script>
  import { untrack } from 'svelte';
  import { config } from '$stores/sessionManager.js';
  import { convertTimestamp } from '$lib/utils.js';
  import { ChevronDown } from 'lucide-svelte';

  // `collapsible` is opted into by the proposal detail page, where the
  // same fields are already shown on the listing a click away and eat
  // vertical space otherwise.
  let { ballot, collapsible = false } = $props();

  // Capture the initial collapse state once; `collapsible` is a static
  // config prop and `open` is toggled by the user afterwards.
  let open = $state(untrack(() => !collapsible));

  // Per VOTER_GROUPS_V1.md, a ballot may carry a structured
  // `voterGroups: [{ group, powerSource }]` list that encodes
  // heterogeneous eligibility (e.g. "DReps vote by voting power; SPOs
  // vote by pledge"). When present, prefer it over the legacy
  // `voterType` display string. Fall back to the old single-label
  // rendering when absent.
  const voterGroups = $derived(Array.isArray(ballot?.voterGroups) ? ballot.voterGroups : []);
  const hasVoterGroups = $derived(voterGroups.length > 0);

  const GROUP_LABELS = {
    drep: 'DReps',
    pool: 'SPOs',
    stake: 'Stakeholders',
  };

  function groupLabel(g) {
    const k = String(g || '').toLowerCase();
    return GROUP_LABELS[k] ?? (k ? k[0].toUpperCase() + k.slice(1) : 'Voters');
  }

  // Map (group, powerSource) → human-readable copy per the TRD.
  function powerSourceCopy(group, powerSource) {
    const g = String(group || '').toLowerCase();
    const p = String(powerSource || '');
    if (p === 'CredentialBased') return 'one vote per credential';
    if (p === 'PledgeBased') return 'by pool pledge';
    if (p === 'StakeBased') {
      if (g === 'drep') return 'by delegated voting power';
      if (g === 'pool') return 'by total delegated stake';
      if (g === 'stake') return 'by ADA held at snapshot';
      return 'by stake';
    }
    return p || '—';
  }
</script>

{#if collapsible}
  <button
    type="button"
    class="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
    onclick={() => (open = !open)}
  >
    Ballot details
    <ChevronDown class="h-3 w-3 transition-transform {open ? 'rotate-180' : ''}" />
  </button>
{/if}

{#if open}
  <section class="text-xs *:mb-1" class:mt-1={collapsible}>
    <div><span class="font-semibold">Ballot ID:</span> {ballot._id}</div>
    {#if hasVoterGroups}
      <div>
        <span class="font-semibold">Eligible voters:</span>
        {voterGroups.map((g) => groupLabel(g.group)).join(', ')}
      </div>
      <div class="mt-1">
        <span class="font-semibold">Vote weight:</span>
        <ul class="ml-2 mt-0.5 list-none">
          {#each voterGroups as g}
            <li class="text-muted-foreground">
              <span class="font-medium text-foreground">{groupLabel(g.group)}</span>
              vote <span class="italic">{powerSourceCopy(g.group, g.powerSource)}</span>.
            </li>
          {/each}
        </ul>
      </div>
    {:else if ballot.source === 'hydra'}
      <div role="alert" class="mt-1 rounded border border-red-300 bg-red-50 px-2 py-1 text-red-800">
        <span class="font-semibold">Eligibility data missing.</span>
        This Hydra ballot was published without
        <code class="rounded bg-red-100 px-1 text-[0.85em]">voterGroups</code>
        — voting cannot proceed until the ballot authority republishes it.
      </div>
    {:else if ballot.voterDescription}
      <div>
        <span class="font-semibold">Eligibility:</span>
        {ballot.voterDescription}
      </div>
    {:else if ballot.voterType}
      <div>
        <span class="font-semibold">Voter Group:</span>
        {groupLabel(ballot.voterType)}
      </div>
    {/if}

    {#if ballot.status == 'live'}
      <div>
        <span class="font-semibold">Voting ends on:</span>
        {convertTimestamp(ballot.votePeriodEnd)}
      </div>
    {/if}
    {#if ballot.status == 'closed'}
      <div>
        <span class="font-semibold">Voting ended on:</span>
        {convertTimestamp(ballot.votePeriodEnd)}
      </div>
    {/if}
    {#if ballot.status == 'upcoming'}
      <div>
        <span class="font-semibold">Voting starts on:</span>
        {convertTimestamp(ballot.votePeriodStart)}
      </div>

      <div>
        <span class="font-semibold">Voting ends on:</span>
        {convertTimestamp(ballot.votePeriodEnd)}
      </div>
    {/if}

    {#if ballot?.status == 'closed'}
      <div>
        <span class="font-semibold">On-Chain Results:</span>
        {#if ballot.resultTxHash}
          <a
            href={$config.explorerTxBase + ballot.resultTxHash}
            target="_blank"
            rel="noopener noreferrer"
            class="link inline-block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap align-bottom"
          >
            {ballot.resultTxHash}
          </a>
        {:else}
          Pending
        {/if}
      </div>
    {/if}
  </section>
{/if}

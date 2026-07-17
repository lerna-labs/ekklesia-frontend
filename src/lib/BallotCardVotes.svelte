<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import BallotDetails from './BallotDetails.svelte';
  import Badge from '$lib/BallotBadge.svelte';

  let { ballot } = $props();
  let proposals = $derived(ballot.proposals);
  import { convertTimestamp } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button/index.js';

  // The voters API returns most vote types as flat label arrays
  // (`["Yes"]`, `[42]`, `["Alice", "Bob"]`). Likert and Weighted are
  // per-option and arrive as objects: `{option, optionLabel, value}`.
  // Render them as `<label>: <value>` so the row shows the per-option
  // detail instead of a row of opaque badges.
  function isStructured(entry) {
    return entry && typeof entry === 'object' && 'value' in entry;
  }

  function formatStructured(entry, voteType) {
    const label = entry.optionLabel ?? entry.option ?? '';
    if (voteType === 'weighted') {
      return `${label} · ${entry.value} pts`;
    }
    return `${label}: ${entry.value}`;
  }
</script>

<Card.Root class="mb-4">
  <Card.Header class="pt-5">
    <Card.Title class="flex gap-2 text-xl">
      {ballot.title}
      <div>
        <Badge status={ballot.status} />
      </div>
    </Card.Title>
    <Card.Description>
      <BallotDetails {ballot} />
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
      <div>Proposal</div>
      <div>
        {#if ballot.status === 'live'}Current vote
        {:else}Final vote
        {/if}
      </div>
    </div>
    {#each proposals as proposal}
      <div class="mb-4">
        <div class="flex items-start gap-2">
          <div class="flex-1 font-medium">
            <a
              href={'/ballots/' + ballot._id + '/proposals/' + proposal.proposalId}
              target="_blank"
              class="cursor-pointer">{proposal.title}</a
            >
            <div class="text-xs text-slate-500">
              <span>Proposal ID:</span>{proposal.proposalId}
            </div>
          </div>

          <div class="flex flex-col items-end gap-0.5">
            {#each proposal.vote as entry}
              {#if isStructured(entry)}
                <div
                  class="w-full overflow-hidden whitespace-nowrap rounded-md bg-slate-500 px-3 py-1 text-center text-xs text-slate-100"
                >
                  {formatStructured(entry, proposal.voteType)}
                </div>
              {:else}
                <div
                  class="w-full overflow-hidden whitespace-nowrap rounded-md px-3 py-1 text-center text-xs {entry ===
                  'Yes'
                    ? 'bg-green-500 text-green-100'
                    : entry === 'No'
                      ? 'bg-red-500 text-red-100'
                      : 'bg-slate-500 text-slate-100'}"
                >
                  {entry}
                </div>
              {/if}
            {/each}
          </div>
        </div>
        <div class="mt-1 text-sm">{proposal.description}</div>
      </div>
    {/each}
  </Card.Content>
  <Card.Footer class="flex gap-1">
    <Button href={'/ballots/' + ballot._id + '/proposals'}>View Ballot</Button>
  </Card.Footer>
</Card.Root>

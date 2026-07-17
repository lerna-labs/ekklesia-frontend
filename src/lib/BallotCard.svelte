<script>
  import MarkdownBrief from './base/MarkdownBrief.svelte';
  import Badge from '$lib/BallotBadge.svelte';
  import SourceBadge from '$lib/BallotSourceBadge.svelte';
  import BallotDetails from './BallotDetails.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { convertTimestamp, lovelaceToAda } from '$lib/utils.js';
  let { ballot } = $props();

  const isLong = $derived((ballot.description ?? '').length > 300);
  let expanded = $state(false);
</script>

<Card.Root class="z-1000 relative mb-4">
  <Card.Header class="pt-5">
    <Card.Title class="flex gap-2 text-xl">
      {ballot.title}
      <Badge status={ballot.status} />
      <SourceBadge source={ballot.source} />
    </Card.Title>
    <Card.Description>
      <BallotDetails {ballot} />
    </Card.Description>
  </Card.Header>
  <Card.Content class="pt-4 text-sm">
    {#if ballot.description}
      <div class={isLong && !expanded ? 'line-clamp-6' : ''}>
        <MarkdownBrief markdown={ballot.description} inline headings="flatten" />
      </div>
      {#if isLong}
        <button
          onclick={() => (expanded = !expanded)}
          class="mt-2 text-xs font-medium text-brand hover:text-brand-hover"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      {/if}
    {/if}
  </Card.Content>

  <Card.Footer class="flex items-center justify-between">
    <Button href={'/ballots/' + ballot._id + '/proposals'} variant="outline" size="sm">
      View Ballot
    </Button>
  </Card.Footer>
</Card.Root>

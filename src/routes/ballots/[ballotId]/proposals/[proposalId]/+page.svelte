<script>
  import { loggedIn } from '$stores/sessionManager.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Accordion from '$lib/components/ui/accordion/index.js';
  import BallotBadge from '$lib/BallotBadge.svelte';
  import ProposalVote from '$lib/ProposalVote.svelte';
  import ProposalDetails from '$lib/ProposalDetails.svelte';
  import BallotDetails from '$lib/BallotDetails.svelte';
  import BallotEligibilityBanner from '$lib/BallotEligibilityBanner.svelte';
  import { convertTimestamp } from '$lib/utils';
  import Button from '$lib/components/ui/button/button.svelte';
  import Markdown from '$lib/base/Markdown.svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { seedBallotFromMine } from '$lib/draftVotes.js';
  let { data } = $props();
  const ballot = $derived(data.ballot);
  const proposal = $derived(data.proposal);
  const proposalData = $derived(proposal.data);
  const basePath = $derived(`/ballots/${ballot._id}/proposals`);

  // Mirror /mine into the local drafts + submitted-baseline stores so the
  // vote form repopulates with prior selections and the broker package
  // always carries every previously-submitted question on this ballot —
  // not just the one the voter is currently editing.
  //
  // `$effect.pre` runs before the vote form mounts so its first paint
  // reads the seeded draft directly. The vote forms therefore don't need
  // a `voterVote` fallback in their `draft` derivation — see the
  // proposals listing page for the rationale around per-proposal Clear.
  $effect.pre(() => {
    if (data.mine && ballot?._id) {
      seedBallotFromMine(ballot._id, data.mine);
    }
  });
</script>

<div class="flex gap-2 text-xl">
  <h1 class="mb-1">{proposal.title}</h1>
  <BallotBadge status={ballot.status} />
</div>

<section class="text-sm text-muted-foreground">
  <BallotDetails {ballot} collapsible />
  <ProposalDetails {proposal} {ballot} />
</section>

<BallotEligibilityBanner {ballot} />

{#if data.prev || data.next}
  <nav
    class="mt-5 flex items-stretch gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-1.5"
    aria-label="Proposal navigation"
  >
    {#if data.prev}
      <a
        href="{basePath}/{data.prev._id}"
        class="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white hover:shadow-sm"
      >
        <ChevronLeft class="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-orange-600" />
        <div class="min-w-0">
          <div class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Previous
          </div>
          <div class="truncate text-xs font-medium text-foreground">{data.prev.title}</div>
        </div>
      </a>
    {:else}
      <div class="flex-1"></div>
    {/if}

    <a
      href={basePath}
      class="flex shrink-0 items-center rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white hover:text-foreground hover:shadow-sm"
    >
      All
    </a>

    {#if data.next}
      <a
        href="{basePath}/{data.next._id}"
        class="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-md px-3 py-2 text-right text-sm transition-colors hover:bg-white hover:shadow-sm"
      >
        <div class="min-w-0">
          <div class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Next
          </div>
          <div class="truncate text-xs font-medium text-foreground">{data.next.title}</div>
        </div>
        <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-orange-600" />
      </a>
    {:else}
      <div class="flex-1"></div>
    {/if}
  </nav>
{/if}

{#if proposal.summary}
  <section class="mt-6">
    <h2 class="mb-1 text-lg">Summary</h2>
    <Markdown markdown={proposal.summary} />
  </section>
{:else if proposal.description}
  <section class="mt-6">
    <h2 class="mb-1 text-lg">Description</h2>
    <Markdown markdown={proposal.description} />
  </section>
{/if}

{#if proposal.rationale}
  <section class="mt-6">
    <h2 class="mb-1 text-lg">Rationale</h2>
    <Markdown markdown={proposal.rationale} />
  </section>
{/if}

{#if proposal.data?.details}
  <section class="mt-6">
    <h2 class="mb-1 text-lg">Proposal Details</h2>
    <Markdown markdown={proposal.data.details} />
  </section>
{/if}

{#if proposal.data?.collapsible}
  <section class="mt-6">
    <h2 class="mb-1 text-lg">{proposal.data.collapsible.title}</h2>
    <Accordion.Root type="multiple" class="w-full">
      {#each proposal.data.collapsible.items as item, index}
        <Accordion.Item value={'item-' + index}>
          <Accordion.Trigger>
            {item.title}
          </Accordion.Trigger>
          <Accordion.Content class="pb-4 pt-0">
            <Markdown markdown={item.content} />
            <div class="mt-4">
              {#if item.link}
                <Button
                  variant="outline"
                  size="sm"
                  as="a"
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View More
                </Button>
              {/if}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>
  </section>
{/if}

{#if proposal.data?.links}
  <section class="mt-6">
    <h2 class="mb-2 text-lg">Additional Information</h2>
    <ul class="square-list pl-4 text-sm">
      {#each proposal.data.links as link}
        <li>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-orange-600 hover:underline"
          >
            {link.name || link.url}
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<div id="results"></div>
<div class="mt-[72px]"></div>
<div class="mt-3 w-full border-b">
  <div class="relative left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] w-screen bg-slate-900">
    <div class="m-auto grid max-w-3xl grid-cols-1 gap-6 p-4 pb-12 pt-8 text-white md:grid-cols-1">
      <Card.Root class="flex h-full flex-col">
        <Card.Content class="flex-1 pt-6 text-muted-foreground">
          <ProposalVote {ballot} {proposal} />
        </Card.Content>
      </Card.Root>

      {#if ballot.status !== 'upcoming'}
        <Button
          href={'/ballots/' + ballot._id + '/proposals/' + proposal._id + '/results'}
          variant="primary"
          class="m-auto bg-orange-600 text-white"
        >
          View {ballot.status == 'live' ? 'Preliminary' : 'Final'} Results
        </Button>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(.square-list li) {
    list-style-type: square;
  }
</style>

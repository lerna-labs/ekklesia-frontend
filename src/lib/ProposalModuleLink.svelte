<script>
  import { Button } from '$lib/components/ui/button/index.js';
  import { ExternalLink, MessageSquare } from 'lucide-svelte';

  // Cross-link from the voting UI out to the upstream proposals module.
  //
  // The voting layout only renders a proposal's short `summary` (and
  // optionally `rationale`). The proposals module is the system of
  // record for the complete text, threaded comments, and version
  // history — any of which can run to tens of thousands of characters
  // that won't fit a vote-focused page.
  //
  // Backend wiring: `proposal.externalProposal` is populated by the v1
  // import pipeline for ballots pushed from a proposals module
  // (`Ballot.proposalSource` carries the module-level metadata).
  //   - `.url`              canonical proposal page in that module
  //   - `.id`               external proposal id (informational)
  //   - `.snapshot.version` the proposal version this ballot captured
  // Comments are a deep-linkable `#comments` anchor on that same page.
  // Legacy / scaffold-created ballots carry no `externalProposal`, so
  // the component renders nothing for them.
  //
  // `variant`: 'panel' — full block for the proposal detail page;
  //            'inline' — single compact link for listing cards.
  let { proposal, variant = 'panel' } = $props();

  const externalUrl = $derived(proposal?.externalProposal?.url ?? null);
  // Strip any pre-existing fragment before appending our own anchor so
  // `${base}#comments` reliably lands on the comments section.
  const commentsUrl = $derived(externalUrl ? externalUrl.split('#')[0] + '#comments' : null);
  const version = $derived(proposal?.externalProposal?.snapshot?.version ?? null);
</script>

{#if externalUrl}
  {#if variant === 'inline'}
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="link inline-flex items-center gap-1 text-xs"
    >
      Full proposal &amp; comments
      <ExternalLink class="h-3 w-3 shrink-0" />
    </a>
  {:else}
    <section class="mt-6 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div class="flex items-start justify-between gap-2">
        <h2 class="!mb-0 text-sm font-semibold">Full proposal</h2>
        {#if version}
          <span class="shrink-0 font-mono text-[11px] text-muted-foreground">
            version {version}
          </span>
        {/if}
      </div>
      <p class="mt-1 text-xs text-muted-foreground">
        This page shows an abbreviated summary. Comments, version history, and the complete proposal
        text are maintained in the proposals module.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <Button
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          variant="outline"
        >
          <ExternalLink aria-hidden="true" />
          View full proposal
        </Button>
        <Button
          href={commentsUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          variant="outline"
        >
          <MessageSquare aria-hidden="true" />
          Comments
        </Button>
      </div>
    </section>
  {/if}
{/if}

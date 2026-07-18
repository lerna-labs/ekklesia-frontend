<script>
  import Badge from '$lib/BallotBadge.svelte';
  import SourceBadge from '$lib/BallotSourceBadge.svelte';
  import CertificationBadge from '$lib/CertificationBadge.svelte';
  import ProposalCard from '$lib/ProposalCard.svelte';
  import ProposalTable from '$lib/ProposalTable.svelte';
  import Pagination from '$lib/base/Pagination.svelte';
  import FacetControls from '$lib/FacetControls.svelte';
  import Search from '$lib/base/Search.svelte';
  import BallotDetails from '$lib/BallotDetails.svelte';
  import MarkdownBrief from '$lib/base/MarkdownBrief.svelte';
  import BallotCosignerPrompt from '$lib/BallotCosignerPrompt.svelte';
  import BallotProvenance from '$lib/BallotProvenance.svelte';
  import AuditMyVote from '$lib/AuditMyVote.svelte';
  import BallotEligibilityBanner from '$lib/BallotEligibilityBanner.svelte';
  import BrokerVoteFlow from '$lib/BrokerVoteFlow.svelte';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { CalendarClock, ShieldCheck, ShieldAlert } from 'lucide-svelte';
  import WalletMinimalIcon from '@lucide/svelte/icons/wallet-minimal';
  import { Button } from '$lib/components/ui/button/index.js';
  import { convertTimestamp } from '$lib/utils.js';
  import { acceptedCredentialsOf, credentialLabel, voterCredentialFromId } from '$lib/utils.js';
  import { loggedIn, user, showLogin } from '$stores/sessionManager.js';
  import {
    draftsTree,
    submittedTree,
    revertBallotDraftsToBaseline,
    seedBallotFromMine,
    divergentBallotChangeCount,
  } from '$lib/draftVotes.js';
  import { draftIsComplete, incompleteDraftReason } from '$lib/voteSchema.js';
  let view = $state('grid');

  let { data } = $props();
  // Derived (not $state) so after a mid-session login triggers
  // invalidateAll() + re-run of the loader, the re-fetched ballot —
  // including the now-present `voterValidated` — flows through into
  // every downstream $derived (eligibility shield, canSubmit, etc.).
  const ballot = $derived(data.ballot);

  // Mirror /mine into the local drafts + submitted-baseline stores. Seeding
  // drafts from prior selections is what makes "edit one of N votes and
  // submit" actually ship all N to the broker — without this, Hydra would
  // take the partial package as canonical and wipe the voter's other
  // previously-recorded votes.
  //
  // `$effect.pre` runs synchronously BEFORE the DOM updates — including
  // before the proposal cards' first mount — so the vote forms read the
  // seeded drafts on their first paint. The vote forms therefore don't
  // need a `voterVote` fallback in their `draft` derivation, which is
  // what lets per-proposal Clear actually clear (a fallback to
  // `voterVote` would silently re-derive the prior selection the moment
  // the drafts entry was removed). Re-runs on subsequent loader refreshes
  // (post-submit invalidateAll, etc.).
  $effect.pre(() => {
    if (data.mine && ballot?._id) {
      seedBallotFromMine(ballot._id, data.mine);
    }
  });

  // Count of this ballot's proposals the voter has drafted, for the
  // "3 of 5 drafted" progress hint on the header.
  const draftedCount = $derived(Object.keys($draftsTree?.[ballot._id] ?? {}).length);
  const totalProposals = $derived(data.pagination?.total ?? 0);

  // True when the voter has any prior submission for this ballot — drives
  // the "Submit my vote" vs "Submit N changed votes" CTA copy. Read from
  // $submittedTree (not data.mine) so it stays consistent if other tabs
  // or this tab's own clearBallotDrafts wipe the baseline mid-session.
  const hasSubmittedBaseline = $derived(Object.keys($submittedTree?.[ballot._id] ?? {}).length > 0);
  // Number of drafts that diverge from the submitted baseline — the count
  // of edits the next submission would actually change on Hydra. Reads
  // both stores so adding, modifying, or clearing a vote all bump it.
  const changedCount = $derived.by(() => {
    void $draftsTree;
    void $submittedTree;
    return divergentBallotChangeCount(ballot._id);
  });

  // Pre-flight validation of every drafted proposal on the visible page —
  // blocks Submit when a Likert / Ranked / Weighted draft is partial so the
  // broker doesn't reject it with a cryptic INVALID_VOTE round-trip later.
  // Drafts on other pages (rare with the default 25/page) can't be schema-
  // validated here; the broker remains the final guard for those.
  const incompleteDrafts = $derived.by(() => {
    const ballotDrafts = $draftsTree?.[ballot._id] ?? {};
    const out = [];
    for (const proposal of data.proposals ?? []) {
      const draft = ballotDrafts[proposal._id];
      if (!draft) continue;
      if (draftIsComplete(proposal, draft)) continue;
      out.push({
        id: proposal._id,
        title: proposal.title || `Proposal ${proposal._id}`,
        reason: incompleteDraftReason(proposal, draft),
      });
    }
    return out;
  });

  // Submit CTA only surfaces when the ballot actually accepts submissions
  // (live + hydra-sourced per the project's no-write-CTAs-on-legacy rule)
  // and the voter actually has *changes* to submit — drafts that match
  // the previously-submitted baseline are a no-op resend. Partial drafts
  // on the visible page block submit; the panel shows which to fix.
  const canSubmit = $derived(
    $loggedIn && ballot.status === 'live' && ballot.source === 'hydra' && changedCount > 0,
  );
  const submitBlocked = $derived(incompleteDrafts.length > 0);

  // "Submit my vote(s)" reads better for a first-time voter than
  // "Submit 3 changed votes" (nothing to compare against). Once any
  // baseline exists, the count phrasing is more transparent about
  // what the click actually does.
  const submitButtonText = $derived.by(() => {
    if (!hasSubmittedBaseline) {
      return draftedCount === 1 ? 'Submit my vote' : 'Submit my votes';
    }
    return changedCount === 1 ? 'Submit 1 changed vote' : `Submit ${changedCount} changed votes`;
  });

  // Status-panel copy absorbed from the old /ballots/[ballotId] detail
  // page (which now redirects here). Keeps the useful bits —
  // voting-window dates and eligibility shield — in one canonical spot.
  const statusCopy = $derived.by(() => {
    if (!ballot) return '';
    // Live + logged in: let the eligibility shield speak for itself.
    // Live + logged out: a dedicated "Log in to vote" CTA renders
    // below the status line — no prose needed here.
    if (ballot.status === 'live') return '';
    if (ballot.status === 'upcoming')
      return 'Voting has not opened yet. You can review the proposals now.';
    if (ballot.status === 'closed') {
      if (ballot.certification?.certified) {
        return 'Voting has closed. Authority-certified results are available below.';
      }
      if (ballot.certification?.narrative?.url) {
        return 'Voting has closed. The voting authority has published a narrative endorsement.';
      }
      return 'Voting has closed. Provisional results are below — awaiting authority certification.';
    }
    return '';
  });

  const acceptedCredentials = $derived(acceptedCredentialsOf(ballot));
  const voterCredential = $derived(voterCredentialFromId($user?.voterId));
  const hasTypeMismatch = $derived(
    $loggedIn &&
      !!acceptedCredentials &&
      voterCredential != null &&
      !acceptedCredentials.includes(voterCredential),
  );
  const isEligible = $derived($loggedIn && !hasTypeMismatch && ballot?.voterValidated);
  // Fallback when we're logged in with a matching credential type but
  // the backend hasn't populated `voterValidated` (typical on closed
  // ballots — validation script isn't re-run for past voting windows).
  // Better than showing nothing on a hole in the positive-confirmation
  // branch.
  const credentialsMatchOnly = $derived(
    $loggedIn &&
      !hasTypeMismatch &&
      !isEligible &&
      ballot?.voterValidated !== false &&
      Array.isArray(acceptedCredentials) &&
      voterCredential != null &&
      acceptedCredentials.includes(voterCredential),
  );

  // "Undrafted first" toggle — floats proposals the voter hasn't drafted
  // yet to the top so they don't have to hunt through the list to find
  // remaining work. Stable within each group so author-declared ordering
  // is preserved within drafted and undrafted partitions. Default off to
  // respect the ballot's natural sequence (e.g. amendment order).
  let undraftedFirst = $state(false);
  const showUndraftedToggle = $derived($loggedIn && ballot.status === 'live' && totalProposals > 1);
  const sortedProposals = $derived.by(() => {
    const list = data.proposals ?? [];
    if (!undraftedFirst) return list;
    const ballotDrafts = $draftsTree?.[ballot._id] ?? {};
    const hasDraft = (p) => !!ballotDrafts[p._id];
    // Stable sort: undrafted stays in order, drafted stays in order,
    // drafted all move to the bottom.
    return [...list].sort((a, b) => {
      const ad = hasDraft(a);
      const bd = hasDraft(b);
      if (ad === bd) return 0;
      return ad ? 1 : -1;
    });
  });
</script>

<h1 class="text-3xl">{ballot.title}</h1>
<div class="mb-3 mt-2 flex flex-wrap items-center gap-2">
  <Badge status={ballot.status} />
  <SourceBadge source={ballot.source} />
  <CertificationBadge certification={ballot.certification} ballotStatus={ballot.status} />
</div>
<BallotDetails {ballot} class="mt-2" />

{#if ballot.description}
  <MarkdownBrief
    markdown={ballot.description}
    class="mt-3 text-muted-foreground"
    headings="demote"
    headingStartLevel={2}
  />
{/if}

<div class="mt-4 rounded-md border border-slate-200 bg-slate-50/50 p-4 text-sm">
  {#if statusCopy}
    <p class="mb-2 text-slate-700">{statusCopy}</p>
  {/if}

  <div class="grid gap-1 text-xs text-muted-foreground">
    {#if ballot.status === 'live' && ballot.votePeriodEnd}
      <div class="inline-flex items-center gap-1">
        <CalendarClock class="h-3 w-3" aria-hidden="true" />
        Voting ends {convertTimestamp(ballot.votePeriodEnd)}
      </div>
    {:else if ballot.status === 'upcoming' && ballot.votePeriodStart}
      <div class="inline-flex items-center gap-1">
        <CalendarClock class="h-3 w-3" aria-hidden="true" />
        Voting opens {convertTimestamp(ballot.votePeriodStart)}
      </div>
    {:else if ballot.status === 'closed' && ballot.votePeriodEnd}
      <div class="inline-flex items-center gap-1">
        <CalendarClock class="h-3 w-3" aria-hidden="true" />
        Voting ended {convertTimestamp(ballot.votePeriodEnd)}
      </div>
    {/if}

    {#if $loggedIn}
      {#if isEligible}
        <div class="inline-flex items-center gap-1 text-emerald-700">
          <ShieldCheck class="h-3 w-3" aria-hidden="true" />
          You are eligible to vote on this ballot
        </div>
      {:else if hasTypeMismatch}
        <div class="inline-flex items-center gap-1 text-amber-700">
          <ShieldAlert class="h-3 w-3" aria-hidden="true" />
          Your credential ({credentialLabel(voterCredential)}) is not accepted — this ballot
          requires {acceptedCredentials.map(credentialLabel).join(' or ')}
        </div>
      {:else if ballot.voterValidated === false}
        <div class="inline-flex items-center gap-1 text-amber-700">
          <ShieldAlert class="h-3 w-3" aria-hidden="true" />
          You don't meet this ballot's voter eligibility requirements
        </div>
      {:else if credentialsMatchOnly}
        <div class="inline-flex items-center gap-1 text-slate-600">
          <ShieldCheck class="h-3 w-3" aria-hidden="true" />
          Your credentials match this ballot's accepted types
        </div>
      {/if}
    {/if}
  </div>

  {#if !$loggedIn && ballot.status === 'live'}
    <div class="mt-3 flex flex-wrap items-center gap-3">
      <Button size="sm" onclick={() => showLogin.set(true)}>
        <WalletMinimalIcon class="h-4 w-4" aria-hidden="true" />
        Log in to vote
      </Button>
      <span class="text-xs text-muted-foreground">
        Connect a wallet to check your eligibility and cast a vote.
      </span>
    </div>
  {/if}
</div>

<BallotEligibilityBanner {ballot} />
<BallotCosignerPrompt {ballot} />
<BallotProvenance {ballot} />
<AuditMyVote {ballot} />

<section class="mt-6">
  <header class="mb-4">
    <h2 class="mb-3">Proposals ({data.pagination.total})</h2>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div class="min-w-0 max-w-xs flex-1">
        <Search />
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {#if showUndraftedToggle}
          <label
            class="inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-muted-foreground"
            title="Float proposals you haven't voted on yet to the top of the list."
          >
            <Switch bind:checked={undraftedFirst} id="undraftedFirst" />
            <Label for="undraftedFirst" class="cursor-pointer">Not voted first</Label>
          </label>
        {/if}
        <FacetControls facets={ballot.facets} applied={data.applied} />
      </div>
    </div>
  </header>

  {#if data.proposals.length > 0}
    {#if view == 'grid'}
      {#each sortedProposals as proposal (proposal._id)}
        <ProposalCard {ballot} {proposal} />
      {/each}
    {/if}

    {#if view == 'list'}
      <ProposalTable {ballot} proposalList={sortedProposals} />
    {/if}
  {:else}
    <p>No proposals found.</p>
  {/if}
</section>

{#if data.pagination.total > data.perPage}
  <div class="mt-4 flex justify-center">
    <Pagination
      count={data.pagination.total}
      perPage={data.perPage}
      currentPage={data.currentPage}
      {...data.pagination}
    />
  </div>
{/if}

<div class="mt-12"></div>

{#if canSubmit}
  <!-- Sticky (not fixed) so it sits within main's flow and the page
	     Footer (version number, etc.) stays visible when the user scrolls
	     all the way down — the submission bar detaches at the bottom of
	     its containing block instead of covering the Footer.

	     Full-bleed via symmetric negative inline margins
	     (`calc(50% - 50vw)`) so the bar visually spans the viewport even
	     though it's still parented under <main> (max-w-3xl).
	     IMPORTANT: don't use `left: 50%` here — for a `position: sticky`
	     element, `left/right/top/bottom` define the sticky threshold, NOT
	     a positioning offset. Combining `left: 50%` with
	     `transform: translateX(-50%)` only happened to land at zero on
	     viewports narrow enough that <main> filled the screen; on a
	     window-half (e.g. 960px) the bar drifted ~30% off-screen left.
	     The margin trick works regardless of viewport / parent width.

	     The inner row stays centered at `max-w-3xl` so buttons and copy
	     still land in the reading column. `body { overflow-x-hidden }`
	     (in app.css) absorbs any 100vw-vs-scrollbar-gutter difference on
	     platforms that reserve gutter space. -->
  <div
    class="sticky bottom-0 z-40 mx-[calc(50%_-_50vw)] w-screen border-t-2 border-brand bg-white/95 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.12)] backdrop-blur"
    role="region"
    aria-label="Ballot submission"
  >
    <div class="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
      {#if submitBlocked}
        <div
          class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900"
          role="status"
        >
          <ShieldAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold">
              {incompleteDrafts.length} proposal{incompleteDrafts.length === 1 ? '' : 's'}
              need{incompleteDrafts.length === 1 ? 's' : ''} a fix before you can submit
            </div>
            <ul class="mt-1 space-y-0.5">
              {#each incompleteDrafts as item (item.id)}
                <li class="truncate">
                  <a
                    href={'/ballots/' + ballot._id + '/proposals/' + item.id}
                    class="font-medium underline decoration-amber-400/60 underline-offset-2 hover:decoration-amber-700"
                  >
                    {item.title}
                  </a>
                  {#if item.reason}
                    <span class="text-amber-800">— {item.reason}</span>
                  {/if}
                </li>
              {/each}
            </ul>
            <p class="mt-1 text-amber-800">
              Complete each one or switch it to abstain. Partial drafts are kept locally but the
              Hydra broker rejects them on submission.
            </p>
          </div>
        </div>
      {/if}
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0 flex-1 text-sm">
          <div class="font-semibold text-slate-900">
            {#if hasSubmittedBaseline}
              {changedCount === 1
                ? '1 change pending submission'
                : `${changedCount} changes pending submission`}
            {:else}
              You've voted on {draftedCount} of {totalProposals} proposal{totalProposals === 1
                ? ''
                : 's'} on this ballot
            {/if}
          </div>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {#if hasSubmittedBaseline}
              Submitting will replace your previously-recorded ballot on Hydra with your full set of
              selections — only the proposals listed as changed actually differ from what's already
              on-chain.
            {:else if draftedCount < totalProposals}
              Proposals you haven't voted on will be excluded from your submission. Vote on the rest
              or submit what you have.
            {:else}
              You've voted on every proposal. Submit to sign your ballot and commit it to the Hydra
              voting head.
            {/if}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-slate-100 hover:text-red-700"
            onclick={() => {
              if (
                confirm(
                  'Discard your unsubmitted edits and revert every proposal on this ballot to the vote you previously recorded on Hydra? Proposals you have not yet voted on will be cleared.',
                )
              ) {
                revertBallotDraftsToBaseline(ballot._id);
              }
            }}
            title="Undo every unsubmitted edit on this ballot — restores each proposal to your previously-recorded selection. Your on-chain ballot is not changed."
          >
            Discard changes
          </button>
          {#if submitBlocked}
            <Button
              size="sm"
              disabled
              title="Resolve the incomplete proposals listed above before submitting."
            >
              <WalletMinimalIcon class="size-4 shrink-0" aria-hidden="true" />
              {submitButtonText}
            </Button>
          {:else}
            <BrokerVoteFlow {ballot} buttonText={submitButtonText} />
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<script>
  import { onMount } from 'svelte';
  import BallotBadge from '$lib/BallotBadge.svelte';
  import CertificationBadge from '$lib/CertificationBadge.svelte';
  import CertificationHistoryDisclosure from '$lib/CertificationHistoryDisclosure.svelte';
  import ProposalDetails from '$lib/ProposalDetails.svelte';
  import ResultsStatus from '$lib/ResultsStatus.svelte';
  import GroupResultCard from '$lib/results/GroupResultCard.svelte';
  import AbstainedByRolePanel from '$lib/results/AbstainedByRolePanel.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { fetchProposalResult, startResultsPoller } from '$lib/results.js';
  import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-svelte';

  let { data } = $props();
  const ballot = $derived(data.ballot);
  const proposal = $derived(data.proposal);
  const certification = $derived(data.certification);
  const basePath = $derived(`/ballots/${ballot._id}/proposals`);
  const hasWeight = $derived(ballot.voteWeighted);

  // Live-updating result. Seeded from the load fn, refreshed by the poller.
  let result = $state(data.initialResult);
  $effect(() => {
    result = data.initialResult;
  });

  // Canonical display names for the voter-group keys the backend emits.
  // Anything not listed here falls back to a simple capitalization so a
  // new group type still renders, just without the custom label.
  const GROUP_LABELS = {
    drep: 'DRep',
    pool: 'SPO',
    spo: 'SPO',
    stake: 'Stakeholder',
    stakeholder: 'Stakeholder',
    addr: 'Payment Address',
    default: 'Other',
  };

  function groupLabel(key) {
    const k = String(key || '').toLowerCase();
    return GROUP_LABELS[k] ?? key.charAt(0).toUpperCase() + key.slice(1);
  }

  const voteType = $derived(String(proposal?.voteType ?? 'default').toLowerCase());

  // Sum the active voting count + power for a group based on vote type:
  //   - discrete (default/preference/budget): sum `results[].votingPower`
  //   - scale: numeric voters live in `scale.histogram[]`; fold in abstain row
  //   - ranked: every voter appears once at rank-1 across rows; sum
  //     `ranked.rows[i].power[0]`; fold in abstain row
  //   - likert: every voter rates every option so the per-option count
  //     and totalPower are the same across rows; read the first option's
  //     stats, fold in abstain row
  function activeTotals(group, type) {
    const rows = Array.isArray(group?.results) ? group.results : [];
    let voters = 0;
    let power = 0;

    if (type === 'scale' && group?.scale) {
      for (const b of group.scale.histogram ?? []) {
        voters += b.count || 0;
        power += b.power || 0;
      }
      for (const r of rows) {
        if (r.id === 'abstain') {
          voters += r.count || 0;
          power += r.votingPower || 0;
        }
      }
    } else if (type === 'ranked' && group?.ranked) {
      for (const r of group.ranked.rows ?? []) {
        voters += r.counts?.[0] || 0;
        power += r.power?.[0] || 0;
      }
      for (const r of rows) {
        if (r.id === 'abstain') {
          voters += r.count || 0;
          power += r.votingPower || 0;
        }
      }
    } else if (type === 'likert' && group?.likert) {
      const first = group.likert.options?.[0];
      voters += first?.stats?.count || 0;
      power += first?.weightedStats?.totalPower || 0;
      for (const r of rows) {
        if (r.id === 'abstain') {
          voters += r.count || 0;
          power += r.votingPower || 0;
        }
      }
    } else if (type === 'weighted' && group?.weighted) {
      voters += Number(group.weighted.answeringBallots) || 0;
      // Sum of powerTotalPoints across options / budget ≈ total voting
      // power of answering voters (each voter's power contributes
      // `voterPower * budget` to the sum).
      const budget = Number(group.weighted.budget) || 0;
      if (budget > 0) {
        const sumPower = (group.weighted.results ?? []).reduce(
          (s, o) => s + (Number(o.powerTotalPoints) || 0),
          0,
        );
        power += sumPower / budget;
      }
      for (const r of rows) {
        if (r.id === 'abstain') {
          voters += r.count || 0;
          power += r.votingPower || 0;
        }
      }
    } else {
      for (const r of rows) {
        voters += r.count || 0;
        power += r.votingPower || 0;
      }
    }

    return { voters, power };
  }

  // True when a finalized/certified Result row is missing its tally
  // payload — the finalize handler recorded evidence/hashes but never
  // populated resultsByGroup or abstainedByRole. Render a clear error
  // rather than a silent blank section under the results banner.
  const finalButEmpty = $derived.by(() => {
    if (result?.source !== 'final' && result?.source !== 'certified') return false;
    const byGroup = result?.resultsByGroup;
    const hasGroups = byGroup && typeof byGroup === 'object' && Object.keys(byGroup).length > 0;
    const hasAbstain =
      result?.abstainedByRole &&
      typeof result.abstainedByRole === 'object' &&
      Object.keys(result.abstainedByRole).length > 0;
    return !hasGroups && !hasAbstain;
  });

  const groups = $derived.by(() => {
    const raw = result?.resultsByGroup;
    if (!raw || typeof raw !== 'object') return [];
    const participation = result?.ballotParticipation ?? null;
    return Object.entries(raw).map(([key, group]) => {
      const rows = Array.isArray(group?.results) ? group.results : [];
      const sorted = hasWeight ? [...rows].sort((a, b) => b.votingPower - a.votingPower) : rows;
      const { voters: derivedVoters, power: activePower } = activeTotals(group, voteType);
      // `totalVotes` from the backend is reliable for discrete vote
      // types (includes abstainers). For ranked + scale it's not — the
      // cron `$unwind`s rank arrays / numeric values and over-counts.
      // Our derived count is correct for all types.
      const activeVoters =
        voteType === 'ranked' ||
        voteType === 'scale' ||
        voteType === 'likert' ||
        voteType === 'weighted'
          ? derivedVoters
          : (group.totalVotes ?? derivedVoters);
      const totalAllowedVoterCount =
        group.totalAllowedVoterCount ?? participation?.voterCount?.[key] ?? null;
      const totalVotingPower =
        group.totalVotingPower ?? participation?.totalVotingPower?.[key] ?? null;
      return {
        key,
        label: groupLabel(key),
        activeVoters,
        activePower,
        totalAllowedVoterCount,
        totalVotingPower,
        rows: sorted,
        scale: group.scale ?? null,
        ranked: group.ranked ?? null,
        likert: group.likert ?? null,
        weighted: group.weighted ?? null,
      };
    });
  });

  // Once the authority has certified, the tally won't change again unless a
  // new cert version is published (rare, and a refresh picks it up). Stop
  // polling in that case. A Hydra-final but uncertified tally CAN still be
  // replaced by certification, so keep polling through that state.
  onMount(() => {
    if (certification?.certified) return;
    if (ballot.status === 'closed' && result?.source === 'certified') return;
    return startResultsPoller(async () => {
      const next = await fetchProposalResult(fetch, proposal._id);
      if (next) result = next;
    });
  });
</script>

<h1 class="mb-1 text-xl">{proposal.title}</h1>
<div class="mb-3 mt-1 flex flex-wrap items-center gap-2">
  <BallotBadge status={ballot.status} />
  <CertificationBadge {certification} ballotStatus={ballot.status} />
</div>

<section class="text-sm text-muted-foreground">
  <ProposalDetails {proposal} {ballot} />
</section>

{#if data.prev || data.next}
  <nav
    class="mt-5 flex items-stretch gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-1.5"
    aria-label="Proposal navigation"
  >
    {#if data.prev}
      <a
        href="{basePath}/{data.prev._id}/results"
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
        href="{basePath}/{data.next._id}/results"
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

<section>
  <Button
    href={`/ballots/${ballot._id}/proposals/${proposal._id}`}
    variant="outline"
    size="sm"
    class="mt-4"
  >
    View Full Proposal
  </Button>
</section>

<section id="results" class="mt-8">
  <ResultsStatus {result} {certification} {ballot} />

  {#if !result}
    <p class="text-sm text-muted-foreground">
      No results available yet. They'll appear here once the first tally runs.
    </p>
  {:else}
    {#if finalButEmpty}
      <div
        class="mb-6 flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
      >
        <div class="mt-0.5 shrink-0">
          <TriangleAlert class="h-5 w-5" />
        </div>
        <div class="flex-1">
          <div class="font-semibold uppercase tracking-wide">Tally data unavailable</div>
          <p class="mt-1">
            This ballot was finalized on-chain, but the per-group tally wasn't published. The
            evidence hash and finalize transaction are recorded, so the vote itself is intact — the
            results breakdown just didn't make it through. Please contact support if this persists.
          </p>
          {#if result.hydraFinalizeTxHash}
            <p class="mt-1 font-mono text-xs opacity-75">
              Finalize tx: {result.hydraFinalizeTxHash}
            </p>
          {/if}
        </div>
      </div>
    {/if}
    {#if result.abstainedByRole}
      <div class="mb-6">
        <AbstainedByRolePanel abstainedByRole={result.abstainedByRole} />
      </div>
    {/if}
    {#if groups.length > 0}
      <div class="mb-8 space-y-4">
        <h3 class="text-lg">Results by voter group</h3>
        {#each groups as group}
          <GroupResultCard {group} {ballot} {proposal} {result} />
        {/each}
      </div>
    {/if}
  {/if}

  <CertificationHistoryDisclosure history={certification?.history ?? []} />
</section>

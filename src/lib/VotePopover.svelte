<script>
  import * as Popover from '$lib/components/ui/popover/index.js';
  import DonutChart from '$lib/charts/DonutChart.svelte';
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
  import { lovelaceToAda } from '$lib/utils.js';
  let { proposal, ballot, outline = false } = $props();
  let totalVotes = $derived(proposal.voteCount);
  let hasWeight = $derived(ballot.voteWeighted);
  const totalAllowedVoterCount = $derived(ballot.totalAllowedVoterCount);

  const activeVoterPerc = $derived(
    totalAllowedVoterCount
      ? ((proposal.voteCount / totalAllowedVoterCount) * 100).toFixed(2)
      : '0.00'
  );

  const activeVotingPowerPerc = $derived(
    ballot.totalVotingPower
      ? ((proposal.votingPower / ballot.totalVotingPower) * 100).toFixed(2)
      : '0.00'
  );
</script>

<Popover.Root>
  <Popover.Trigger
    class={outline
      ? buttonVariants({ size: 'sm', variant: 'outline' })
      : buttonVariants({ size: 'sm', variant: 'secondary' })}
    disabled={!totalVotes}
  >
    {totalVotes}
    {totalVotes > 1 || 0 || !totalVotes ? 'Votes' : 'Vote'}
  </Popover.Trigger>
  <Popover.Content>
    <h1 class="text-sm font-semibold">Participation</h1>
    <div class="max-h-100 space-y-2 text-xs">
      <div class="mb-4 grid w-full grid-cols-2 gap-4">
        <DonutChart
          segments={[
            {
              label: 'Active',
              value: Number(activeVoterPerc),
              color: '#f97316',
              count: totalVotes,
            },
            {
              label: 'Inactive',
              value: 100 - Number(activeVoterPerc),
              color: '#e5e7eb',
              count: totalAllowedVoterCount - totalVotes,
            },
          ]}
          title="By Voter Count"
          valueUnit="Voters"
        />
        <DonutChart
          segments={[
            {
              label: 'Active',
              value: Number(activeVotingPowerPerc),
              color: '#f97316',
              absoluteLabel: lovelaceToAda(proposal.votingPower),
            },
            {
              label: 'Inactive',
              value: 100 - Number(activeVotingPowerPerc),
              color: '#e5e7eb',
              absoluteLabel: lovelaceToAda(ballot.totalVotingPower - proposal.votingPower),
            },
          ]}
          title="By Voting Power"
        />
      </div>

      <div class="flex justify-between">
        <span class="font-semibold">Active Voters:</span>
        <span>{totalVotes}/{totalAllowedVoterCount} ({activeVoterPerc}%) </span>
      </div>

      {#if hasWeight}
        <div class="flex justify-between">
          <span class="font-semibold">Total Voting Power:</span>
          <span>{lovelaceToAda(ballot.totalVotingPower)}</span>
        </div>

        <div class="flex justify-between">
          <span class="font-semibold">Active Voting Power:</span>
          <span class="text-nowrap">
            {lovelaceToAda(proposal.votingPower)}
            ({activeVotingPowerPerc}%)
          </span>
        </div>
      {/if}

      <div class="pt-2">
        <Button
          href={'/ballots/' + ballot._id + '/proposals/' + proposal._id + '/results'}
          variant="primary"
          size="sm"
          class="m-auto w-full bg-orange-600 text-white"
        >
          View {ballot.status == 'live' ? 'Preliminary' : 'Final'} Results
        </Button>
      </div>
    </div>
    <!-- {#if proposal.updatedAt}
			<div class="mt-2 text-nowrap pl-1 text-xs text-muted-foreground">
				Updated {convertTimestamp(proposal.updatedAt)}
			</div>
		{/if} -->
  </Popover.Content>
</Popover.Root>

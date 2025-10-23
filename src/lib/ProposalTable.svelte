<script>
	import { loggedIn } from './../stores/sessionManager.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Comments from '$lib/Comments.svelte';
	import VoteDetails from './VoteDetails.svelte';
	import ProposalVote from './ProposalVote.svelte';
	import ProposalDetails from './ProposalDetails.svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import VotePopover from './VotePopover.svelte';
	let { proposalList, ballot } = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row class="hover:bg-white">
			<Table.Head class="pl-0">Name</Table.Head>
			<Table.Head class="pr-0 text-right">
				{#if proposalList[0].data?.data}
					<span class="text-sm font-medium text-slate-500 dark:text-slate-400"> Cost </span>
				{:else}{/if}
			</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body class="border-b">
		{#each proposalList as proposal, index}
			<Table.Row class="border-none hover:bg-white">
				<Table.Cell class="pl-0 align-top">
					<a
						href={'/ballots/' + proposal.ballotId + '/proposals/' + proposal._id}
						class="mt-1.5 block"
					>
						<span class="font-medium">{proposal.title}</span>
					</a>
					<div class="text-muted-foreground">
						<ProposalDetails {proposal} {ballot} {index} />
					</div>
				</Table.Cell>
			</Table.Row>
			<Table.Row class="border-b hover:bg-white">
				<Table.Cell colspan="2" class="pl-0 pr-0">
					<div class="mb-3 mt-4 flex w-full items-start justify-between gap-1">
						<div class="flex gap-1">
							<Button
								href={`/ballots/${ballot._id}/proposals/${proposal._id}`}
								size="sm"
								variant="secondary"
							>
								View Proposal
							</Button>
							<Comments {proposal} {ballot} />
							<VotePopover {proposal} {ballot} />
						</div>

						{#if $loggedIn}
							<div class="flex justify-end">
								<ProposalVote {proposal} {ballot} inline />
							</div>
						{/if}
					</div>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

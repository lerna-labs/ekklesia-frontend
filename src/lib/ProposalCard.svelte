<script>
	import Text from './base/Text.svelte';
	import { loggedIn } from './../stores/sessionManager.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ProposalVote from '$lib/ProposalVote.svelte';
	import VotePopover from './VotePopover.svelte';
	import Comments from '$lib/Comments.svelte';
	import ProposalDetails from './ProposalDetails.svelte';
	import ProposalCost from './ProposalCost.svelte';
	let { proposal, ballot } = $props();
	let intersecting = $state(false);
</script>

<Card.Root class="relative mb-4 overflow-hidden">
	<Card.Header>
		<Card.Title>
			<div class="flex items-start">
				<div class="flex-1 text-xl">
					<a href={'/ballots/' + ballot._id + '/proposals/' + proposal._id}>{proposal.name}</a>
				</div>
				<div class="mt-1">
					<ProposalCost {proposal} class="text-sm" />
				</div>
			</div>
		</Card.Title>
		<Card.Description>
			<ProposalDetails {proposal} {ballot} />
		</Card.Description>
	</Card.Header>
	<Card.Content class="pb-4">
		<div class="mb-4">
			<Text text={proposal.data.description} />
		</div>
		{#if $loggedIn && intersecting}
			<Vote {proposal} {ballot} />
		{/if}
	</Card.Content>
	<Card.Footer class="block">
		<div class="flex items-center justify-between">
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
				<ProposalVote {proposal} {ballot} inline />
			{/if}
		</div>
		{#if proposal.data?.data}
			<div class="mt-3 w-full">
				<a
					href={'https://gov.tools/budget_discussion/' + proposal.data.id}
					target="_blank"
					rel="noopener noreferrer"
					class="pl-0 text-xs font-medium text-orange-500 hover:text-orange-600"
				>
					View on Gov.tools
				</a>
			</div>
		{/if}
	</Card.Footer>
</Card.Root>

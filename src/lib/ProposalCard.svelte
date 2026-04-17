<script>
	import Text from './base/Text.svelte';
	import { loggedIn } from './../stores/sessionManager.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ProposalVote from '$lib/ProposalVote.svelte';
	import VotePopover from './VotePopover.svelte';
	import Comments from '$lib/Comments.svelte';
	import ProposalDetails from './ProposalDetails.svelte';
	import { draftsTree } from '$lib/draftVotes.js';
	import { CircleCheck, Circle } from 'lucide-svelte';
	let { proposal, ballot } = $props();

	// Drafted indicator — visible when the authed user has a locally
	// saved selection for this proposal (doesn't reflect other browsers
	// or pre-submit state on other devices).
	const hasDraft = $derived.by(() => {
		const draft = $draftsTree?.[ballot._id]?.[proposal._id];
		return Array.isArray(draft) && draft.length > 0;
	});
</script>

<Card.Root class="relative mb-4 overflow-hidden">
	<Card.Header>
		<Card.Title>
			<div class="flex items-start gap-2">
				{#if $loggedIn}
					<span
						class="mt-1 shrink-0"
						class:text-emerald-600={hasDraft}
						class:text-slate-300={!hasDraft}
						title={hasDraft ? 'You have a draft vote on this proposal' : 'Not yet voted'}
					>
						{#if hasDraft}
							<CircleCheck class="h-5 w-5" aria-label="Drafted" />
						{:else}
							<Circle class="h-5 w-5" aria-label="Not yet voted" />
						{/if}
					</span>
				{/if}
				<div class="flex-1 text-xl">
					<a href={'/ballots/' + ballot._id + '/proposals/' + proposal._id}>{proposal.title}</a>
				</div>
			</div>
		</Card.Title>
		<Card.Description>
			<ProposalDetails {proposal} {ballot} />
		</Card.Description>
	</Card.Header>
	<Card.Content class="pb-0">
		{#if proposal.summary}
			<div class="mb-4">
				<Text text={proposal.summary} />
			</div>
		{:else if proposal.description}
			<div class="mb-4">
				<Text text={proposal.description} />
			</div>
		{/if}
	</Card.Content>
	<Card.Footer class="block">
		{#if $loggedIn && ballot.status === 'live'}
			<div class="mb-4">
				<ProposalVote {proposal} {ballot} />
			</div>
		{/if}

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
		</div>
	</Card.Footer>
</Card.Root>

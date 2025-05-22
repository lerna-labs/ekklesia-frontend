<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import BallotDetails from './BallotDetails.svelte';
	import Badge from '$lib/BallotBadge.svelte';

	let { ballot } = $props();
	let proposals = $derived(ballot.proposals);
	import { convertTimestamp } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<Card.Root class="mb-4">
	<Card.Header class="pt-5">
		<Card.Title class="flex gap-2 text-xl">
			{ballot.name}
			<div>
				<Badge status={ballot.status} />
			</div>
		</Card.Title>
		<Card.Description>
			<BallotDetails {ballot} />
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#each proposals as proposal}
			<div class="mb-4">
				<div class="flex items-start gap-2">
					<div class="flex-1 font-medium">
						<a
							href={'/ballots/' + ballot._id + '/proposals/' + proposal.proposalId}
							target="_blank"
							class="cursor-pointer">{proposal.name}</a
						>
						<div class="text-xs text-slate-500">
							<span>Proposal ID:</span>{proposal.proposalId}
						</div>
					</div>

					<div
						class="rounded-md p-2 text-xs {proposal.voteOptions.find(
							(el) => el.value == proposal.vote
						)?.label === 'Yes'
							? 'bg-green-500 text-green-100'
							: proposal.voteOptions.find((el) => el.value == proposal.vote)?.label === 'No'
								? 'bg-red-500 text-red-100'
								: 'bg-slate-500 text-slate-100'}"
					>
						{proposal.voteOptions.find((el) => el.value == proposal.vote)?.label}
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

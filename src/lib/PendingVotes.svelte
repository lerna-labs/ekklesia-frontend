<script>
	import BrokerVoteFlow from '$lib/BrokerVoteFlow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import Badge from '$lib/BallotBadge.svelte';
	import { draftsTree } from '$lib/draftVotes.js';

	// Optional list of ballot documents for title resolution; dashboard
	// passes this from its own `/dashboard/ballots` fetch so we can show
	// "The XYZ ballot" instead of a bare ObjectId.
	let { ballots = [] } = $props();

	function ballotFor(id) {
		return ballots.find((b) => String(b._id) === String(id));
	}

	const draftBallots = $derived.by(() => {
		const tree = $draftsTree;
		return Object.entries(tree).map(([ballotId, drafts]) => ({
			ballotId,
			draftCount: Object.keys(drafts ?? {}).length,
			ballot: ballotFor(ballotId)
		}));
	});
</script>

<section class="mt-6" id="pending-votes">
	<h2>Your Unsubmitted Drafts</h2>
	{#if draftBallots.length > 0}
		<p class="mb-4 text-sm text-muted-foreground">
			These drafts live in your browser until you sign and submit them on-chain. They don't
			leave this device — switch browsers or clear your storage and they're gone. Submit a
			ballot's votes through the broker below when you're ready to commit.
		</p>

		{#each draftBallots as entry}
			<Card.Root class="mb-4">
				<Card.Header class="pt-5">
					<Card.Title class="flex gap-2 text-xl">
						{entry.ballot?.title ?? 'Ballot ' + entry.ballotId}
						{#if entry.ballot?.status}
							<Badge status={entry.ballot.status} />
						{/if}
					</Card.Title>
					<Card.Description>
						{entry.draftCount} draft{entry.draftCount === 1 ? '' : 's'} saved locally.
					</Card.Description>
				</Card.Header>
				<Card.Footer class="flex gap-1">
					{#if entry.ballot?.source === 'hydra'}
						<BrokerVoteFlow ballot={entry.ballot} buttonText="Submit Votes" />
					{/if}
					<Button href={'/ballots/' + entry.ballotId + '/proposals'} size="sm" variant="outline">
						Review Ballot
					</Button>
				</Card.Footer>
			</Card.Root>
		{/each}
	{:else}
		<p class="text-muted-foreground">No unsubmitted drafts.</p>
	{/if}
</section>

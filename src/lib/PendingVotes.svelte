<script>
	import { voter } from '$stores/sessionManager.js';
	import Checkout from '$lib/WalletSigner/WalletSigner.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import Badge from '$lib/BallotBadge.svelte';
	import { convertTimestamp } from '$lib/utils.js';
	import BallotDetails from './BallotDetails.svelte';

	let { pendingVotes, pendingTransactions } = $props();
</script>

<section class="mt-6" id="pending-votes">
	<h2>Pending Votes</h2>
	{#if pendingVotes.length > 0}
		<p class="mb-4">
			You have pending votes that still need to be signed & submitted. Please review and submit them
			by using your Cardano Wallet or the CardanoSigner.
		</p>

		{#each pendingVotes as ballot}
			<Card.Root class="mb-4">
				<Card.Header class="pt-5">
					<Card.Title class="flex gap-2 text-xl">
						{ballot.title}
						<Badge status={ballot.status} />
					</Card.Title>
					<Card.Description>
						<BallotDetails {ballot} class="text-sm text-muted-foreground" />
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div
						class="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground"
					>
						<div>Proposal</div>
						<div>Your vote</div>
					</div>
					{#each ballot.proposals as proposal}
						<div class="mb-2 flex items-start justify-between gap-3">
							<div class="font-medium">
								<a href={'/ballots/' + ballot._id + '/proposals/' + proposal._id} target="_blank">
									{proposal.title}
									<div class="mt-1 text-xs text-muted-foreground">
										<span>Proposal ID:</span>
										{proposal._id}
									</div>
								</a>
							</div>
							<div
								class="text-nowrap rounded-md p-2 text-xs {proposal.vote.label === 'Yes'
									? 'bg-green-500 text-green-100'
									: proposal.vote.label === 'No'
										? 'bg-red-500 text-red-100'
										: 'bg-slate-500 text-slate-100'}"
							>
								{proposal.vote.label}
							</div>
						</div>
					{/each}
				</Card.Content>
				<Card.Footer class="block">
					<div class=" flex gap-1">
						{#if pendingTransactions.map((tx) => tx.ballotId).includes(ballot._id)}
							<Checkout {ballot} mode="checkout" buttonText="Re-Submit Votes" />
						{:else}
							<Checkout {ballot} mode="checkout" />
						{/if}
						<Button href={'/ballots/' + ballot._id + '/proposals'} size="sm">View Ballot</Button>
					</div>
					{#if pendingTransactions.map((tx) => tx.ballotId).includes(ballot._id)}
						<div class="mt-4 block w-full text-sm text-red-500">
							You have a pending multisig transaction for this ballot. If you re-submit the votes on
							this ballot - changed or unchanged - the pending transaction will be released and all
							required signers have to sign again.
						</div>
					{/if}
					<div></div>
				</Card.Footer>
			</Card.Root>
		{/each}
	{:else}
		<p class="text-muted-foreground">No pending votes.</p>
	{/if}
</section>

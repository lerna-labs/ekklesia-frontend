<script>
	import { logout, user } from '$stores/sessionManager.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import Checkout from '$lib/WalletSigner/WalletSigner.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { shortenString } from '$lib/utils.js';
	import BallotCard from '$lib/BallotCard.svelte';
	import PendingVotes from '$lib/PendingVotes.svelte';
	import TransactionDetails from '$lib/TransactionDetails.svelte';
	import TransactionVotes from '$lib/TransactionVotes.svelte';
	import { convertTimestamp } from '$lib/utils.js';
	import { invalidate, invalidateAll } from '$app/navigation';
	let { data } = $props();

	let submittedTransactions = $derived(data.transactions.filter((el) => el.status == 'submitted'));
	let pendingTransactions = $derived(data.transactions.filter((el) => el.status == 'pending'));

	$effect(() => {
		if ($user?.lastTransaction) {
			invalidateAll();
		}
	});
</script>

<h1>Dashboard</h1>

<Card.Root>
	<Card.Header class="p-5">
		<Card.Title>Voter-ID: {shortenString($user?.voterId, 30, true)}</Card.Title>
		<Card.Description>
			<div class="mt-2 text-xs">
				<span class="font-semibold">Last Login:</span>
				{convertTimestamp($user?.lastLogin)}
			</div>
		</Card.Description>
	</Card.Header>
	<Card.Footer class="p-5 pt-0">
		<Button onclick={logout} variant="outline" size="sm">Logout</Button>
	</Card.Footer>
</Card.Root>

<section class="mt-6" id="active-ballots">
	<h2>Your Active Ballots</h2>

	{#if data.ballots.filter((b) => b.status == 'live').length > 0}
		{#each data.ballots.filter((b) => b.status == 'live') as ballot}
			<BallotCard {ballot} />
		{/each}
	{:else}
		<p class="text-muted-foreground">
			No active ballots found. If you expect an ongoing vote to show up here, make sure you're using
			the correct wallet and are a registered voter on that ballot.
		</p>
	{/if}
</section>

<PendingVotes ballots={data.ballots} />

{#if pendingTransactions.length > 0}
	<section class="mt-6" id="transaction-history">
		<h2>Your Pending MultiSig Transactions</h2>
		{#each pendingTransactions as transaction, i}
			<div id="transaction-{transaction._id}">
				<Card.Root class="mb-4">
					<Card.Header class="p-5">
						<Card.Title class="mb-2">Ballot {transaction.ballotId} partially signed</Card.Title>
						<Card.Description>
							<div class="mb-2 text-xs">
								<span class="font-semibold">Transaction ID:</span>
								{transaction._id}
							</div>

							<div class="text-xs">
								<span class="font-semibold">Submitted:</span>
								{convertTimestamp(transaction.updatedAt)}
							</div>

							<div id="votes" class="mt-4 text-black">
								{#each transaction.votes as vote}
									<TransactionVotes {vote} />
								{/each}
							</div>
						</Card.Description>
					</Card.Header>
					<Card.Footer class="gap-1 p-5 pt-0">
						<Checkout
							ballot={{ _id: transaction.ballotId }}
							mode="checkout"
							tx={transaction._id}
							outline={true}
							buttonText="Sign Transaction"
						/>

						<TransactionDetails {transaction} id={transaction._id} />
					</Card.Footer>
				</Card.Root>
			</div>
		{/each}
	</section>
{/if}

{#if submittedTransactions.length > 0}
	<section class="mt-6" id="transaction-history">
		<h2>Your Transaction History</h2>
		{#each submittedTransactions as transaction}
			<div>
				<Card.Root class="mb-4">
					<Card.Header class="p-5">
						<Card.Title class="mb-2">Ballot {transaction.ballotId} submitted</Card.Title>
						<Card.Description>
							<div class="mb-2 text-xs">
								<span class="font-semibold">Transaction ID:</span>
								{transaction._id}
							</div>

							<div class="text-xs">
								<span class="font-semibold">Submitted:</span>
								{convertTimestamp(transaction.updatedAt)}
							</div>
						</Card.Description>
					</Card.Header>
					<Card.Footer class="p-5 pt-0">
						<TransactionDetails {transaction} />
					</Card.Footer>
				</Card.Root>
			</div>
		{/each}
	</section>
{/if}

<div class="mt-12"></div>

<script>
	import BallotCard from '$lib/BallotCard.svelte';
	import FAQs from '$lib/FAQs.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Page from './ballots/+page.svelte';
	let { data } = $props();
</script>

<section class="mb-8">
	<h1>Welcome to Intersect Polling on Ekklesia</h1>
	<p class="mb-4">
		Your place for all Intersect related polling. All Polls on this platform are powered by
		Ekklesia, but run by <a href="https://intersectmbo.org" target="_blank" class="link"
			>Intersect</a
		>.
	</p>

	<p class="mb-4">
		You can look up any DRep voting on this tool in the <a href="/voter-directory" class="link"
			>Voter Directory</a
		>. The Voter Directory is public, updated every 10 minutes and votes may change until a ballot
		is closed. Final results may differ slightly from preliminary votes as the voting power per DRep
		may change during the duration of the vote. Final results will be published on-chain and can be
		verified.
	</p>
	<Button href="/voter-directory" size="sm">Go to Voter Directory</Button>
</section>

{#if data.upcomingBallots.data.length > 0}
	<section class="mb-8">
		<h2>Upcoming Ballots</h2>
		<p class="mb-6">
			The following Ballots are coming up for voting. Any registered DRep is welcome to vote with a
			CIP95 Wallet or the <a
				href="https://github.com/gitmachtl/cardano-signer"
				target="_blank"
				class="link">CardanoSigner</a
			>.
		</p>
		{#each data.upcomingBallots.data as ballot}
			<BallotCard {ballot} />
		{/each}
	</section>
{/if}

{#if data.liveBallots.data.length > 0}
	<section class="mb-10">
		<h2>Live Ballots</h2>
		<p class="mb-6">
			The following Ballots are open for voting. Every registered DRep can login with their CIP95
			Wallet or the <a
				href="https://github.com/gitmachtl/cardano-signer"
				target="_blank"
				class="link">CardanoSigner</a
			> and start voting. Live Voting Power is taken into account.
		</p>
		{#each data.liveBallots.data as ballot}
			<BallotCard {ballot} />
		{/each}
	</section>
{/if}

<FAQs />

{#if data.closedBallots.data.length > 0}
	<section>
		<h2>Closed Ballots</h2>
		<p class="mb-6">
			The following Ballots are closed and you can check the final results, once published.
		</p>
		{#each data.closedBallots.data as ballot}
			<BallotCard {ballot} />
		{/each}
	</section>
{/if}

<div class="mt-12"></div>

<script>
	import BallotCard from '$lib/BallotCard.svelte';
	import FAQs from '$lib/FAQs.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Page from './ballots/+page.svelte';
	let { data } = $props();
</script>

<section class="mb-6">
	<h1>Welcome to Intersect Polling on Ekklesia</h1>
	<p>Your place for all Intersect related polling.</p>
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
	<section class="mb-8">
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

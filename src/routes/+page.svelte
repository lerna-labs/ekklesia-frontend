<script>
	import BallotCard from '$lib/BallotCard.svelte';
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

<section class="mb-8">
	<h3>FAQs & Help</h3>
	<p>
		If you encounter any issues, read through the <a
			href="https://docs.google.com/document/d/1724kIir2tGO_ntGW_NWu4T3-uNh-byU0ONwxDesXex4"
			target="_blank"
			class="link">Intersect Tutorial</a
		>
		or reach out on
		<a
			href=" https://discord.com/channels/1136727663583698984/1243451569492725760"
			target="_blank"
			class="link">Discord</a
		>
		or <a href="https://t.me/IntersectCBC" target="_blank" class="link">Telegram</a>.
	</p>
</section>

<section class="mb-8">
	<h3>How did my DRep vote?</h3>
	<p>
		You can check how your DRep voted in the <a href="/voters" class="link">Voter Directory</a> by entering
		your DRep's ID or browse other DReps voting history. The Voter Directory is a public and votes may
		change until the ballot is closed.
	</p>
</section>

<section class="mb-8">
	<h3>Supported Wallets</h3>
	<p>As of today, the following CIP95 compatible wallet are supported on Ekklesia:</p>

	<div class="mt-3">
		<div>
			<strong class=" font-semibold">Browser Extensions: </strong>
			<a href="https://eternl.io/" target="_blank" class="link">Eternl</a>,
			<a href="https://yoroi-wallet.com/" target="_blank" class="link">Yoroi</a>,
			<a href="https://www.lace.io/" target="_blank" class="link">Lace</a>,
			<a href="https://vespr.xyz/" target="_blank" class="link">Vespr</a>
		</div>

		<div>
			<strong class=" font-semibold">Hardware Wallets: </strong>
			<a href="https://www.ledger.com/" target="_blank" class="link">Ledger</a> (tested with
			Eternl), <a href="https://keyst.one/" target="_blank" class="link">Keystone</a> (also tested with
			Eternl)
		</div>

		<div>
			<strong class=" font-semibold">Mobile Wallets*: </strong>
			<a href="https://eternl.io/" target="_blank" class="link">Eternl</a>,
			<a href="https://yoroi-wallet.com/" target="_blank" class="link">Yoroi</a>,
			<a href="https://vespr.xyz/" target="_blank" class="link">Vespr</a> (all three not tested, but
			may work)
		</div>
	</div>
</section>

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

<script>
	import BallotCard from '$lib/BallotCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Page from './ballots/+page.svelte';
	let { data } = $props();
</script>

<section class="mb-6">
	<h1>2025 Cardano Budget Reconciliation</h1>
	<p>
		Welcome to the budget reconciliation polling tool! This will be used to build DRep consensus
		around which proposals should be added to Intersect’s Budget Info Action. DReps are invited to
		provide their opinion about each proposal to receive treasury funding. Additional questions may
		be added to the tool as the result of DRep discussions during the reconciliation workshops. All
		DReps, whether attending the reconciliation workshops, are encouraged to review the <a
			href="https://www.youtube.com/playlist?list=PL0vPOqkVcEDeOXivs9bAd45gayqSTsiVE"
			target="_blank"
			class="link">workshop recordings</a
		> and answer all questions. Polls close at the time indicated within the tool.
	</p>
</section>

<section class="bg-muted mb-8 rounded-md p-4 text-sm">
	<h3>Update and clarity on Ekklesia</h3>

	<p class="mb-2">
		In March 2025, members of Intersect’s leadership, Product Committee, and long-term contributors
		visited Japan to connect with the community and present the 2025 product roadmap.
	</p>

	<p class="mb-2">
		During the trip, Intersect evaluated solutions from several potential suppliers for on-chain
		polling and voting tools to support DReps during the budget process and reconciliation.
		Initially, we chose to proceed with GovTool, particularly due to its focus on open APIs that
		would enable diverse community tooling options.
	</p>

	<p class="mb-2">
		However, to mitigate the risk of GovTool not being feature-complete or ready to support the
		reconciliation phase, @InputOutputHK contracted with @adamKDean and @MadOrkestra to develop a
		backup solution - now known as Ekklesia.
	</p>

	<p class="mb-2">
		Following a demonstration of Ekklesia’s capabilities, the Intersect Budget Committee selected it
		for use in the latter stages of budget reconciliation. This decision was based on its superior
		proposal-level polling features and improved user experience compared to GovTool, which had
		prioritized API functionality.
	</p>

	<p class="mb-2">
		If you’re a DRep, head over to Ekklesia now and cast your votes on what your funding priorities
		are for 2025 ➡️ https://2025budget.intersectmbo.org
	</p>

	<p class="mb-2">
		We want to thank IOG, Adam Dean, and Mad Orkestra for their efforts and ability to deliver such
		a capable tool in a short timeframe 🙇‍♂️
	</p>
	<p class="mb-0 mt-4">
		<b class="font-medium">Source:</b>
		<a href="https://x.com/IntersectMBO/status/1917710999752249657" target="_blank"
			>https://x.com/IntersectMBO/status/1917710999752249657</a
		>
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

		<p class="text-muted-foreground mt-2 text-xs">
			* The mobile view hasn't been properly tested at all due to time constraints, but most views
			seem to work just fine. If you find major errors, please post it in the support channels above
			and we'll fix it shortly.
		</p>
	</div>
</section>

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

<!-- <div>
	<Button href="/ballots" size="sm" variant="secondary">View all Ballots</Button>
</div> -->

<div class="mt-12"></div>

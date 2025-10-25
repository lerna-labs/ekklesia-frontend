<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
</script>

<section class="mb-8">
	<h3>FAQs & Help</h3>

	<Accordion.Root type="multiple">
		<Accordion.Item value="item-1">
			<Accordion.Trigger class="text-left">How do I vote?</Accordion.Trigger>
			<Accordion.Content>
				<p class="mb-4">
					To vote, you need to connect your CIP95 compatible wallet. If you have a Ledger or
					Keystone hardware wallet, please make sure to use it with a compatible browser extension
					like Eternl, Yoroi or Lace.
				</p>
				<p class="mb-4">
					Once connected, you can browse live ballots you are eligable to vote on and save your
					vote.<br />
					<u
						>All votes need to be signed and submitted. If you see a red alert at the top of the
						page saying "Pending Votes" you still need to sign and submit your votes to be included
						in the results.</u
					>
				</p>

				<p class="mb-4">
					You can change your vote as often as you want to as long as a ballot is live.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-2">
			<Accordion.Trigger class="text-left">I am logged in but still can't vote</Accordion.Trigger>
			<Accordion.Content>
				<p class="mb-4">
					Make sure you are logged in with the wallet that is eligable to vote. Eligable voter
					groups might vary from ballot to ballot.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-3">
			<Accordion.Trigger class="text-left">How did my DRep vote?</Accordion.Trigger>
			<Accordion.Content>
				You can check how your DRep voted in the <a href="/voters" class="link">Voter Directory</a> by
				entering your DRep's ID or browse other DReps voting history. The Voter Directory is public and
				votes may change until a ballot is closed.
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-4">
			<Accordion.Trigger class="text-left"
				>I voted but my vote doesn't seem to be included in the results</Accordion.Trigger
			>
			<Accordion.Content>
				<p class="mb-4">
					For performance reasons results (if there are new votes) are rolled up every 10 minutes.
					If you just submitted and signed your votes, it might take a few minutes until your vote
					is included in the results.
				</p>
				<p>
					Always make sure you have signed and submitted your votes and no votes are still marked as
					pending on your dashboard.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-5">
			<Accordion.Trigger class="text-left"
				>Final results deviate slightly from the last preliminary results, why?</Accordion.Trigger
			>
			<Accordion.Content>
				<p class="mb-4">
					On final rollup we re-validate voting power and check for invalid votes (different wallets
					voting with the same asset twice for example) which might lead to slight deviations from
					the last published preliminary results.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-6">
			<Accordion.Trigger class="text-left"
				>How do I verify my vote has been included correctly in the final results?</Accordion.Trigger
			>
			<Accordion.Content>
				<p>We will provide a verification tool shortly.</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-7">
			<Accordion.Trigger class="text-left"
				>Where do I go if I have problems or questions</Accordion.Trigger
			>
			<Accordion.Content>
				All polls on this page are run by <a
					href="https://intersectmbo.org"
					target="_blank"
					class="link">Intersect</a
				>. Please refer to their official comms channels on
				<a href="https://x.com/IntersectMBO" target="_blank" class="link">X</a>,
				<a href="https://t.me/IntersectCBC" target="_blank" class="link">Telegram</a>
				or
				<a
					href="https://discord.com/channels/1136727663583698984/1243451569492725760"
					target="_blank"
					class="link">Discord</a
				> for any questions or issues you might have with a vote.
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-8">
			<Accordion.Trigger class="text-left">Which wallets are supported?</Accordion.Trigger>
			<Accordion.Content>
				<p>
					As of today, the following CIP95 compatible wallets are supported for voting on Ekklesia:
				</p>

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
						<a href="https://www.ledger.com/" target="_blank" class="link">Ledger</a>,
						<a href="https://keyst.one/" target="_blank" class="link">Keystone</a>
					</div>

					<div>
						<strong class=" font-semibold">Mobile Wallets: </strong>
						<a href="https://eternl.io/" target="_blank" class="link">Eternl</a>,
						<a href="https://yoroi-wallet.com/" target="_blank" class="link">Yoroi</a>,
						<a href="https://vespr.xyz/" target="_blank" class="link">Vespr</a>
					</div>

					<div class="mt-3">
						You can also vote using the <a
							href="https://github.com/gitmachtl/cardano-signer"
							target="_blank"
							class="link">CardanoSigner</a
						> - most MultiSigs are supported.
					</div>
				</div>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-9">
			<Accordion.Trigger class="text-left"
				>Which data provider is used by Ekklesia?</Accordion.Trigger
			>
			<Accordion.Content>
				<p>
					Ekklesia is currently using community run <a
						href="https://koios.rest/"
						target="_blank"
						class="link">Koios</a
					> as its main data provider for live voting power, asset holdings and other on chain data.
					During the still ongoing development we run occasional checks against DB-Sync data to ensure
					accuracy.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="item-10">
			<Accordion.Trigger class="text-left">What is Ekklesia?</Accordion.Trigger>
			<Accordion.Content>
				<p class="mb-4">
					Ekklesia is a voting tool for verifiable and transparent on-chain voting on Cardano
					developed by <a href="https://x.com/adamkdean" target="_blank" class="link">Adam Dean</a>
					&
					<a href="https://bsky.app/profile/madorkestra.com" target="_blank" class="link"
						>Mad Orkestra</a
					>, initially funded by
					<a href="https://x.com/InputOutputHK" target="_blank" class="link">IOG</a> and just
					received further funding from
					<a href="https://projectcatalyst.io/" target="_blank" class="link"
						>Project Catalyst Fund14</a
					>.
				</p>

				<p class="mb-4">
					Ekklesia is able to accommodate votes for all kind of voter groups from DReps, SPOs, token
					or NFT holders or simply just everyone with a Cardano wallet. It supports MultiSigs as
					well as CLI based authentication using the CardanoSigner.
				</p>

				<p>
					As of today Ekklesia is still under development. You will be able to track all further
					development on our <a
						href="https://projectcatalyst.io/funds/14/cardano-use-cases-concepts/ekklesia-high-frequency-voting-on-cardano-with-hydra"
						target="_blank"
						class="link">Project Catalyst Profile</a
					>.
				</p>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
</section>

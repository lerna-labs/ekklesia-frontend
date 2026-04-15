<script>
	import { convertTimestamp, normalizeBallot, shortenString } from '$lib/utils.js';
	import { api } from '$stores/sessionManager.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$lib/components/ui/button';
	import DownloadJson from '$lib/DownloadJson.svelte';
	let { transaction } = $props();
	const transactionData = $derived.by(() => transaction);
	let ballotData = $state(undefined);

	async function fetchBallotData() {
		console.log('Fetching ballot data for transaction:', transactionData._id);
		const response = await api.v1.fetch(fetch, '/ballots/' + transactionData.ballotId);
		if (response.ok) {
			const payload = await response.json();
			ballotData = normalizeBallot(payload?.data ?? payload);
		} else {
			console.error('Error fetching ballot data:', response.statusText);
			return null;
		}
	}
</script>

<Dialog.Root
	onOpenChange={(open) => {
		if (open) {
			fetchBallotData();
		}
	}}
>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
		View Details
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="text-left">Transaction Details</Dialog.Title>
			<Dialog.Description class="text-left text-sm">
				<div class="mb-2 mt-2">
					<span class="font-semibold">Ballot ID: </span>
					{transactionData.ballotId}
				</div>

				<div class="mb-2">
					<span class="font-semibold">Transaction ID: </span>
					{transactionData._id}
				</div>

				<div class="mb-2">
					<span class="font-semibold">Submitted: </span>
					{convertTimestamp(transactionData.updatedAt)}
				</div>

				<div class="mb-2">
					<span class="font-semibold">MerkleTree Root: </span>
					{shortenString(transactionData.merkleRoot, 30, true)}
				</div>
			</Dialog.Description>
		</Dialog.Header>

		<DownloadJson
			data={transactionData}
			filename={'ballot-' + transactionData.ballotId + '-' + transactionData._id}
			class={buttonVariants({ variant: 'outline', size: 'sm' })}
		/>
	</Dialog.Content>
</Dialog.Root>

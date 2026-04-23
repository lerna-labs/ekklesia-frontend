<script>
	import { onMount } from 'svelte';
	import { loggedIn } from '$stores/sessionManager.js';
	import { listPackages } from '$lib/broker.js';
	import BrokerVoteFlow from '$lib/BrokerVoteFlow.svelte';

	/**
	 * When a multisig cosigner lands on a ballot, they need a way to find the
	 * in-flight VotePackage that another cosigner has already drafted and
	 * contribute their signature — without having to know the packageId.
	 *
	 * On mount we query /v1/votes/:ballotId/packages (the backend scopes to
	 * the authenticated user and returns only active packages by default).
	 * If we find one that still needs signatures, we mount a BrokerVoteFlow
	 * in cosigner mode with the package pre-seeded so the "sign" dialog can
	 * open straight on the merkleRoot.
	 */
	let { ballot } = $props();

	/** @type {any} */ let activePackage = $state(null);
	let checked = $state(false);

	// Only Hydra ballots go through the broker; legacy ballots never have
	// VotePackages.
	const enabled = $derived(ballot?.source === 'hydra' && $loggedIn);

	onMount(async () => {
		if (!enabled) {
			checked = true;
			return;
		}
		try {
			const packages = await listPackages(fetch, ballot._id);
			// Prefer `awaiting-signatures` (the cosigner signing step) over
			// `awaiting-submission` (which is a retry flow). Packages are
			// already sorted newest-first server-side.
			activePackage =
				packages.find((p) => p.status === 'awaiting-signatures') ??
				packages.find((p) => p.status === 'awaiting-submission') ??
				null;
		} catch (err) {
			console.warn('Cosigner-package lookup failed:', err?.body?.message || err?.message);
		}
		checked = true;
	});
</script>

{#if checked && activePackage && activePackage.status === 'awaiting-signatures'}
	<div class="mb-4 mt-4 rounded-md border border-indigo-300 bg-indigo-50 p-3 text-sm text-indigo-900">
		<div class="mb-1 font-semibold">This ballot has a vote package awaiting your signature</div>
		{#if activePackage.multisig}
			<p class="mb-2 text-xs">
				Another cosigner has already drafted and signed this ballot's vote package.
				{activePackage.multisig.outstandingKeys?.length ?? 0} signer{(activePackage.multisig.outstandingKeys?.length ?? 0) === 1 ? '' : 's'}
				still need to add their signature — add yours below.
			</p>
		{:else}
			<p class="mb-2 text-xs">
				You have a draft package on this ballot that still needs to be signed and submitted.
			</p>
		{/if}
		<BrokerVoteFlow
			{ballot}
			existingPackage={activePackage}
			buttonText="Add my signature"
			triggerVariant="outline"
		/>
	</div>
{/if}

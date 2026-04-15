<script>
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button';
	import { CircleCheck, Copy } from 'lucide-svelte';
	import { convertTimestamp, shortenString } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';

	/**
	 * Must-click-to-dismiss confirmation modal shown after a vote is accepted
	 * by the Hydra head. Surfaces the artifacts a voter needs to save for
	 * later audit: the Hydra L2 tx ID (off-chain — NOT linkable to
	 * Cardanoscan), the IPFS CID of the evidence (linkable to a gateway),
	 * and the confirmedAt timestamp.
	 */
	let {
		open = $bindable(false),
		hydraTxId = undefined,
		ipfsCid = undefined,
		confirmedAt = undefined
	} = $props();

	const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

	async function copy(text, label) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(label + ' copied');
		} catch {
			toast.error('Could not copy to clipboard');
		}
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content
		class="max-w-[480px] p-5"
		interactOutsideBehavior="ignore"
		escapeKeydownBehavior="ignore"
	>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2 text-emerald-700">
				<CircleCheck class="h-6 w-6" />
				Vote confirmed on Hydra
			</AlertDialog.Title>
			<AlertDialog.Description class="text-sm">
				Your vote has been accepted into the Hydra voting head and pinned to IPFS. Please save the
				following artifacts — you'll need them to independently verify that your vote is included
				in the final results.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="mt-4 space-y-4 text-sm">
			{#if hydraTxId}
				<div>
					<div class="mb-1 font-semibold">Hydra Transaction ID</div>
					<div class="mb-1 text-xs text-muted-foreground">
						This ID lives inside the Hydra voting head and is not available on a public Cardano
						explorer. Keep it to prove your vote was captured.
					</div>
					<div class="flex items-center gap-1">
						<code class="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-xs">
							{hydraTxId}
						</code>
						<Button
							variant="outline"
							size="sm"
							onclick={() => copy(hydraTxId, 'Hydra Tx ID')}
							aria-label="Copy Hydra transaction ID"
						>
							<Copy class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}

			{#if ipfsCid}
				<div>
					<div class="mb-1 font-semibold">IPFS Evidence CID</div>
					<div class="mb-1 text-xs text-muted-foreground">
						Points to the signed vote evidence pinned on IPFS.
					</div>
					<div class="flex items-center gap-1">
						<code class="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-xs">
							{ipfsCid}
						</code>
						<Button
							variant="outline"
							size="sm"
							onclick={() => copy(ipfsCid, 'IPFS CID')}
							aria-label="Copy IPFS CID"
						>
							<Copy class="h-4 w-4" />
						</Button>
					</div>
					<a
						href={IPFS_GATEWAY + ipfsCid}
						target="_blank"
						rel="noopener noreferrer"
						class="link mt-1 inline-block text-xs"
					>
						View on IPFS gateway →
					</a>
				</div>
			{/if}

			{#if confirmedAt}
				<div>
					<span class="font-semibold">Confirmed:</span>
					{convertTimestamp(confirmedAt)}
				</div>
			{/if}
		</div>

		<AlertDialog.Footer class="mt-6">
			<AlertDialog.Action onclick={() => (open = false)}>I've saved this</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

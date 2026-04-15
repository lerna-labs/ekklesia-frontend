<script>
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Copy, ExternalLink } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { config } from '$stores/sessionManager.js';
	import { convertTimestamp } from '$lib/utils.js';
	import { fetchBallotResults } from '$lib/results.js';

	/**
	 * Surfaces the Hydra-head provenance metadata on a hydra-sourced ballot:
	 *   - head identifier + status, instance policy ID, ballot CID (IPFS)
	 *   - `prepareTxHash` linked through to the configured Cardano explorer
	 *     (this one IS an L1 tx hash, so cardanoscan/cexplorer works)
	 *   - close-receipt artifacts once the ballot has been finalized:
	 *     `hydraFinalizeTxHash` (L1, explorer-linked),
	 *     `hydraResultsHash` / `hydraEvidenceMerkleRoot` (hex digests — show
	 *     copyable, no link), `hydraEvidenceCid` / `hydraResultsCid` (IPFS).
	 *
	 * Close-receipt fields live on the Result docs (one per proposal) rather
	 * than on the ballot, so we poll /v1/results/ballot/:id once and use the
	 * first `final`-source row we find.
	 */
	let { ballot } = $props();

	/** @type {any} */ let closeReceipt = $state(null);

	const enabled = $derived(ballot?.source === 'hydra' && ballot?.hydra);

	async function copy(text, label) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(label + ' copied');
		} catch {
			toast.error('Could not copy to clipboard');
		}
	}

	onMount(async () => {
		if (!enabled || ballot?.status !== 'closed') return;
		try {
			const rows = await fetchBallotResults(fetch, ballot._id);
			// Every proposal in a finalized ballot carries the same hydra* close
			// artifacts — pick the first row that has them populated.
			closeReceipt =
				rows.find(
					(r) =>
						r?.hydraFinalizeTxHash ||
						r?.hydraResultsHash ||
						r?.hydraEvidenceMerkleRoot ||
						r?.hydraResultsCid
				) ?? null;
		} catch (err) {
			console.warn(
				'Close-receipt lookup failed:',
				err?.body?.message || err?.message || err
			);
		}
	});
</script>

{#if enabled}
	<Card.Root class="mt-4">
		<Card.Header class="pb-3">
			<Card.Title class="text-base">On-chain provenance</Card.Title>
			<Card.Description class="text-xs">
				This ballot is backed by a Hydra voting head. Every vote and the final tally are
				verifiable against the artifacts below.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3 text-xs">
			{#if ballot.hydra.headStatus}
				<div>
					<span class="font-semibold">Hydra head status:</span>
					<span
						class="ml-1 inline-block rounded bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide"
					>
						{ballot.hydra.headStatus}
					</span>
				</div>
			{/if}

			{#if ballot.hydra.headId}
				<div>
					<div class="font-semibold">Head ID</div>
					<div class="flex items-center gap-1">
						<code class="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
							{ballot.hydra.headId}
						</code>
						<Button
							variant="outline"
							size="sm"
							onclick={() => copy(ballot.hydra.headId, 'Head ID')}
							aria-label="Copy Hydra head ID"
						>
							<Copy class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/if}

			{#if ballot.hydra.instancePolicyId}
				<div>
					<div class="font-semibold">Instance policy ID</div>
					<div class="flex items-center gap-1">
						<code class="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
							{ballot.hydra.instancePolicyId}
						</code>
						<Button
							variant="outline"
							size="sm"
							onclick={() => copy(ballot.hydra.instancePolicyId, 'Policy ID')}
							aria-label="Copy instance policy ID"
						>
							<Copy class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/if}

			{#if ballot.hydra.prepareTxHash}
				<div>
					<div class="font-semibold">
						Prepare transaction
						{#if ballot.hydra.prepareTxSubmittedAt}
							<span class="ml-1 font-normal text-muted-foreground">
								(submitted {convertTimestamp(ballot.hydra.prepareTxSubmittedAt)})
							</span>
						{/if}
					</div>
					<a
						href={$config.explorerTxBase + ballot.hydra.prepareTxHash}
						target="_blank"
						rel="noopener noreferrer"
						class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
					>
						{ballot.hydra.prepareTxHash}
						<ExternalLink class="h-3 w-3 shrink-0" />
					</a>
				</div>
			{/if}

			{#if ballot.hydra.ballotCid}
				<div>
					<div class="font-semibold">Ballot definition (IPFS)</div>
					<a
						href={$config.ipfsGatewayBase + ballot.hydra.ballotCid}
						target="_blank"
						rel="noopener noreferrer"
						class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
					>
						{ballot.hydra.ballotCid}
						<ExternalLink class="h-3 w-3 shrink-0" />
					</a>
				</div>
			{/if}

			{#if closeReceipt}
				<div class="mt-2 rounded border border-emerald-300 bg-emerald-50 p-2">
					<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
						Close receipt
					</div>

					{#if closeReceipt.hydraFinalizeTxHash}
						<div class="mb-2">
							<div class="font-semibold">Finalize transaction</div>
							<a
								href={$config.explorerTxBase + closeReceipt.hydraFinalizeTxHash}
								target="_blank"
								rel="noopener noreferrer"
								class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
							>
								{closeReceipt.hydraFinalizeTxHash}
								<ExternalLink class="h-3 w-3 shrink-0" />
							</a>
						</div>
					{/if}

					{#if closeReceipt.hydraResultsHash}
						<div class="mb-2">
							<div class="font-semibold">Results hash</div>
							<div class="flex items-center gap-1">
								<code class="flex-1 break-all rounded bg-white px-2 py-1 font-mono text-[11px]">
									{closeReceipt.hydraResultsHash}
								</code>
								<Button
									variant="outline"
									size="sm"
									onclick={() => copy(closeReceipt.hydraResultsHash, 'Results hash')}
									aria-label="Copy results hash"
								>
									<Copy class="h-3 w-3" />
								</Button>
							</div>
						</div>
					{/if}

					{#if closeReceipt.hydraEvidenceMerkleRoot}
						<div class="mb-2">
							<div class="font-semibold">Evidence Merkle root</div>
							<div class="flex items-center gap-1">
								<code class="flex-1 break-all rounded bg-white px-2 py-1 font-mono text-[11px]">
									{closeReceipt.hydraEvidenceMerkleRoot}
								</code>
								<Button
									variant="outline"
									size="sm"
									onclick={() => copy(closeReceipt.hydraEvidenceMerkleRoot, 'Evidence root')}
									aria-label="Copy evidence Merkle root"
								>
									<Copy class="h-3 w-3" />
								</Button>
							</div>
						</div>
					{/if}

					{#if closeReceipt.hydraResultsCid}
						<div class="mb-2">
							<div class="font-semibold">Results (IPFS)</div>
							<a
								href={$config.ipfsGatewayBase + closeReceipt.hydraResultsCid}
								target="_blank"
								rel="noopener noreferrer"
								class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
							>
								{closeReceipt.hydraResultsCid}
								<ExternalLink class="h-3 w-3 shrink-0" />
							</a>
						</div>
					{/if}

					{#if closeReceipt.hydraEvidenceCid}
						<div>
							<div class="font-semibold">Evidence directory (IPFS)</div>
							<a
								href={$config.ipfsGatewayBase + closeReceipt.hydraEvidenceCid}
								target="_blank"
								rel="noopener noreferrer"
								class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
							>
								{closeReceipt.hydraEvidenceCid}
								<ExternalLink class="h-3 w-3 shrink-0" />
							</a>
						</div>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}

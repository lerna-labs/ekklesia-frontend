<script>
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { config } from '$stores/sessionManager.js';
	import { convertTimestamp } from '$lib/utils.js';
	import { fetchBallotResults } from '$lib/results.js';

	let { ballot } = $props();

	/** @type {any} */ let closeReceipt = $state(null);
	// Collapsed by default — most readers only need to know the ballot is
	// provenance-backed; auditors who want the hashes/links expand.
	let expanded = $state(false);

	const enabled = $derived(ballot?.source === 'hydra' && ballot?.hydra && ballot?.status !== 'upcoming');

	// Resolved values — top-level fields are populated as the head
	// lifecycle progresses; until then fall back to the nested objects
	// that are available from ballot creation.
	const h = $derived(ballot?.hydra ?? {});
	const headInfo = $derived(h.headInfo ?? {});
	const ekklesia = $derived(h.ballot?.ekklesia ?? {});

	const headStatus = $derived(h.headStatus || headInfo.headStatus || null);
	const headId = $derived(h.headId || headInfo.headId || null);
	const merkleRoot = $derived(ekklesia.merkleRoot || null);
	const votingAuthority = $derived(ekklesia.votingAuthority || null);
	const namespace = $derived(ekklesia.namespace || null);
	const ballotCid = $derived(
		h.ballotCid || (ekklesia.ballotIpfsCid && ekklesia.ballotIpfsCid !== 'self' ? ekklesia.ballotIpfsCid : null)
	);

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
		<button
			type="button"
			class="w-full cursor-pointer rounded-t text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
			onclick={() => (expanded = !expanded)}
			aria-expanded={expanded}
			aria-controls="ballot-provenance-detail"
		>
			<Card.Header class="pb-3">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<Card.Title class="text-base">On-chain provenance</Card.Title>
						<Card.Description class="text-xs">
							This ballot is backed by a Hydra voting head. Every vote and the final
							tally are verifiable against on-chain artifacts.
							{#if headStatus}
								<span class="ml-1 inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
									{headStatus}
								</span>
							{/if}
						</Card.Description>
					</div>
					<div class="shrink-0 pt-1 text-muted-foreground" aria-hidden="true">
						{#if expanded}
							<ChevronUp class="h-4 w-4" />
						{:else}
							<ChevronDown class="h-4 w-4" />
						{/if}
					</div>
				</div>
			</Card.Header>
		</button>
		<Card.Content
			id="ballot-provenance-detail"
			class="space-y-3 text-xs {expanded ? '' : 'hidden'}">

			{#if headId}
				<div>
					<div class="font-semibold">Head ID</div>
					<div class="flex items-center gap-1">
						<code class="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
							{headId}
						</code>
						<Button
							variant="outline"
							size="sm"
							onclick={() => copy(headId, 'Head ID')}
							aria-label="Copy Hydra head ID"
						>
							<Copy class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/if}

			{#if h.instancePolicyId}
				<div>
					<div class="font-semibold">Instance policy ID</div>
					<div class="flex items-center gap-1">
						<code class="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
							{h.instancePolicyId}
						</code>
						<Button
							variant="outline"
							size="sm"
							onclick={() => copy(h.instancePolicyId, 'Policy ID')}
							aria-label="Copy instance policy ID"
						>
							<Copy class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/if}

			{#if votingAuthority}
				<div>
					<span class="font-semibold">Voting authority:</span>
					<span class="ml-1 font-mono text-[11px]">{votingAuthority}</span>
				</div>
			{/if}

			{#if namespace}
				<div>
					<span class="font-semibold">Namespace:</span>
					<span class="ml-1 font-mono text-[11px]">{namespace}</span>
				</div>
			{/if}

			{#if merkleRoot}
				<div>
					<div class="font-semibold">Ballot content Merkle root</div>
					<p class="mt-0.5 text-[11px] text-muted-foreground">
						Cryptographic digest of the ballot definition itself — proposals, options,
						voting rules. Anchored on-chain via the prepare transaction so anyone can
						verify the ballot they're voting on matches what's committed on-chain (no
						silent parameter changes mid-vote).
					</p>
					<div class="mt-1 flex items-center gap-1">
						<code class="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
							{merkleRoot}
						</code>
						<Button
							variant="outline"
							size="sm"
							onclick={() => copy(merkleRoot, 'Merkle root')}
							aria-label="Copy Merkle root"
						>
							<Copy class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/if}

			{#if h.prepareTxHash}
				<div>
					<div class="font-semibold">
						Prepare transaction
						{#if h.prepareTxSubmittedAt}
							<span class="ml-1 font-normal text-muted-foreground">
								(submitted {convertTimestamp(h.prepareTxSubmittedAt)})
							</span>
						{/if}
					</div>
					<a
						href={$config.explorerTxBase + h.prepareTxHash}
						target="_blank"
						rel="noopener noreferrer"
						class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
					>
						{h.prepareTxHash}
						<ExternalLink class="h-3 w-3 shrink-0" />
					</a>
				</div>
			{/if}

			{#if ballotCid}
				<div>
					<div class="font-semibold">Ballot definition (IPFS)</div>
					<a
						href={$config.ipfsGatewayBase + ballotCid}
						target="_blank"
						rel="noopener noreferrer"
						class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
					>
						{ballotCid}
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

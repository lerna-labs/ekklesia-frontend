<script>
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Copy, ExternalLink, ShieldCheck } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { loggedIn } from '$stores/sessionManager.js';
	import { config } from '$stores/sessionManager.js';
	import { convertTimestamp } from '$lib/utils.js';
	import { listPackages } from '$lib/broker.js';

	/**
	 * "Audit my vote": for the current signed-in user, look up the confirmed
	 * VotePackages on this ballot and render the provenance artifacts they
	 * need to independently verify that their vote was included in the
	 * final tally.
	 *
	 * The packages list endpoint defaults to active-only; we pass
	 * `includeTerminal=true` here so `hydra-confirmed` rows show up.
	 *
	 * Notes on what IS and ISN'T explorer-linkable:
	 *   - `hydraTxId` lives in the Hydra head ledger, NOT on L1. Show it as
	 *     copyable text only.
	 *   - `ipfsCid` / `hydraProof` are IPFS / hex digests.
	 */
	let { ballot } = $props();

	/** @type {any[]} */ let confirmedPackages = $state([]);
	let checked = $state(false);

	const enabled = $derived(ballot?.source === 'hydra' && $loggedIn);

	async function copy(text, label) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(label + ' copied');
		} catch {
			toast.error('Could not copy to clipboard');
		}
	}

	onMount(async () => {
		if (!enabled) {
			checked = true;
			return;
		}
		try {
			const rows = await listPackages(fetch, ballot._id, { includeTerminal: true, limit: 50 });
			confirmedPackages = rows.filter((p) => p.status === 'hydra-confirmed');
		} catch (err) {
			console.warn('Audit-my-vote lookup failed:', err?.body?.message || err?.message);
		}
		checked = true;
	});
</script>

{#if checked && confirmedPackages.length > 0}
	<Card.Root class="mt-4">
		<Card.Header class="pb-3">
			<Card.Title class="flex items-center gap-2 text-base">
				<ShieldCheck class="h-4 w-4 text-emerald-700" />
				Audit my vote
			</Card.Title>
			<Card.Description class="text-xs">
				Save these artifacts if you want to independently verify that your vote is included in
				the final results. The Hydra Tx ID is an off-chain identifier from the voting head — it
				is not visible on a public Cardano explorer.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4 text-xs">
			{#each confirmedPackages as pkg}
				<div class="rounded border bg-muted/30 p-3">
					<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
						<div class="font-semibold">
							{confirmedPackages.length > 1 ? 'Vote package' : 'Your vote'}
						</div>
						{#if pkg.confirmedAt}
							<div class="text-[11px] text-muted-foreground">
								Confirmed {convertTimestamp(pkg.confirmedAt)}
							</div>
						{/if}
					</div>

					{#if pkg.hydraTxId}
						<div class="mb-2">
							<div class="font-semibold">Hydra Tx ID (off-chain)</div>
							<div class="flex items-center gap-1">
								<code class="flex-1 break-all rounded bg-white px-2 py-1 font-mono text-[11px]">
									{pkg.hydraTxId}
								</code>
								<Button
									variant="outline"
									size="sm"
									onclick={() => copy(pkg.hydraTxId, 'Hydra Tx ID')}
									aria-label="Copy Hydra Tx ID"
								>
									<Copy class="h-3 w-3" />
								</Button>
							</div>
						</div>
					{/if}

					{#if pkg.ipfsCid}
						<div class="mb-2">
							<div class="font-semibold">Evidence (IPFS)</div>
							<a
								href={$config.ipfsGatewayBase + pkg.ipfsCid}
								target="_blank"
								rel="noopener noreferrer"
								class="link inline-flex items-center gap-1 break-all font-mono text-[11px]"
							>
								{pkg.ipfsCid}
								<ExternalLink class="h-3 w-3 shrink-0" />
							</a>
						</div>
					{/if}

					{#if pkg.voteHash}
						<div class="mb-2">
							<div class="font-semibold">Vote hash</div>
							<div class="flex items-center gap-1">
								<code class="flex-1 break-all rounded bg-white px-2 py-1 font-mono text-[11px]">
									{pkg.voteHash}
								</code>
								<Button
									variant="outline"
									size="sm"
									onclick={() => copy(pkg.voteHash, 'Vote hash')}
									aria-label="Copy vote hash"
								>
									<Copy class="h-3 w-3" />
								</Button>
							</div>
						</div>
					{/if}

					{#if pkg.hydraProof}
						<details class="mt-2">
							<summary class="cursor-pointer font-semibold">Merkle proof</summary>
							<pre
								class="mt-2 max-h-48 overflow-auto rounded bg-white p-2 font-mono text-[10px]">{JSON.stringify(
									pkg.hydraProof,
									null,
									2
								)}</pre>
						</details>
					{/if}
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
{/if}

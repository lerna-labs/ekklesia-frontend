<script>
	import { convertTimestamp } from '$lib/utils.js';
	import { CircleCheck, TriangleAlert } from 'lucide-svelte';

	/** @type {{ result: { source?: string, finalizedAt?: string|null, updatedAt?: string } | null }} */
	let { result } = $props();

	const source = $derived(result?.source ?? 'provisional');
	const isFinal = $derived(source === 'final');
</script>

{#if result}
	<div
		class="mb-4 flex items-start gap-3 rounded-md border p-3 text-sm"
		class:bg-amber-50={!isFinal}
		class:border-amber-300={!isFinal}
		class:text-amber-900={!isFinal}
		class:bg-emerald-50={isFinal}
		class:border-emerald-300={isFinal}
		class:text-emerald-900={isFinal}
	>
		<div class="mt-0.5 shrink-0">
			{#if isFinal}
				<CircleCheck class="h-5 w-5" />
			{:else}
				<TriangleAlert class="h-5 w-5" />
			{/if}
		</div>
		<div class="flex-1">
			<div class="font-semibold uppercase tracking-wide">
				{isFinal ? 'Final Results' : 'Provisional Results'}
			</div>
			<p class="mt-1">
				{#if isFinal}
					These results are authoritative. They were finalized {result.finalizedAt
						? 'on ' + convertTimestamp(result.finalizedAt)
						: 'after the voting period closed'} and the evidence has been
					committed on-chain.
				{:else}
					These numbers are a running tally and may still change. Voting power can shift as
					delegations move, and the backend recomputes this tally every few minutes. Authoritative
					results are published once the ballot closes and the on-chain finalization runs.
				{/if}
			</p>
			{#if result.updatedAt}
				<p class="mt-1 text-xs opacity-75">
					Last updated {convertTimestamp(result.updatedAt)}
				</p>
			{/if}
		</div>
	</div>
{/if}

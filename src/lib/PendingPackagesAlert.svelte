<script>
	import { user } from '$stores/sessionManager.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { TriangleAlert } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	const pending = $derived.by(() => {
		const list = $user?.pendingPackages ?? [];
		return Array.isArray(list) ? list : [];
	});
	const count = $derived(pending.length);

	// Unique ballots — one voter can legitimately have multiple packages on
	// the same ballot (e.g. a failed draft + a fresh one), so dedupe for
	// the "go sign" CTA.
	const uniqueBallots = $derived.by(() => {
		const seen = new Set();
		return pending.filter((p) => {
			if (!p?.ballotId || seen.has(p.ballotId)) return false;
			seen.add(p.ballotId);
			return true;
		});
	});
</script>

{#if count > 0}
	<div
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 200 }}
		class="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
	>
		<div class="mb-2 flex items-center gap-2 font-semibold">
			<TriangleAlert class="h-4 w-4" />
			{count === 1 ? 'You have a vote package awaiting action' : `You have ${count} vote packages awaiting action`}
		</div>
		<p class="mb-2 text-xs">
			These packages were drafted but haven't completed signing or on-chain submission. Finish
			them before the ballot closes, otherwise your vote won't count.
		</p>
		<div class="flex flex-wrap gap-2">
			{#each uniqueBallots as p}
				<Button
					variant="outline"
					size="sm"
					href={'/ballots/' + p.ballotId + '/proposals'}
					class="text-xs"
				>
					{p.isMultisig ? 'Cosigner action needed' : 'Resume signing'} →
				</Button>
			{/each}
		</div>
	</div>
{/if}

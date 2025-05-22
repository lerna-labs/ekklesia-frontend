<script>
	let { proposal } = $props();
	let cost = $derived.by(() => {
		if (!proposal || !proposal.data || !proposal.data.cost) {
			return null;
		}
		return new Intl.NumberFormat('en-US').format(proposal.data.cost);
	});
</script>

{#if cost}
	<div title={proposal.thresholdReached ? 'Threshold reached' : 'Threshold failed'}>
		<span
			class="select-none text-nowrap rounded-md px-1.5 py-1 text-xs font-medium text-white {proposal.thresholdReached ===
			true
				? 'bg-green-400'
				: proposal.thresholdReached === false
					? 'bg-red-400'
					: 'bg-orange-400'}"
		>
			{cost} ADA
		</span>
	</div>
{/if}

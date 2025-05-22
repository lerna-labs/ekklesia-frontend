<script>
	let { proposal } = $props();
</script>

<section class=" mt-2 flex flex-col gap-1 text-xs">
	<div>
		<span class="font-semibold">Proposal ID:</span>
		{proposal._id}
	</div>
	{#if proposal.data?.data?.committee}
		<div>
			<span class="font-semibold">Committee:</span>
			{proposal.data.data.committee}
		</div>
	{/if}
	{#if proposal.data?.data?.roadmap}
		<div>
			<span class="font-semibold">Roadmap:</span>
			{proposal.data.data.roadmap}
		</div>
	{/if}
	{#if proposal.data?.data?.type}
		<div>
			<span class="font-semibold">Type:</span>
			{proposal.data.data.type}
		</div>
	{/if}
	{#if proposal.data?.data?.type}
		<div>
			<span class="font-semibold">Author:</span>
			{proposal.data.data.owner_info.company_name || 'Individual'}
		</div>
	{/if}

	<!-- {#if proposal.thresholdReached}
		<div class="mt-2">
			<div class="inline rounded-xl bg-green-400 p-3 font-semibold text-green-800">
				Threshold Reached
			</div>
		</div>
	{:else if proposal.thresholdReached == false}
		<div class="mt-2">
			<div class="inline rounded-xl bg-red-400 px-3 py-2 font-semibold text-red-800">
				Threshold Not Reached
			</div>
		</div>
	{/if} -->
</section>

<script>
	let { proposal } = $props();
</script>

<section class=" mt-2 flex flex-col gap-1 text-xs">
	<div>
		<span class="font-semibold">Proposal ID:</span>
		{proposal._id}
	</div>
	{#if proposal.categories?.length}
		<div>
			<span class="font-semibold"> Category: </span>
			{#each proposal.categories as category, index}
				<a
					href={'/ballots/' + proposal.ballotId + '/proposals?categories=' + category}
					class="hover:underline"
				>
					{category}
				</a>{#if index < proposal.categories.length - 1},&nbsp;
				{/if}
			{/each}
		</div>
	{/if}

	{#if proposal.tags?.length}
		<div>
			<span class="font-semibold"> Tags: </span>
			{#each proposal.tags as tag, index}
				<a
					href={'/ballots/' + proposal.ballotId + '/proposals?tags=' + tag}
					class="hover:underline"
				>
					{tag}
				</a>{#if index < proposal.categories.length - 1},&nbsp;
				{/if}
			{/each}
		</div>
	{/if}

	{#if proposal.thresholdReached}
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
	{/if}
</section>

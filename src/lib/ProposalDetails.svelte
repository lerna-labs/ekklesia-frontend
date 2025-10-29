<script>
	let { proposal, ballot } = $props();
	import { convertTimestamp } from '$lib/utils.js';
</script>

<section class=" mt-2 flex flex-col gap-1 text-xs">
	<div>
		<span class="font-semibold">Proposal ID:</span>
		{proposal._id}
	</div>

	{#if proposal.ipfsHash}
		<div>
			<span class="font-semibold">IPFS:</span>
			<a
				href={'https://ipfs.io/ipfs/' + proposal.ipfsHash}
				target="_blank"
				class="link inline-block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap align-bottom"
				title={proposal.ipfsHash}
			>
				{proposal.ipfsHash}
			</a>
		</div>
	{/if}

	{#if ballot?.status == 'live'}
		<div>
			<span class="font-semibold">Voting ends on:</span>
			{convertTimestamp(ballot.votePeriodEnd)}
		</div>
	{/if}
	{#if ballot?.status == 'closed'}
		<div>
			<span class="font-semibold">Voting ended on:</span>
			{convertTimestamp(ballot.votePeriodEnd)}
		</div>
	{/if}
	{#if ballot?.status == 'upcoming'}
		<div>
			<span class="font-semibold">Voting starts on:</span>
			{convertTimestamp(ballot.votePeriodStart)}
		</div>

		<div>
			<span class="font-semibold">Voting ends on:</span>
			{convertTimestamp(ballot.votePeriodEnd)}
		</div>
	{/if}

	{#if ballot?.status == 'closed'}
		<div>
			<span class="font-semibold">On-Chain Results:</span>
			{#if ballot.resultTxHash}
				<a
					href={'https://adastat.net/transactions/' + ballot.resultTxHash}
					target="_blank"
					class="link"
				>
					{ballot.resultTxHash}
				</a>
			{:else}
				Pending
			{/if}
		</div>
	{/if}

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
</section>

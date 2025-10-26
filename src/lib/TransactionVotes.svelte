<script>
	import { api } from '$stores/sessionManager.js';
	import { onMount } from 'svelte';
	let { vote } = $props();
	console.log('vote in TransactionVotes:', vote);

	let proposal = $state(false);
	let voteOptions = $state([]);
	let voteLabels = $state([]);
	onMount(async () => {
		const requestProposal = await api.fetch(fetch, '/proposals/' + vote.proposalId + '/short');
		proposal = await requestProposal.json();
		voteOptions = proposal.voteOptions;
		// map vote.vote (array of option IDs) to voteOptions labels
		voteLabels = vote.vote.map((optionId) => {
			const option = voteOptions.find((opt) => opt.id === optionId);
			return option ? option.label : 'Unknown';
		});
	});
</script>

<div class="mb-2 flex items-start justify-between">
	<div class="font-medium">
		<a href={'/ballots/' + proposal.ballotId + '/proposals/' + proposal._id} target="_blank">
			{proposal.title}
			<div class="mt-1 text-xs text-muted-foreground">
				<span>Proposal ID:</span>
				{proposal._id}
			</div>
		</a>
	</div>
	<!-- DUPLICATE FROM BallotCardVotes -->
	<div
		class="flex flex-col items-end gap-0.5 md:max-w-[30vw] md:flex-row md:flex-wrap md:items-end md:justify-end md:gap-0.5"
	>
		{#each voteLabels as label}
			<div
				class="mb-0.5 w-full overflow-hidden whitespace-nowrap rounded-md px-3 py-1 text-center text-xs md:inline-flex md:w-auto {label ===
				'Yes'
					? 'bg-green-500 text-green-100'
					: label === 'No'
						? 'bg-red-500 text-red-100'
						: 'bg-slate-500 text-slate-100'}"
			>
				{label}
			</div>
		{/each}
	</div>
</div>

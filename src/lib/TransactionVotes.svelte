<script>
	import { api } from '$stores/sessionManager.js';
	import { onMount } from 'svelte';
	let { vote } = $props();

	let proposal = $state(false);
	let voteOptions = $state([]);
	let voteLabel = $state('');
	onMount(async () => {
		const requestProposal = await api.fetch(fetch, '/proposals/' + vote.proposalId + '/short');
		proposal = await requestProposal.json();
		voteLabel = proposal.voteOptions.find((el) => el.value === vote.value).label;
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
	<div
		class="rounded-md p-2 text-xs {voteLabel === 'Yes'
			? 'bg-green-500 text-green-100'
			: voteLabel === 'No'
				? 'bg-red-500 text-red-100'
				: 'bg-slate-500 text-slate-100'}"
	>
		{voteLabel}
	</div>
</div>

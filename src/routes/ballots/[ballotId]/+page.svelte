<script>
	import Badge from '$lib/BallotBadge.svelte';
	import BallotDetails from '$lib/BallotDetails.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	let { data } = $props();
	let { ballot } = data;
</script>

{#if ballot}
	<div class="flex items-start gap-2">
		<h1 class="text-3xl">{ballot.name}</h1>
		<Badge status={ballot.status} />
	</div>
	<BallotDetails {ballot} />
	<p class="mb-4">{ballot.description}</p>
	<Button href={'/ballots/' + data.ballot._id + '/proposals'}>View Proposals</Button>
{:else}
	<p>Ballot not found.</p>
{/if}

<div class="mt-12"></div>

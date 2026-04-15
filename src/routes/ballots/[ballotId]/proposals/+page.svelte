<script>
	import { onMount } from 'svelte';
	import Badge from '$lib/BallotBadge.svelte';
	import ProposalCard from '$lib/ProposalCard.svelte';
	import ProposalTable from '$lib/ProposalTable.svelte';
	import Pagination from '$lib/base/Pagination.svelte';
	import Filter from '$lib/base/Filter.svelte';
	import Sort from '$lib/base/Sort.svelte';
	import Search from '$lib/base/Search.svelte';
	import ViewSwitch from '$lib/ViewSwitch.svelte';
	import { convertTimestamp, lovelaceToAda } from '$lib/utils.js';
	import { goto } from '$app/navigation';
	import BallotDetails from '$lib/BallotDetails.svelte';
	import BallotCosignerPrompt from '$lib/BallotCosignerPrompt.svelte';
	import BallotProvenance from '$lib/BallotProvenance.svelte';
	import AuditMyVote from '$lib/AuditMyVote.svelte';
	let view = $state('grid');

	let { data } = $props();
	let ballot = $state(data.ballot);
	let proposals = $derived(data.proposals);
</script>

<div class="flex items-start gap-2">
	<h1 class="text-3xl">{ballot.title}</h1>
	<Badge status={ballot.status} />
</div>
<BallotDetails {ballot} class="mt-2" />

<BallotCosignerPrompt {ballot} />
<BallotProvenance {ballot} />
<AuditMyVote {ballot} />

<section class="mt-6">
	<header class="mb-4 items-center justify-between sm:flex">
		<h2 class="mb-3">Proposals ({data.pagination.total})</h2>
		<div class="flex justify-between gap-1">
			<Search />
			<Sort
				showCost={ballot.voteFilters}
				sortOptions={[
					{ value: 'title', label: 'Name' },
					{ value: 'commentCount', label: 'Comment Count' },
					{ value: 'voteCount', label: 'Vote Count' }
				]}
			/>
			<Filter filterOptions={data.filterOptions} voteFilters={ballot.voteFilters} />
			<!-- <ViewSwitch
				onChange={(newView) => {
					view = newView;
				}}
			/> -->
		</div>
	</header>

	{#if data.proposals.length > 0}
		{#if view == 'grid'}
			{#each data.proposals as proposal}
				<ProposalCard {ballot} {proposal} />
			{/each}
		{/if}

		{#if view == 'list'}
			<ProposalTable {ballot} proposalList={data.proposals} />
		{/if}
	{:else}
		<p>No proposals found :(</p>
	{/if}
</section>

{#if data.pagination.totalPages > 1}
	<div class="mt-4 flex justify-center">
		<Pagination
			count={data.pagination.total}
			perPage={data.perPage}
			currentPage={data.currentPage}
			{...data.pagination}
		/>
	</div>
{/if}

<div class="mt-12"></div>

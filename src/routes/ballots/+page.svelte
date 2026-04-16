<script>
	import { Button } from '$lib/components/ui/button';
	import BallotCard from '$lib/BallotCard.svelte';
	import BallotFilter from '$lib/BallotFilter.svelte';
	import Pagination from '$lib/base/Pagination.svelte';
	import Search from '$lib/base/Search.svelte';
	import { XCircle } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	let { data } = $props();
</script>

<section class="">
	<header class="mb-4 items-center justify-between sm:flex">
		<h1 class="mb-3">Ballots ({data.pagination.total})</h1>
		<div class="flex justify-between gap-1">
			<Search />
			<BallotFilter {data} />
		</div>
	</header>

	{#if data && data.ballots && data.ballots.length > 0}
		{#each data.ballots as ballot}
			<BallotCard {ballot} />
		{/each}
		{#if data.pagination.totalPages > 1}
			<div class="mt-4 flex justify-center">
				<Pagination
					count={data.totalBallots}
					perPage={data.perPage}
					currentPage={data.currentPage}
					{...data.pagination}
				/>
			</div>
		{/if}
	{:else}
		<div class="py-8">
			{#if data.search}
				<p class="mb-4">No ballots matched your search for "{data.search}"</p>
				<Button
					onclick={() => {
						const url = new URL(window.location.href);
						url.searchParams.delete('search');
						goto(url.toString());
					}}>Clear Search</Button
				>
			{:else}
				<p>No ballots found.</p>
			{/if}
		</div>
	{/if}
</section>

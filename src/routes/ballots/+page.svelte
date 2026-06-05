<script>
	import { Button } from '$lib/components/ui/button';
	import BallotCard from '$lib/BallotCard.svelte';
	import BallotFilter from '$lib/BallotFilter.svelte';
	import Pagination from '$lib/base/Pagination.svelte';
	import Search from '$lib/base/Search.svelte';
	import { XCircle } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	let { data } = $props();

	// Surface ballots in most-actionable order: live first, then upcoming,
	// then closed, then archived. Keeps the backend's ordering stable
	// within each status bucket.
	const STATUS_ORDER = { live: 0, upcoming: 1, closed: 2, archived: 3 };
	const rankStatus = (s) => STATUS_ORDER[String(s || '').toLowerCase()] ?? 99;
	const sortedBallots = $derived.by(() =>
		[...(data.ballots ?? [])].sort(
			(a, b) => rankStatus(a.status) - rankStatus(b.status)
		)
	);
</script>

<section>
	<!-- Below sm the title takes its own line, then a full-width search bar
	     with the filter popover trigger anchored at the right edge as an
	     icon-only button. At sm+ the original inline layout returns. -->
	<header class="mb-4 sm:flex sm:items-center sm:justify-between">
		<h1 class="mb-3">Ballots ({data.pagination.total})</h1>
		<div class="flex items-center gap-1 sm:justify-between">
			<div class="min-w-0 flex-1 sm:flex-initial">
				<Search />
			</div>
			<BallotFilter {data} />
		</div>
	</header>

	{#if data && data.ballots && data.ballots.length > 0}
		{#each sortedBallots as ballot}
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

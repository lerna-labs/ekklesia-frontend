<script>
	import { page } from '$app/stores';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { goto } from '$app/navigation';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	// Get pagination data from page store
	const count = $derived($page.data.pagination.total);
	const perPage = $derived($page.data.pagination.limit);
	const currentPage = $derived($page.data.pagination.page);
	const totalPages = $derived($page.data.pagination.totalPages);

	// Function to navigate to a specific page while preserving other URL parameters
	function navigateTo(pageNum) {
		// console.log('Navigating to page:', pageNum);
		// Create a URL object from the current URL
		const url = new URL(window.location.href);

		// Update only the page parameter
		url.searchParams.set('page', pageNum.toString());

		// Navigate to the new URL
		goto(url.toString());
	}

	// Handler for "Previous" button
	function goToPrevious() {
		if (currentPage > 1) {
			navigateTo(currentPage - 1);
		}
	}

	// Handler for "Next" button
	function goToNext() {
		if (currentPage < totalPages) {
			navigateTo(currentPage + 1);
		}
	}

	// Handler for direct page navigation
	function goToPage(pageNum) {
		navigateTo(pageNum);
	}
</script>

<Pagination.Root {count} {perPage} {currentPage} {...$page.data.pagination || {}}>
	{#snippet children({ pages, currentPage })}
		<Pagination.Content>
			<Pagination.Item>
				<Pagination.PrevButton
					onclick={goToPrevious}
					disabled={currentPage <= 1}
					aria-label="Previous page"
				>
					<ChevronLeft class="size-4" />
					<span class="hidden sm:inline">Previous</span>
				</Pagination.PrevButton>
			</Pagination.Item>

			{#each pages as page (page.key)}
				{#if page.type === 'ellipsis'}
					<Pagination.Item>
						<Pagination.Ellipsis />
					</Pagination.Item>
				{:else}
					<Pagination.Item isVisible={currentPage === page.value}>
						<Pagination.Link
							{page}
							isActive={currentPage === page.value}
							onclick={() => goToPage(page.value)}
						>
							{page.value}
						</Pagination.Link>
					</Pagination.Item>
				{/if}
			{/each}

			<Pagination.Item>
				<Pagination.NextButton
					onclick={goToNext}
					disabled={currentPage >= totalPages}
					aria-label="Next page"
				>
					<span class="hidden sm:inline">Next</span>
					<ChevronRight class="size-4" />
				</Pagination.NextButton>
			</Pagination.Item>
		</Pagination.Content>
	{/snippet}
</Pagination.Root>

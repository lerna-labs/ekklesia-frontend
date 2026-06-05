<script>
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { page } from '$app/stores';
	import { ChevronRight } from 'lucide-svelte';

	// This will reactively update when $page changes
	$: breadcrumbItems = getBreadcrumbItems($page.url.pathname, $page.data);

	// Function to generate breadcrumb items based primarily on URL path
	function getBreadcrumbItems(pathname, pageData) {
		// Start with Home
		const items = [{ label: 'Home', path: '/', active: pathname === '/' }];

		if (pathname === '/') {
			return items;
		}

		// Get the path segments
		const pathSegments = pathname.split('/').filter(Boolean);

		// Build up the breadcrumb items based on path segments
		let currentPath = '';

		for (let i = 0; i < pathSegments.length; i++) {
			const segment = pathSegments[i];
			currentPath += `/${segment}`;

			// Generate appropriate label based on segment and available data
			let label = segment.charAt(0).toUpperCase() + segment.slice(1); // Capitalize by default

			// Check if this is the last segment and might be an ID
			const isLastSegment = i === pathSegments.length - 1;
			const isIdLike = segment.length > 12 && !isNaN(parseInt(segment.charAt(0), 16));

			// Replace IDs with meaningful names if available in page data
			if (isIdLike) {
				// For ballot IDs
				if (
					pathSegments[i - 1] === 'ballots' &&
					pageData.ballot &&
					pageData.ballot._id === segment
				) {
					// Limit the length for ballot names
					label = pageData.ballot.title || 'Ballot Details';
					if (label.length > 30) {
						label = label.substring(0, 30) + '...';
					}
				}
				// For proposal IDs
				else if (
					pathSegments[i - 1] === 'proposals' &&
					pageData.proposal &&
					pageData.proposal._id === segment
				) {
					// Limit the length for proposal names
					label = pageData.proposal.title || 'Proposal Details';
					if (label.length > 30) {
						label = label.substring(0, 30) + '...';
					}
				}
				// For transaction IDs and other resources
				else if (isLastSegment) {
					// For clarity in case of IDs with no matching data
					const resourceType =
						pathSegments[i - 1] === 'ballots'
							? 'Ballot'
							: pathSegments[i - 1] === 'proposals'
								? 'Proposal'
								: pathSegments[i - 1] === 'votes'
									? 'Vote'
									: '';

					// Show much shorter ID for better space conservation
					label = `${resourceType} ${segment.substring(0, 8)}...`;
				}
			}

			items.push({
				label,
				path: currentPath,
				active: pathname === currentPath
			});
		}

		return items;
	}
</script>

{#if breadcrumbItems.length > 1}
<!-- Breadcrumbs live inside the sticky header chrome and inherit its
     background + foreground tokens. Inactive items + chevron separators
     are alpha-stepped so they remain legible against any header bg while
     still reading as secondary.

     On narrow viewports the trail switches from `overflow-hidden` (which
     silently chopped the rightmost — usually most important — items) to
     a horizontally-scrollable strip. Per-item `max-w` shrinks on small
     screens so the active page stays at least partly visible without
     having to scroll. -->
<Breadcrumb.Root class="bg-header text-header-foreground w-full border-t border-header-foreground/15">
	<Breadcrumb.List
		class="breadcrumb-scroll text-header-foreground m-auto flex w-full max-w-3xl items-center overflow-x-auto whitespace-nowrap p-4 pt-4 text-xs *:gap-0"
	>
		{#each breadcrumbItems as item, i}
			{#if i > 0}
				<Breadcrumb.Separator class="text-header-foreground/40 mx-0 flex-shrink-0 p-0">
					<ChevronRight class="h-3 w-3" />
				</Breadcrumb.Separator>
			{/if}

			<Breadcrumb.Item class="m-0 min-w-0 flex-shrink p-0">
				{#if item.active}
					<Breadcrumb.Page
						class="text-header-foreground block max-w-[12rem] truncate sm:max-w-[18rem]"
						title={item.label}
					>
						{item.label}
					</Breadcrumb.Page>
				{:else}
					<Breadcrumb.Link
						href={item.path}
						class="text-header-foreground/70 hover:text-header-foreground block max-w-[8rem] truncate transition-colors sm:max-w-[12rem]"
						title={item.label}
					>
						{item.label}
					</Breadcrumb.Link>
				{/if}
			</Breadcrumb.Item>
		{:else}
			<Breadcrumb.Item class="m-0 p-0">
				<Breadcrumb.Link href="/" class="text-header-foreground/70 hover:text-header-foreground transition-colors">Home</Breadcrumb.Link>
			</Breadcrumb.Item>
		{/each}
	</Breadcrumb.List>
</Breadcrumb.Root>
{/if}

<style>
	/* Slim, low-contrast scrollbar so the strip stays a thin chrome
	   element rather than a heavy desktop scrollbar. Hidden entirely on
	   small touch viewports where horizontal scrolling is gestural.
	   `:global()` because `.breadcrumb-scroll` rides on a shadcn child
	   component's <ol> — Svelte's scoping can't track classes through
	   the prop boundary. */
	:global(.breadcrumb-scroll) {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--header-foreground) / 0.2) transparent;
	}
	:global(.breadcrumb-scroll::-webkit-scrollbar) {
		height: 4px;
	}
	:global(.breadcrumb-scroll::-webkit-scrollbar-thumb) {
		background-color: hsl(var(--header-foreground) / 0.2);
		border-radius: 9999px;
	}
	@media (max-width: 640px) {
		:global(.breadcrumb-scroll) {
			scrollbar-width: none;
		}
		:global(.breadcrumb-scroll::-webkit-scrollbar) {
			display: none;
		}
	}
</style>

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
        active: pathname === currentPath,
      });
    }

    return items;
  }
</script>

{#if breadcrumbItems.length > 1}
  <Breadcrumb.Root class="w-full border-t border-slate-700 bg-[#1E1E2F] text-white">
    <Breadcrumb.List
      class="m-auto flex w-full max-w-3xl items-center overflow-hidden whitespace-nowrap p-4 pt-4 text-xs text-white *:gap-0"
    >
      {#each breadcrumbItems as item, i}
        {#if i > 0}
          <Breadcrumb.Separator class="mx-0 flex-shrink-0 p-0 text-slate-500">
            <ChevronRight class="h-3 w-3" />
          </Breadcrumb.Separator>
        {/if}

        <Breadcrumb.Item class="m-0 min-w-0 flex-shrink p-0 text-slate-500">
          {#if item.active}
            <Breadcrumb.Page class="block truncate text-slate-500" title={item.label}>
              {item.label}
            </Breadcrumb.Page>
          {:else}
            <Breadcrumb.Link
              href={item.path}
              class="block truncate text-slate-500 hover:text-slate-300"
              title={item.label}
            >
              {item.label}
            </Breadcrumb.Link>
          {/if}
        </Breadcrumb.Item>
      {:else}
        <Breadcrumb.Item class="m-0 p-0 text-slate-500">
          <Breadcrumb.Link href="/" class="text-slate-500 hover:text-slate-300"
            >Home</Breadcrumb.Link
          >
        </Breadcrumb.Item>
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
{/if}

<style>
  /* Ensure the breadcrumbs container stays on one line */
  :global(.breadcrumb-list) {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: hidden;
    scroll-behavior: smooth;
    max-width: 100%;
  }

  /* Make items truncate with ellipsis */
  :global(.breadcrumb-item) {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Make the active item (last one) prioritized */
  :global(.breadcrumb-page) {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

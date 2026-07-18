<script>
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { buttonVariants } from '$lib/components/ui/button';
  import { SlidersHorizontal } from 'lucide-svelte';
  import { loggedIn } from '$stores/sessionManager';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Define props to receive data from parent component
  const { filterOptions, voteFilters } = $props();

  // Initialize filters from URL or default to 'All'
  let tags = $state($page.url.searchParams.get('tags') || 'All');
  let categories = $state($page.url.searchParams.get('categories') || 'All');
  let hasVoted = $state($page.url.searchParams.get('hasVoted') || 'All');
  let thresholdReached = $state($page.url.searchParams.get('thresholdReached') || 'All');

  // Computed property to determine if any filter is active
  const filtersActive = $derived.by(() => {
    if (
      tags !== 'All' ||
      categories !== 'All' ||
      hasVoted !== 'All' ||
      thresholdReached !== 'All'
    ) {
      return true;
    }
  });

  function handleFilterChange() {
    // Update the URL with query params
    const url = new URL(window.location.href);

    // Reset page to 1 when filters change
    url.searchParams.delete('page');

    // Handle tags filter
    if (tags === 'All') {
      url.searchParams.delete('tags');
    } else {
      url.searchParams.set('tags', tags);
    }

    // Handle categories filter
    if (categories === 'All') {
      url.searchParams.delete('categories');
    } else {
      url.searchParams.set('categories', categories);
    }

    // Handle hasVoted filter
    if (hasVoted === 'All') {
      url.searchParams.delete('hasVoted');
    } else {
      url.searchParams.set('hasVoted', hasVoted);
    }

    // Handle thresholdReached filter
    if (thresholdReached === 'All') {
      url.searchParams.delete('thresholdReached');
    } else {
      url.searchParams.set('thresholdReached', thresholdReached);
    }

    // Use goto to navigate to the new URL with the updated query params
    goto(url.toString(), { replaceState: true, keepFocus: true });
  }
</script>

<Popover.Root>
  <Popover.Trigger class={buttonVariants({ variant: 'outline', class: 'pl-3 pr-3' })}>
    <div class="relative">
      <SlidersHorizontal />
      {#if filtersActive}
        <span class="buzz absolute -right-2 -top-1 h-2 w-2 rounded-full bg-orange-500"></span>
      {/if}
    </div>
  </Popover.Trigger>
  <Popover.Content class="text-sm">
    <b>Filter Options</b>

    {#if voteFilters}
      <div class="mt-2">
        <div class="mb-1">
          <Label for="tags" class="text-xs">Tags</Label>
        </div>
        <Select.Root
          type="single"
          id="tags"
          class="w-full text-xs"
          bind:value={tags}
          onValueChange={handleFilterChange}
        >
          <Select.Trigger>{tags}</Select.Trigger>
          <Select.Content>
            <Select.Item value="All">All</Select.Item>
            {#each filterOptions.tags || [] as option}
              <Select.Item value={option} class="capitalize">
                {option}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="mt-2">
        <div class="mb-1">
          <Label for="categories" class="text-xs">Categories</Label>
        </div>
        <Select.Root
          type="single"
          id="categories"
          class="w-full text-xs"
          bind:value={categories}
          onValueChange={handleFilterChange}
        >
          <Select.Trigger>{categories}</Select.Trigger>
          <Select.Content>
            <Select.Item value="All">All</Select.Item>
            {#each filterOptions.categories || [] as option}
              <Select.Item value={option} class="capitalize">
                {option}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    {/if}

    {#if $loggedIn}
      <div class="mt-2">
        <div class="mb-1">
          <Label for="votingStatus" class="text-xs">Voting Status</Label>
        </div>
        <Select.Root
          type="single"
          id="votingStatus"
          class="w-full text-xs"
          bind:value={hasVoted}
          onValueChange={handleFilterChange}
        >
          <Select.Trigger
            >{hasVoted === 'All'
              ? 'All'
              : hasVoted === 'true'
                ? 'Voted'
                : 'Not Voted'}</Select.Trigger
          >
          <Select.Content>
            <Select.Item value="All">All</Select.Item>
            <Select.Item value="true">Voted</Select.Item>
            <Select.Item value="false">Not Voted</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
    {/if}

    {#if filterOptions.thresholdReached}
      <div class="mt-2">
        <div class="mb-1">
          <Label for="thresholdReached" class="text-xs">Threshold</Label>
        </div>
        <Select.Root
          type="single"
          id="thresholdReached"
          class="w-full text-xs"
          bind:value={thresholdReached}
          onValueChange={handleFilterChange}
        >
          <Select.Trigger
            >{thresholdReached === 'All'
              ? 'All'
              : thresholdReached === 'true'
                ? 'Threshold Reached'
                : 'Threshold Not Reached'}</Select.Trigger
          >
          <Select.Content>
            <Select.Item value="All">All</Select.Item>
            <Select.Item value="true">Threshold Reached</Select.Item>
            <Select.Item value="false">Threshold Not Reached</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
    {/if}
  </Popover.Content>
</Popover.Root>

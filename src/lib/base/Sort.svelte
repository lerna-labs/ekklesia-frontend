<script>
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { buttonVariants } from '$lib/components/ui/button';
  import { ArrowUpDown } from 'lucide-svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { untrack } from 'svelte';

  // Define props with default values
  let { showCost = true, sortOptions = [], defaultLimit = '25', defaultSort = '_id' } = $props();

  // Filter out the cost option when it should not be shown, staying reactive
  // to changes in the incoming props.
  const filteredSortOptions = $derived(
    showCost ? sortOptions : sortOptions.filter((option) => option.value !== 'cost'),
  );

  // Define available limit options
  let limitOptions = $state([
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' },
  ]);

  // Initialize sort params from URL or default values
  let sort = $state($page.url.searchParams.get('sort') || untrack(() => defaultSort));
  let direction = $state($page.url.searchParams.get('direction') || 'desc');
  let limit = $state($page.url.searchParams.get('limit') || untrack(() => defaultLimit));

  // Computed property to determine if sort is active (not using default)
  let sortActive = $derived.by(() => {
    return sort !== defaultSort || limit !== defaultLimit;
  });

  // Generate a human-readable description of the current sort
  let sortDescription = $derived.by(() => {
    const option = filteredSortOptions.find((o) => o.value === sort);
    if (!option) return 'Default';

    return `${option.label} (${direction === 'asc' ? 'Low to High' : 'High to Low'})`;
  });

  // Handle sort field change
  function handleSortChange() {
    updateSortParams();
  }

  // Handle direction change
  function handleDirectionChange() {
    updateSortParams();
  }

  // Handle limit change
  function handleLimitChange() {
    updateSortParams();
  }

  // Update URL with sort parameters
  function updateSortParams() {
    // Update the URL with query params
    const url = new URL(window.location.href);

    // Reset page to 1 when sort changes
    url.searchParams.delete('page');

    // Handle sort parameter
    if (sort === defaultSort) {
      url.searchParams.delete('sort');
    } else {
      url.searchParams.set('sort', sort);
    }

    // Handle direction parameter
    if (direction === 'desc') {
      url.searchParams.delete('direction');
    } else {
      url.searchParams.set('direction', direction);
    }

    // Handle limit parameter
    if (limit === defaultLimit) {
      url.searchParams.delete('limit');
    } else {
      url.searchParams.set('limit', limit);
    }

    // Use goto to navigate to the new URL with the updated query params
    goto(url.toString(), { replaceState: true, keepFocus: true });
  }
</script>

<Popover.Root>
  <Popover.Trigger class={buttonVariants({ variant: 'outline', class: 'pl-3 pr-3' })}>
    <div class="relative">
      <ArrowUpDown />
      {#if sortActive}
        <span class="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-orange-500"></span>
      {/if}
    </div>
  </Popover.Trigger>
  <Popover.Content class="text-sm">
    <b>Sort Options</b>

    <div class="mt-2">
      <div class="mb-1">
        <Label for="sortField" class="text-xs">Sort By</Label>
      </div>
      <Select.Root
        type="single"
        id="sortField"
        class="w-full text-xs"
        bind:value={sort}
        onValueChange={handleSortChange}
      >
        <Select.Trigger>{sortDescription}</Select.Trigger>
        <Select.Content>
          <Select.Item value="_id">Default</Select.Item>
          {#each filteredSortOptions as option}
            <Select.Item value={option.value}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    {#if sort !== '_id'}
      <div class="mt-2">
        <div class="mb-1">
          <Label for="direction" class="text-xs">Order</Label>
        </div>
        <Select.Root
          type="single"
          id="direction"
          class="w-full text-xs"
          bind:value={direction}
          onValueChange={handleDirectionChange}
        >
          <Select.Trigger>{direction === 'asc' ? 'Low to High' : 'High to Low'}</Select.Trigger>
          <Select.Content>
            <Select.Item value="asc">Low to High</Select.Item>
            <Select.Item value="desc">High to Low</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
    {/if}

    <div class="mt-2">
      <div class="mb-1">
        <Label for="limit" class="text-xs">Entries Per Page</Label>
      </div>
      <Select.Root
        type="single"
        id="limit"
        class="w-full text-xs"
        bind:value={limit}
        onValueChange={handleLimitChange}
      >
        <Select.Trigger
          >{limitOptions.find((opt) => opt.value === limit)?.label || '10 per page'}</Select.Trigger
        >
        <Select.Content>
          {#each limitOptions as option}
            <Select.Item value={option.value}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </Popover.Content>
</Popover.Root>

<script>
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { buttonVariants } from '$lib/components/ui/button';
  import { SlidersHorizontal } from 'lucide-svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { invalidate, goto } from '$app/navigation';

  // Define props to receive data from parent component
  const { data } = $props();

  // Initialize status and voterType from URL or default to 'All'
  // svelte-ignore state_referenced_locally
  let status = $state(data.status ? capitalizeFirstLetter(data.status) : 'All');
  // svelte-ignore state_referenced_locally
  let voterType = $state(data.voterType || 'All');

  // Sync state when data prop changes (e.g., URL changes)
  $effect(() => {
    status = data.status ? capitalizeFirstLetter(data.status) : 'All';
    voterType = data.voterType || 'All';
  });

  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string) {
    if (!string) return 'All';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function handleFilterChange() {
    // Update the URL with query params
    const url = new URL(window.location.href);

    // Reset page to 1 when filters change
    url.searchParams.delete('page');

    if (status === 'All') {
      // Remove the status param if 'All' is selected
      url.searchParams.delete('status');
    } else {
      // Set the status param to the selected value (lowercase for API)
      url.searchParams.set('status', status.toLowerCase());
    }

    if (voterType === 'All') {
      // Remove the voterType param if 'All' is selected
      url.searchParams.delete('voterType');
    } else {
      // Set the voterType param to the selected value
      url.searchParams.set('voterType', voterType);
    }

    // Use goto to navigate to the new URL with the updated query params
    goto(url.toString(), { replaceState: true, keepFocus: true });
  }
</script>

<Popover.Root>
  <Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
    <SlidersHorizontal />
  </Popover.Trigger>
  <Popover.Content class="text-sm">
    <b>Filter Options</b>

    <div class="mt-2">
      <div class="mb-1">
        <Label for="ballot-status">Status</Label>
      </div>
      <Select.Root
        type="single"
        id="ballot-status"
        class="w-full text-xs"
        bind:value={status}
        onValueChange={handleFilterChange}
      >
        <Select.Trigger>{status}</Select.Trigger>
        <Select.Content>
          <Select.Item value="All">All</Select.Item>
          <Select.Item value="Live">Live</Select.Item>
          <Select.Item value="Closed">Closed</Select.Item>
          <Select.Item value="Upcoming">Upcoming</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <div class="mt-4">
      <div class="mb-1">
        <Label for="voter-type">Allowed Voters</Label>
      </div>
      <Select.Root
        type="single"
        id="voter-type"
        class="w-full text-xs"
        bind:value={voterType}
        onValueChange={handleFilterChange}
      >
        <Select.Trigger>{voterType}</Select.Trigger>
        <Select.Content>
          <Select.Item value="All">All</Select.Item>
          {#if data.voterTypes && data.voterTypes.length > 0}
            {#each data.voterTypes as type}
              <Select.Item value={type}>{type}</Select.Item>
            {/each}
          {/if}
        </Select.Content>
      </Select.Root>
    </div>
  </Popover.Content>
</Popover.Root>

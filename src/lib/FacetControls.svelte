<script>
  import * as Popover from '$lib/components/ui/popover/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { buttonVariants } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label/index.js';
  import { SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  /**
   * Dynamic filter + sort controls driven by `ballot.facets[]`.
   *
   * Sort options combine a small set of intrinsic Proposal fields
   * (`title`, `createdAt`) with the ballot's `sortable: true` facets,
   * so a ballot with zero sortable facets still has Name + Created
   * available. The intrinsic keys depend on the v1 endpoint accepting
   * them — see BACKEND_BUILTIN_SORTS.md. They're listed here regardless
   * because adding `{key:'title', label:'Name'}` to the array is the
   * only frontend-side change once the backend lands the allowlist.
   */
  let { facets = [], applied = {} } = $props();

  const BUILTIN_SORTS = [
    { key: 'title', label: 'Name', source: 'builtin' },
    { key: 'createdAt', label: 'Date added', source: 'builtin' },
  ];

  const filterableFacets = $derived((facets ?? []).filter((f) => f.filterable));
  const sortableFacets = $derived((facets ?? []).filter((f) => f.sortable));
  const allSortOptions = $derived([...BUILTIN_SORTS, ...sortableFacets]);

  const activeFilters = $derived(applied?.filters ?? {});
  const activeSort = $derived(applied?.sort ?? {});
  const hasActiveFilters = $derived(Object.keys(activeFilters).length > 0);
  const hasExplicitSort = $derived(activeSort.key && activeSort.source !== 'fallback');

  function applyFilter(key, value) {
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    if (value && value !== 'All') {
      url.searchParams.set(`filter[${key}]`, value);
    } else {
      url.searchParams.delete(`filter[${key}]`);
    }
    goto(url.toString(), { replaceState: true, keepFocus: true });
  }

  function applySort(key, dir) {
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    if (key) {
      url.searchParams.set('sort', key);
      url.searchParams.set('dir', dir);
    } else {
      url.searchParams.delete('sort');
      url.searchParams.delete('dir');
    }
    goto(url.toString(), { replaceState: true, keepFocus: true });
  }

  function clearAll() {
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    for (const f of facets ?? []) {
      url.searchParams.delete(`filter[${f.key}]`);
    }
    url.searchParams.delete('sort');
    url.searchParams.delete('dir');
    goto(url.toString(), { replaceState: true, keepFocus: true });
  }

  function currentFilterValue(key) {
    const v = activeFilters[key];
    if (!v) return 'All';
    return typeof v === 'string' ? v : String(v);
  }

  function activeSortLabel() {
    const opt = allSortOptions.find((o) => o.key === activeSort.key);
    return opt?.label ?? activeSort.key;
  }
</script>

<div class="flex shrink-0 items-center gap-1">
  {#if filterableFacets.length > 0}
    <Popover.Root>
      <Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
        <SlidersHorizontal class="h-3.5 w-3.5" />
        Filters
        {#if hasActiveFilters}
          <span
            class="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white"
          >
            {Object.keys(activeFilters).length}
          </span>
        {/if}
      </Popover.Trigger>
      <Popover.Content class="w-[280px] text-sm">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-bold">Filters</span>
          {#if hasActiveFilters}
            <button
              type="button"
              class="text-xs text-muted-foreground hover:underline"
              onclick={clearAll}
            >
              Clear all
            </button>
          {/if}
        </div>

        {#each filterableFacets as facet}
          <div class="mt-3">
            <div class="mb-1">
              <Label>{facet.label}</Label>
            </div>
            {#if facet.type === 'enum' && facet.options?.length > 0}
              <Select.Root
                type="single"
                value={currentFilterValue(facet.key)}
                onValueChange={(v) => applyFilter(facet.key, v)}
              >
                <Select.Trigger class="w-full text-xs">
                  {currentFilterValue(facet.key)}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="All">All</Select.Item>
                  {#each facet.options as opt}
                    <Select.Item value={opt}>{opt}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            {:else}
              <input
                type="text"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                placeholder="Filter by {facet.label.toLowerCase()}..."
                value={currentFilterValue(facet.key) === 'All' ? '' : currentFilterValue(facet.key)}
                onchange={(e) => applyFilter(facet.key, e.target.value || 'All')}
              />
            {/if}
          </div>
        {/each}
      </Popover.Content>
    </Popover.Root>
  {/if}

  <Popover.Root>
    <Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
      <ArrowUpDown class="h-3.5 w-3.5" />
      Sort
      {#if hasExplicitSort}
        <span class="ml-1 text-xs text-muted-foreground">
          ({activeSortLabel()}
          {activeSort.direction === 'asc' ? '↑' : '↓'})
        </span>
      {/if}
    </Popover.Trigger>
    <Popover.Content class="w-[260px] text-sm">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-bold">Sort by</span>
        {#if hasExplicitSort}
          <button
            type="button"
            class="text-xs text-muted-foreground hover:underline"
            onclick={() => applySort(null)}
          >
            Clear
          </button>
        {/if}
      </div>
      <div class="space-y-1">
        {#each allSortOptions as opt}
          {@const isActive = activeSort.key === opt.key && hasExplicitSort}
          <div
            class="flex items-center gap-1 rounded-md px-1 py-0.5 {isActive
              ? 'bg-slate-100'
              : 'hover:bg-slate-50'}"
          >
            <button
              type="button"
              class="flex-1 truncate py-1 text-left text-xs {isActive ? 'font-semibold' : ''}"
              onclick={() =>
                applySort(opt.key, isActive && activeSort.direction === 'asc' ? 'desc' : 'asc')}
            >
              {opt.label}
              {#if opt.unit}
                <span class="text-muted-foreground">({opt.unit})</span>
              {/if}
            </button>
            <button
              type="button"
              aria-label="Sort {opt.label} ascending"
              class="rounded p-1 {isActive && activeSort.direction === 'asc'
                ? 'bg-orange-500 text-white'
                : 'text-muted-foreground hover:text-slate-900'}"
              onclick={() => applySort(opt.key, 'asc')}
            >
              <ArrowUp class="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Sort {opt.label} descending"
              class="rounded p-1 {isActive && activeSort.direction === 'desc'
                ? 'bg-orange-500 text-white'
                : 'text-muted-foreground hover:text-slate-900'}"
              onclick={() => applySort(opt.key, 'desc')}
            >
              <ArrowDown class="h-3 w-3" />
            </button>
          </div>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>

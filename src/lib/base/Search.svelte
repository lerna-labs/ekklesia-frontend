<script>
  import { LayoutGrid, List, X, Search } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  let searchInput = $state($page.url.searchParams.get('search') || '');

  // Handle search form submission
  function handleSearch(e) {
    e.preventDefault();

    // Get current URL and update search parameter
    const url = new URL(window.location.href);

    // Reset page to 1 when search changes
    url.searchParams.delete('page');

    if (searchInput.trim() === '') {
      url.searchParams.delete('search');
    } else {
      url.searchParams.set('search', searchInput.trim());
    }

    // Navigate to the new URL with updated search parameter
    goto(url.toString(), { keepFocus: true });
  }

  // Handle clearing the search
  function clearSearch() {
    searchInput = '';
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    url.searchParams.delete('page');
    goto(url.toString());
  }
</script>

<form onsubmit={handleSearch} class="relative w-full">
  <Input
    type="text"
    placeholder="Search..."
    class="w-full"
    bind:value={searchInput}
    size={35}
    maxlength={33}
    onkeyup={() => {
      if (searchInput.length == 0) {
        clearSearch();
      }
    }}
  />
  {#if searchInput}
    <Button
      size="icon"
      variant="ghost"
      type="button"
      class="absolute right-5 top-0 h-full rounded-l-none hover:bg-transparent hover:text-current"
      onclick={handleSearch}
      aria-label="submit"
    >
      <Search />
    </Button>
    <Button
      size="icon"
      variant="ghost"
      type="button"
      class="absolute right-0 top-0 h-full rounded-l-none hover:bg-transparent hover:text-current"
      onclick={clearSearch}
      aria-label="Clear search"
    >
      <X />
    </Button>
  {/if}
</form>

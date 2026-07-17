<script>
  import LinkAlert from '$lib/base/LinkAlert.svelte';

  let { text, expanded = false } = $props();
  let textData = $derived(text);
  // svelte-ignore state_referenced_locally
  let isExpanded = $state(expanded); // Initialize with the prop value, synced via $effect below
  let isLongText = $derived(text.length > 300);
  let textConverted = $derived(
    // svelte-ignore state_referenced_locally
    textData
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" data-external="true" class="border-b border-black border-dashed pb-0.5">$1</a>',
      )
      .replace(/(?:\r\n|\r|\n)+/g, (match) => {
        // If more than two line breaks, return two breaks
        return match.length > 2 ? '\n\n' : match;
      })
      .replace(/(?:\r\n|\r|\n)/g, '<br>'),
  );

  // listen to click event on the link
  let open = $state(false);
  let href = $state('');
  function handleClick(event) {
    if (event.target.tagName === 'A' && event.target.dataset.external) {
      event.preventDefault();
      href = event.target.href;
      open = true;
    }
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
  }

  // Update isExpanded when the expanded prop changes
  $effect(() => {
    isExpanded = expanded;
  });
</script>

{#if textConverted}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="text-sm" onclick={handleClick}>
    <div class={isLongText && !isExpanded && !expanded ? 'line-clamp-6' : ''}>
      {@html textConverted}
    </div>

    {#if isLongText && !expanded}
      <button
        onclick={toggleExpand}
        class="mt-2 text-xs font-medium text-orange-500 hover:text-orange-700"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    {/if}
  </div>
{/if}

<LinkAlert
  {href}
  {open}
  on:close={() => {
    open = false;
  }}
/>

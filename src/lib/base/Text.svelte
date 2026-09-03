<script>
  import LinkAlert from '$lib/base/LinkAlert.svelte';
  import { parseDisplayText } from '$lib/base/parseDisplayText.js';

  let { text, expanded = false } = $props();
  let textData = $derived(text);
  // svelte-ignore state_referenced_locally
  let isExpanded = $state(expanded); // Initialize with the prop value, synced via $effect below
  let isLongText = $derived(text.length > 300);
  // Segments (plain text / linkified URL / line break) built from the raw,
  // untrusted comment text. Rendered below with ordinary Svelte template
  // syntax rather than `{@html}`, so text segments are auto-escaped and the
  // link `href` is set through an attribute binding rather than by building
  // an HTML string. Neither path can be hijacked into markup or an event
  // handler.
  let segments = $derived(parseDisplayText(textData));

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

{#if segments.length}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="text-sm" onclick={handleClick}>
    <div class={isLongText && !isExpanded && !expanded ? 'line-clamp-6' : ''}>
      {#each segments as segment, index (index)}
        {#if segment.type === 'link'}
          <a
            href={segment.value}
            target="_blank"
            data-external="true"
            class="border-b border-dashed border-black pb-0.5">{segment.value}</a
          >
        {:else if segment.type === 'br'}
          <br />
        {:else}
          {segment.value}
        {/if}
      {/each}
    </div>

    {#if isLongText && !expanded}
      <button
        onclick={toggleExpand}
        class="mt-2 text-xs font-medium text-brand hover:text-brand-hover"
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

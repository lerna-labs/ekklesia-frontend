<script>
  import { page } from '$app/state';
  import MarkdownBrief from '$lib/base/MarkdownBrief.svelte';
  import { content } from '$lib/content.js';

  const generic = content.errors.generic;
</script>

<h1>{page.status || 500}: {page.error?.message || generic?.data.title || 'An error occurred'}</h1>

{#if generic?.body}
  <MarkdownBrief markdown={generic.body} />
{:else}
  <p>Oops, we encountered an error. Sorry for the inconvenience.</p>
{/if}

{#if page.error?.code}
  <p class="text-sm text-gray-500">Error code: {page.error.code}</p>
{/if}

<div class="mt-24"></div>

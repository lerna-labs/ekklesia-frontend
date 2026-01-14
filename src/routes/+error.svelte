<script>
	import { page } from '$app/state';
</script>

<h1>{page.status || 500}: {page.error?.message || 'An error occurred'}</h1>
<p>Oops, we encountered an error. Sorry for the inconvenience.</p>

{#if page.error?.code}
	<p class="text-sm text-gray-500">Error code: {page.error.code}</p>
{/if}

<div class="mt-24"></div>

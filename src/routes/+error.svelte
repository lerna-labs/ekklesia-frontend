<script>
	import { page } from '$app/state';
</script>

<h1>{page.status}: {page.error.message}</h1>
<p>Oops, we encountered an error. Sorry for the inconvenience.</p>

<div class="mt-24"></div>

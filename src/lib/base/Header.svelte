<script>
	import Navigation from './Navigation.svelte';
	import Breadcrumbs from './Breadcrumbs.svelte';
	import { BRAND } from './branding.js';
</script>

<header
	class="relative m-auto mb-4 flex max-w-3xl items-center justify-end p-4 pb-0 pt-4 text-white"
>
	<a href="/" class="flex-1"><h1 class="mb-0 mt-0 p-0 text-3xl font-medium">{BRAND.name}</h1></a>
	<Navigation />
</header>

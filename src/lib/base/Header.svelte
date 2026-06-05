<script>
	import Navigation from './Navigation.svelte';
	import Breadcrumbs from './Breadcrumbs.svelte';
	import { BRAND } from './branding.js';
	import { content } from '$lib/content.js';

	// Per-deployment logo. Operator drops `static/brand/<deployment>/logo.svg`
	// (or .png / .webp) and it renders in place of the BRAND.name wordmark.
	// The onerror chain tries each extension once, then falls back to the
	// wordmark — so deployments without a logo file Just Work.
	const LOGO_EXTS = ['svg', 'png', 'webp'];
	const candidates = LOGO_EXTS.map((ext) => `/brand/${content.deployment}/logo.${ext}`);
	let logoIndex = $state(0);
	let useWordmark = $state(false);

	function onLogoError() {
		if (logoIndex + 1 < candidates.length) logoIndex += 1;
		else useWordmark = true;
	}
</script>

<header
	class="text-header-foreground relative m-auto mb-4 flex max-w-3xl items-center justify-end gap-2 p-4 pb-0 pt-4"
>
	<a href="/" class="min-w-0 flex-1">
		{#if useWordmark}
			<h1 class="mb-0 mt-0 truncate p-0 text-2xl font-medium sm:text-3xl">{BRAND.name}</h1>
		{:else}
			<img
				src={candidates[logoIndex]}
				alt={BRAND.name}
				class="block h-8 w-auto max-w-full sm:h-10"
				onerror={onLogoError}
			/>
		{/if}
	</a>
	<Navigation />
</header>

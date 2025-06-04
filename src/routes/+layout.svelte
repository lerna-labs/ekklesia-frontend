<script>
	import NetworkCheck from './../lib/base/NetworkCheck.svelte';
	import '../app.css';
	import Header from '$lib/base/Header.svelte';
	import Breadcrumbs from '$lib/base/Breadcrumbs.svelte';
	import VersionCheck from '$lib/base/VersionCheck.svelte';
	import Footer from '$lib/base/Footer.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import PageHead from '$lib/base/PageHead.svelte';

	let { children, data } = $props();
	const NETWORK_ID = import.meta.env.VITE_NETWORK_ID;

	let notice = $state();
</script>

<Toaster />
<VersionCheck />

{#if NETWORK_ID == 0}
	<NetworkCheck />
{/if}

{#if notice}
	<div class="w-full bg-orange-500 p-2 text-center text-xs font-semibold uppercase text-white">
		{notice}
	</div>
{/if}

<PageHead />

<!-- Outer container with gradient that covers both components -->
<Breadcrumbs {data} />
<div class="sticky top-0 z-[10] bg-[#1E1E2F]">
	<div class="scrollWatcher bg-orange-500"></div>
	<Header />
</div>

<main class="m-auto max-w-3xl p-4 pb-0">
	<!-- Main content area -->
	{@render children()}
</main>

<Footer />

<style>
	.scrollWatcher {
		position: absolute;
		bottom: -4px;
		left: 0;
		width: 100%;
		height: 4px;
		width: 100%;
		scale: 0 1;
		transform-origin: left;
		animation: scroll-watcher 0.5s ease-in-out forwards;
		animation-timeline: scroll();
	}

	@keyframes scroll-watcher {
		0% {
			scale: 0 1;
		}
		100% {
			scale: 1 1;
		}
	}
</style>

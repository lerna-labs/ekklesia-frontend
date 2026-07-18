<script>
  import NetworkCheck from './../lib/base/NetworkCheck.svelte';
  import '../app.css';
  import '$lib/css/markdown.css';
  import Header from '$lib/base/Header.svelte';
  import Breadcrumbs from '$lib/base/Breadcrumbs.svelte';
  import VersionCheck from '$lib/base/VersionCheck.svelte';
  import Footer from '$lib/base/Footer.svelte';
  import PendingPackagesAlert from '$lib/PendingPackagesAlert.svelte';
  import { Toaster } from '$lib/components/ui/sonner/index.js';
  import PageHead from '$lib/base/PageHead.svelte';
  import { applyTheme } from '$lib/base/theme.js';

  let { children, data } = $props();
  const NETWORK_ID = import.meta.env.VITE_NETWORK_ID;

  let notice = $state(undefined);

  // Apply the deployment theme BEFORE children render so any component that
  // reads CSS vars at setup time (chart palettes, canvas strokeStyle, etc.)
  // sees the deployment's brand colours rather than the app.css fallbacks.
  // SSR/prerender: applyTheme() no-ops when document is undefined.
  applyTheme();
</script>

<Toaster />
<VersionCheck />

<div class="flex min-h-screen flex-col">
  {#if NETWORK_ID == 0}
    <NetworkCheck />
  {/if}

  {#if notice}
    <div class="w-full bg-brand p-2 text-center text-xs font-semibold uppercase text-brand-fg">
      {notice}
    </div>
  {/if}

  <PageHead />

  <!-- Header + breadcrumbs stick together so navigation context stays
	     visible while scrolling through long results / proposal pages. -->
  <div class="sticky top-0 z-[10] bg-header pt-4">
    <div class="scrollWatcher bg-brand"></div>
    <Header />
    <Breadcrumbs />
  </div>

  <!-- Main content with flex-grow to push footer down -->
  <main class="m-auto w-full max-w-3xl flex-grow p-4 pb-0 pt-6">
    <PendingPackagesAlert />
    <!-- Main content area -->
    {@render children()}
  </main>

  <!-- Footer will always be at bottom -->
  <Footer />
</div>

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
  }

  /* Scroll-driven progress strip — gated behind prefers-reduced-motion. */
  @media (prefers-reduced-motion: no-preference) {
    .scrollWatcher {
      animation: scroll-watcher 1s ease-in-out forwards;
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
  }
</style>

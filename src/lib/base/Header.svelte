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
  class="relative m-auto mb-4 flex max-w-3xl items-center justify-end p-4 pb-0 pt-4 text-header-foreground"
>
  <a href="/" class="flex-1">
    {#if useWordmark}
      <h1 class="mb-0 mt-0 p-0 text-3xl font-medium">{BRAND.name}</h1>
    {:else}
      <img
        src={candidates[logoIndex]}
        alt={BRAND.name}
        class="block h-10 w-auto"
        onerror={onLogoError}
      />
    {/if}
  </a>
  <Navigation />
</header>

<script>
  import { versionInfo } from '$stores/versionStore';
  import MarkdownBrief from './MarkdownBrief.svelte';
  import { content } from '$lib/content.js';

  const tagline = content.footer.tagline;
  const copyright = content.footer.copyright;
</script>

<!-- Footer shares the sticky-header chrome tokens so deployments only have
     to pick one "chamber" colour and the top + bottom of the page stay in
     visual lockstep. Muted variants step down via header-foreground alpha. -->
<div class="mt-auto w-full bg-header">
  <footer
    class="m-auto max-w-3xl items-center justify-between bg-header p-4 text-header-foreground"
  >
    {#if tagline}
      <div class="mb-8 mt-1 leading-7">
        <h3 class="font-medium">
          {tagline.data.name}
          {#if tagline.data.pronunciation}
            <span class="font-light">{tagline.data.pronunciation}</span>
          {/if}
        </h3>

        {#if tagline.body}
          <div class="text-light mb-4 italic">
            <MarkdownBrief markdown={tagline.body} inline />
          </div>
        {/if}
      </div>
    {/if}

    <div class="w-full items-center text-xs text-header-foreground/80 sm:flex sm:justify-between">
      <div class="mb-1">
        {#if copyright?.data.holder}
          &copy; {copyright.data.holder}{copyright.data.year ? ` ${copyright.data.year}` : ''} |
        {/if}
        Version {$versionInfo.version}
      </div>
      {#if $versionInfo.buildTime}
        <span class="ml-1 text-header-foreground/60">
          (Built: {new Date($versionInfo.buildTime).toLocaleDateString()})
        </span>
      {/if}
    </div>
  </footer>
</div>

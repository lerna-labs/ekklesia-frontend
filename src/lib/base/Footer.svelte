<script>
  import { versionInfo } from '$stores/versionStore';
  import MarkdownBrief from './MarkdownBrief.svelte';
  import { content } from '$lib/content.js';

  const tagline = content.footer.tagline;
  const copyright = content.footer.copyright;
</script>

<div class="mt-auto w-full bg-slate-900">
  <footer class="m-auto max-w-3xl items-center justify-between bg-slate-900 p-4 text-slate-300">
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

    <div class="w-full items-center text-xs text-slate-400 sm:flex sm:justify-between">
      <div class="mb-1">
        {#if copyright?.data.holder}
          &copy; {copyright.data.holder}{copyright.data.year ? ` ${copyright.data.year}` : ''} |
        {/if}
        Version {$versionInfo.version}
      </div>
      {#if $versionInfo.buildTime}
        <span class="ml-1 text-gray-500">
          (Built: {new Date($versionInfo.buildTime).toLocaleDateString()})
        </span>
      {/if}
    </div>
  </footer>
</div>

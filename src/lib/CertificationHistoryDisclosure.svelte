<script>
  import { convertTimestamp } from '$lib/utils.js';
  import { ChevronDown, FileText, CircleCheck, Link } from 'lucide-svelte';

  /**
   * @type {{
   *   history?: Array<{
   *     version: number,
   *     submittedAt: string,
   *     submittedBy?: string,
   *     source?: 'api' | 'chain',
   *     chainTxHash?: string | null,
   *     snapshotUrl?: string | null,
   *     snapshotHash?: string | null,
   *     narrativeOnly?: boolean,
   *     narrative?: { url: string, label?: string } | null
   *   }>
   * }}
   */
  let { history = [] } = $props();

  let open = $state(false);

  // Most-recent first. Backend orders already, but don't trust it.
  const entries = $derived.by(() => {
    const list = Array.isArray(history) ? [...history] : [];
    list.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    return list;
  });
</script>

{#if entries.length > 0}
  <section class="mt-6 rounded-md border border-slate-200 bg-slate-50/60 text-sm">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
      onclick={() => (open = !open)}
    >
      <span>Certification history ({entries.length})</span>
      <ChevronDown class="h-4 w-4 transition-transform {open ? 'rotate-180' : ''}" />
    </button>

    {#if open}
      <ol class="divide-y divide-slate-200 border-t border-slate-200">
        {#each entries as entry (entry.version)}
          <li class="flex items-start gap-3 px-3 py-3">
            <div class="mt-0.5 shrink-0">
              {#if entry.narrativeOnly}
                <FileText class="h-4 w-4 text-sky-700" aria-hidden="true" />
              {:else}
                <CircleCheck class="h-4 w-4 text-emerald-700" aria-hidden="true" />
              {/if}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline gap-x-2">
                <span class="font-semibold">v{entry.version}</span>
                <span class="text-xs text-muted-foreground">
                  {convertTimestamp(entry.submittedAt)}
                </span>
                {#if entry.narrativeOnly}
                  <span
                    class="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-800"
                  >
                    Narrative-only
                  </span>
                {/if}
                {#if entry.source === 'chain'}
                  <span
                    class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-800"
                  >
                    On-chain
                  </span>
                {/if}
              </div>

              {#if entry.narrative?.url}
                <a
                  href={entry.narrative.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-1 inline-flex items-center gap-1 text-xs underline decoration-slate-400 hover:decoration-slate-700"
                >
                  <Link class="h-3 w-3" aria-hidden="true" />
                  {entry.narrative.label || 'Narrative link'}
                </a>
              {/if}

              {#if entry.snapshotUrl}
                <div class="mt-1 text-xs">
                  <a
                    href={entry.snapshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline decoration-slate-400 hover:decoration-slate-700"
                  >
                    Snapshot
                  </a>
                  {#if entry.snapshotHash}
                    <span class="ml-1 font-mono text-muted-foreground">
                      {entry.snapshotHash.slice(0, 10)}…{entry.snapshotHash.slice(-6)}
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ol>
    {/if}
  </section>
{/if}

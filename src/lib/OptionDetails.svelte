<script>
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Info, ExternalLink } from 'lucide-svelte';

	/**
	 * Per-option "More info" trigger + modal. Renders a small info link
	 * alongside an option row; clicking opens a dialog with the option's
	 * richer metadata (image, full description, reference link, cost,
	 * and any free-form `metadata.*` keys) — as spec'd in
	 * `.claude/trds/VOTE_OPTIONS_V1.md`.
	 *
	 * The trigger only renders when the option actually carries
	 * extra-information fields. A bare `{id, label}` option gets no
	 * link, so lists stay terse.
	 *
	 * @typedef {object} Props
	 * @property {{
	 *   id: number | string,
	 *   label: string,
	 *   cost?: number,
	 *   description?: string,
	 *   referenceUrl?: string,
	 *   imageUrl?: string,
	 *   metadata?: Record<string, unknown>
	 * }} option
	 * @property {string | null} [capacityUnits] — human-readable unit for
	 *   cost (e.g. "engineer-months"). Threads through from the ballot's
	 *   `proposal.data.capacityUnits` when present.
	 */

	/** @type {Props} */
	let { option, capacityUnits = null } = $props();

	let open = $state(false);

	const hasDescription = $derived(
		typeof option?.description === 'string' && option.description.trim().length > 0
	);
	const hasReferenceUrl = $derived(
		typeof option?.referenceUrl === 'string' && option.referenceUrl.trim().length > 0
	);
	const hasImage = $derived(
		typeof option?.imageUrl === 'string' && option.imageUrl.trim().length > 0
	);
	const hasCost = $derived(option?.cost != null && Number.isFinite(Number(option.cost)));

	const metadataEntries = $derived.by(() => {
		const m = option?.metadata;
		if (!m || typeof m !== 'object') return [];
		return Object.entries(m).filter(([, v]) => v != null && v !== '');
	});
	const hasMetadata = $derived(metadataEntries.length > 0);

	const hasExtras = $derived(
		hasDescription || hasReferenceUrl || hasImage || hasMetadata
	);

	// Prettify metadata keys: camelCase + snake_case → "Title Case Words".
	function humanizeKey(k) {
		const withSpaces = String(k)
			.replace(/[_-]+/g, ' ')
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.trim();
		return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
	}

	function formatValue(v) {
		if (v == null) return '';
		if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
			return String(v);
		}
		try {
			return JSON.stringify(v, null, 2);
		} catch {
			return String(v);
		}
	}
</script>

{#if hasExtras}
	<Dialog.Root bind:open>
		<Dialog.Trigger
			class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-slate-100 hover:text-slate-900"
			aria-label="More info about {option.label}"
		>
			<Info class="h-3 w-3" aria-hidden="true" />
			More info
		</Dialog.Trigger>
		<Dialog.Content class="max-h-[85vh] max-w-lg overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title class="text-base">{option.label}</Dialog.Title>
			</Dialog.Header>

			<div class="space-y-4 text-sm">
				{#if hasImage}
					<div class="flex justify-center">
						<img
							src={option.imageUrl}
							alt=""
							class="max-h-40 rounded-md border border-slate-200 object-contain"
							onerror={(e) => (e.currentTarget.style.display = 'none')}
						/>
					</div>
				{/if}

				{#if hasDescription}
					<p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
						{option.description}
					</p>
				{/if}

				{#if hasReferenceUrl}
					<div>
						<Button
							variant="outline"
							size="sm"
							as="a"
							href={option.referenceUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1"
						>
							Learn more
							<ExternalLink class="h-3 w-3" aria-hidden="true" />
						</Button>
					</div>
				{/if}

				{#if hasCost}
					<div class="flex items-baseline gap-2 border-t pt-3 text-xs">
						<span class="font-semibold text-slate-700">Cost:</span>
						<span class="font-mono tabular-nums">
							{option.cost}{capacityUnits ? ` ${capacityUnits}` : ''}
						</span>
					</div>
				{/if}

				{#if hasMetadata}
					<div class="border-t pt-3">
						<div class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
							Additional information
						</div>
						<dl class="space-y-2 text-xs">
							{#each metadataEntries as [key, value]}
								<div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
									<dt class="whitespace-nowrap font-semibold text-slate-700">
										{humanizeKey(key)}
									</dt>
									<dd class="whitespace-pre-wrap break-words text-slate-700">
										{#if typeof value === 'object' && value !== null}
											<pre
												class="m-0 max-h-40 overflow-auto rounded bg-slate-50 p-2 font-mono text-[11px]">{formatValue(
													value
												)}</pre>
										{:else}
											{formatValue(value)}
										{/if}
									</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

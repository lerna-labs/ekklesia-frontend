<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import markdownit from 'markdown-it';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';
	let { text, clamp, class: className } = $props();
	const md = markdownit();
	md.linkify.set({ fuzzyEmail: false });
	
	// Configure link renderer to open external links in new window
	const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
		return self.renderToken(tokens, idx, options);
	};
	
	md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		const hrefIndex = token.attrIndex('href');
		
		if (hrefIndex >= 0) {
			const href = token.attrs[hrefIndex][1];
			// Check if it's an external link (starts with http:// or https://)
			if (href.startsWith('http://') || href.startsWith('https://')) {
				// Add target="_blank" and rel="noopener noreferrer"
				token.attrSet('target', '_blank');
				token.attrSet('rel', 'noopener noreferrer');
			}
		}
		
		return defaultRender(tokens, idx, options, env, self);
	};
	
	let el = $state(null);
	const content = $derived.by(() => md.render(text));

	let isClamped = $state(false);
	let isExpanded = $state(false);
	
	$effect(() => {
		if (el && !isExpanded) {
			isClamped = el.scrollHeight > el.clientHeight;
		}
	});

	function showMore() {
		if (el && clamp) {
			el.classList.remove(`line-clamp-${clamp}`);
			isExpanded = true;
		}
	}

	async function showLess() {
		if (el && clamp) {
			el.classList.add(`line-clamp-${clamp}`);
			isExpanded = false;
			// Wait for DOM to update, then re-check clamped state
			await tick();
			if (el) {
				isClamped = el.scrollHeight > el.clientHeight;
			}
		}
	}
</script>

<section bind:this={el} class={cn('markdown-content', className, clamp && !isExpanded && `line-clamp-${clamp}`)}>
	{@html content}
</section>	
{#if clamp && isClamped && !isExpanded}
	<button class="text-xs text-orange-600 hover:text-orange-700 p-0 m-0" onclick={showMore}>Show more</button>
{:else if clamp && isExpanded}
	<button class="text-xs text-orange-600 hover:text-orange-700 p-0 m-0" onclick={showLess}>Show less</button>
{/if}
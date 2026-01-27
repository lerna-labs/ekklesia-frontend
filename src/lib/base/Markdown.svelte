<script>
	import markdownit from 'markdown-it';
	import { cn } from '$lib/utils.js';
	import { tick } from 'svelte';

	let { text, clamp, class: className } = $props();

	// Initialize markdown-it and configure external links to open in new window
	const md = markdownit();
	const defaultLinkRender = md.renderer.rules.link_open || ((tokens, idx, options, env, self) =>
		self.renderToken(tokens, idx, options)
	);

	md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
		const token = tokens[idx];
		const hrefIndex = token.attrIndex('href');

		if (hrefIndex >= 0) {
			const href = token.attrs[hrefIndex][1];
			if (href.startsWith('http://') || href.startsWith('https://')) {
				token.attrSet('target', '_blank');
				token.attrSet('rel', 'noopener noreferrer');
			}
		}

		return defaultLinkRender(tokens, idx, options, env, self);
	};

	let el = $state(null);
	const content = $derived.by(() => md.render(text));
	const clampClass = $derived(clamp ? `line-clamp-${clamp}` : null);

	let isClamped = $state(false);
	let isExpanded = $state(false);

	// Check if content is clamped when element, content, or expanded state changes
	$effect(() => {
		if (!clamp || isExpanded || !el || !content) {
			isClamped = false;
			return;
		}

		const checkClamped = async () => {
			await tick();
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (el && !isExpanded && clamp) {
						isClamped = el.scrollHeight > el.clientHeight;
					}
				});
			});
		};

		checkClamped();
	});

	function showMore() {
		if (el && clampClass) {
			el.classList.remove(clampClass);
			isExpanded = true;
		}
	}

	async function showLess() {
		if (el && clampClass) {
			el.classList.add(clampClass);
			isExpanded = false;
			await tick();
			if (el) {
				isClamped = el.scrollHeight > el.clientHeight;
			}
		}
	}
</script>

<section bind:this={el} class={cn('markdown-content', className, !isExpanded && clampClass)}>
	{@html content}
</section>

{#if clamp && isClamped && !isExpanded}
	<button class="text-xs text-orange-600 hover:text-orange-700 p-0 m-0" onclick={showMore}>
		Show more
	</button>
{:else if clamp && isExpanded}
	<button class="text-xs text-orange-600 hover:text-orange-700 p-0 m-0" onclick={showLess}>
		Show less
	</button>
{/if}
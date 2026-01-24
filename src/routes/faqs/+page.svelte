<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import Markdown from '$lib/base/Markdown.svelte';
	import Search from '$lib/base/Search.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
	import { X } from 'lucide-svelte';

	let { data } = $props();

	// Filter FAQs based on selected tag (search is handled by API)
	const filteredFAQs = $derived.by(() => {
		if (!data.selectedTag) {
			return data.faqs;
		}
		return data.faqs.filter((faq) => {
			return faq.tags && Array.isArray(faq.tags) && faq.tags.includes(data.selectedTag);
		});
	});

	function handleTagClick(tag) {
		const url = new URL(window.location.href);
		
		if (tag === data.selectedTag) {
			// Clear tag filter if clicking the same tag
			url.searchParams.delete('tag');
		} else {
			// Set new tag filter
			url.searchParams.set('tag', tag);
		}
		
		// Preserve search parameter
		goto(url.toString(), { replaceState: true });
	}

	function clearFilter() {
		const url = new URL(window.location.href);
		url.searchParams.delete('tag');
		// Preserve search parameter
		goto(url.toString(), { replaceState: true });
	}
</script>

<section class="mb-8">
	<div class="mb-6">
		<h1 class="mb-4">Frequently Asked Questions</h1>
		
		<p class="mb-4">
			Find answers to common questions about Ekklesia, voting, wallets, and more. Use the search bar below to search for specific topics, or filter by tags to browse FAQs by category.
		</p>
		
		<div class="mb-4">
			<Search />
		</div>
		
		{#if data.tags && data.tags.length > 0}
			<div class="mb-4 flex flex-wrap gap-1">
				{#each data.tags as tag}
					<span
						class="text-xs rounded-full bg-white border border-border px-2 py-0.5 text-foreground cursor-pointer transition-opacity hover:opacity-80 {data.selectedTag === tag ? 'bg-foreground text-background border-foreground' : ''}"
						onclick={() => handleTagClick(tag)}
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleTagClick(tag);
							}
						}}
					>
						{tag}
					</span>
				{/each}
				{#if data.selectedTag}
					<span
						class="text-xs rounded-full bg-orange-500 border border-orange-500 px-2 py-0.5 text-white cursor-pointer transition-opacity hover:opacity-80"
						onclick={clearFilter}
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								clearFilter();
							}
						}}
					>
						Clear
					</span>
				{/if}
			</div>
		{/if}


	</div>

	{#if filteredFAQs.length === 0}
		<p class="text-muted-foreground">
			{#if data.search && data.selectedTag}
				No FAQs found matching "{data.search}" with tag "{data.selectedTag}".
			{:else if data.search}
				No FAQs found matching "{data.search}".
			{:else if data.selectedTag}
				No FAQs found for the selected tag.
			{:else}
				No FAQs available.
			{/if}
		</p>
	{:else}
		<Accordion.Root type="multiple">
			{#each filteredFAQs as faq (faq._id)}
				<Accordion.Item value={faq._id}>
					<Accordion.Trigger class="text-left">
						{faq.title}
					</Accordion.Trigger>
					<Accordion.Content>
                        <Markdown markdown={faq.content} />
						{#if faq.tags && faq.tags.length > 0}
							<div class="mb-3 flex flex-wrap gap-1">
								{#each faq.tags as tag}
									{#if tag === data.selectedTag}
										<span class="text-xs rounded-full bg-white border border-border px-2 py-0.5 text-foreground transition-opacity hover:opacity-80"
                                        >
											{tag}
										</span>
									{:else}
										<span
											class="text-xs rounded-full bg-white border border-border px-2 py-0.5 text-foreground cursor-pointer transition-opacity hover:opacity-80"
											onclick={() => handleTagClick(tag)}
											role="button"
											tabindex="0"
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													handleTagClick(tag);
												}
											}}
										>
											{tag}
										</span>
									{/if}
								{/each}
							</div>
						{/if}
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{/if}
</section>

<Card.Root class="mt-8 mb-16">
	<Card.Header>
		<Card.Title>Still have questions?</Card.Title>
		<Card.Description>
			<p class="mb-4">
				If you couldn't find the answer you're looking for, please reach out to Intersect through their official communication channels:
			</p>
			<div class="flex flex-wrap gap-2 mb-4">
				<Button
					href="https://x.com/IntersectMBO"
					target="_blank"
					rel="noopener noreferrer"
					size="sm"
				>
					X (Twitter)
				</Button>
				<Button
					href="https://t.me/IntersectCBC"
					target="_blank"
					rel="noopener noreferrer"
					size="sm"
				>
					Telegram
				</Button>
				<Button
					href="https://discord.com/channels/1136727663583698984/1243451569492725760"
					target="_blank"
					rel="noopener noreferrer"
					size="sm"
				>
					Discord
				</Button>
			</div>
		</Card.Description>
	</Card.Header>
	<Card.Footer>
		<p class="text-sm text-muted-foreground">
			All polls on this platform are run by <a href="https://intersectmbo.org" target="_blank" class="link" rel="noopener noreferrer">Intersect</a>. For questions or issues related to voting, please refer to their official channels above.
		</p>
	</Card.Footer>
</Card.Root>

<style>
	:global(section button[data-state]) {
		display: flex;
		flex: 1 1 0%;
		align-items: center;
		justify-content: space-between;
		padding-top: 1rem;
		padding-bottom: 1rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		transition-property: all;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 150ms;
	}

	:global(section button[data-state="open"] > svg) {
		transform: rotate(180deg);
	}
</style>

<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { api } from '$stores/sessionManager.js';
	import Markdown from '$lib/base/Markdown.svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	let faqs = $state([]);
	let loading = $state(true);
	let error = $state(null);

	async function fetchFAQs() {
		try {
			loading = true;
			error = null;
			const response = await api.fetch(fetch, '/faqs?featured=true');
			if (!response.ok) {
				throw new Error('Failed to fetch FAQs');
			}
			const data = await response.json();
			faqs = Array.isArray(data) ? data : data.faqs || data.data || [];
		} catch (err) {
			console.error('Error fetching FAQs:', err);
			error = err.message || 'Failed to load FAQs';
			faqs = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchFAQs();
	});
</script>

<section class="mb-8">
	<h3>FAQs & Help</h3>

	{#if loading}
		<p class="text-muted-foreground">Loading FAQs...</p>
	{:else if error}
		<p class="text-red-600">Error: {error}</p>
	{:else if faqs.length === 0}
		<p class="text-muted-foreground">No FAQs available.</p>
	{:else}
		<Accordion.Root type="multiple">
			{#each faqs as faq (faq._id)}
				<Accordion.Item value={faq._id}>
					<Accordion.Trigger class="text-left">{faq.title}</Accordion.Trigger>
					<Accordion.Content>
						<!-- <div class="faq-content">
							{@html md.render(faq.answer)}
						</div> -->
						<Markdown markdown={faq.content} />
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{/if}

	<div class="mt-4">
		<Button href="/faqs" size="sm">View All FAQs</Button>
	</div>
</section>

<style>
	:global(.faq-content) {
		font-size: 0.9rem;
		line-height: 1.6;
	}

	:global(.faq-content p) {
		margin-bottom: 1rem;
	}

	:global(.faq-content p:last-child) {
		margin-bottom: 0;
	}

	:global(.faq-content a) {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	:global(.faq-content a:hover) {
		opacity: 0.8;
	}

	:global(.faq-content strong) {
		font-weight: 600;
	}
</style>

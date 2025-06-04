<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import markdownit from 'markdown-it';
	import { onMount } from 'svelte';

	const md = markdownit();
	let { markdown } = $props();

	const content = md.render(markdown);
	let accordionSections = $state([]);

	onMount(() => {
		// Create a temporary div to hold rendered markdown
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = content;

		// Find all h2 elements
		const h2Elements = tempDiv.querySelectorAll('h2');

		if (h2Elements.length > 0) {
			let tempSections = [];
			// Create sections based on h2 elements
			h2Elements.forEach((h2, index) => {
				// Get the header text
				const title = h2.textContent;
				let sectionContent = '';
				let currentNode = h2.nextSibling;

				// Collect all content until the next h2 or end
				while (currentNode && currentNode.tagName !== 'H2') {
					const tempDiv = document.createElement('div');
					tempDiv.appendChild(currentNode.cloneNode(true));
					sectionContent += tempDiv.innerHTML;
					currentNode = currentNode.nextSibling;
				}

				tempSections.push({
					id: `section-${index}`,
					title: title,
					content: sectionContent
				});
			});

			// Update the reactive state variable with all sections at once
			accordionSections = tempSections;
		}
	});
</script>

<section class="markdown-content">
	{#if accordionSections.length > 0}
		<Accordion.Root type="single" collapsible multiple>
			{#each accordionSections as section}
				<Accordion.Item value={section.id}>
					<Accordion.Trigger>{section.title}</Accordion.Trigger>
					<Accordion.Content>
						{@html section.content}
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{/if}
</section>

<style>
	:global(.markdown-content) {
		font-size: 1rem;
		line-height: 1.6;
	}
	:global(.markdown-content h1) {
		margin-top: auto;
		font-weight: 400;
	}

	:global(.markdown-content h2) {
		font-size: 1.25rem;
		font-weight: 400;
	}

	:global(.markdown-content h3) {
		font-size: 1rem;
		font-weight: 400;
	}

	:global(.markdown-content p) {
		margin-bottom: 1rem;
	}

	:global(.markdown-content ul),
	:global(.markdown-content ol) {
		margin-left: 1rem;
		margin-bottom: 1rem;
		padding-left: 0.5rem;
	}

	:global(.markdown-content li) {
		margin-bottom: 0.5rem;
	}

	:global(.markdown-content ul li) {
		list-style-type: disc;
	}

	/* Table styles */
	:global(.markdown-content table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}

	:global(.markdown-content th) {
		background-color: #f5f5f5;
		font-weight: 600;
		text-align: left;
		padding: 0.75rem 1rem;
		border: 1px solid #e0e0e0;
	}

	:global(.markdown-content td) {
		padding: 0.75rem 1rem;
		border: 1px solid #e0e0e0;
		vertical-align: top;
	}

	:global(.markdown-content tr:nth-child(even)) {
		background-color: #fafafa;
	}

	:global(.markdown-content table code) {
		background-color: rgba(0, 0, 0, 0.05);
		padding: 0.2em 0.4em;
		border-radius: 3px;
		font-size: 0.9em;
	}
</style>

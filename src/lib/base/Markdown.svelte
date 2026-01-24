<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import markdownit from 'markdown-it';

	const md = markdownit();
	let { markdown } = $props();

	const content = $derived.by(() => md.render(markdown));
	let accordionSections = $state([]);
	let pageTitle = $state('');

	$effect(() => {
		// Create a temporary div to hold rendered markdown
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = content;

		// Check for h1 element first
		const h1Element = tempDiv.querySelector('h1');
		if (h1Element) {
			pageTitle = h1Element.textContent;
			// Remove the h1 from the content to avoid duplication
			h1Element.remove();
		}

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
	{#if pageTitle}
		<h1>{pageTitle}</h1>
	{/if}

	{#if accordionSections.length > 0}
		<Accordion.Root type="multiple">
			{#each accordionSections as section}
				<Accordion.Item value={section.id}>
					<Accordion.Trigger>{section.title}</Accordion.Trigger>
					<Accordion.Content>
						{@html section.content}
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{:else}
		{@html content}
	{/if}
</section>

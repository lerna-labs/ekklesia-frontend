<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import MarkdownBrief from '$lib/base/MarkdownBrief.svelte';
	import { content } from '$lib/content.js';

	const faqs = content.faqs;
</script>

{#if faqs.length > 0}
	<section class="mb-8">
		<h3>FAQs &amp; Help</h3>

		<Accordion.Root type="multiple">
			{#each faqs as faq, i}
				<Accordion.Item value={`faq-${i}`}>
					<Accordion.Trigger class="text-left">{faq.data.question}</Accordion.Trigger>
					<Accordion.Content>
						<MarkdownBrief markdown={faq.body} />
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</section>
{/if}

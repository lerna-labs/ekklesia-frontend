<script>
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import markdownit from 'markdown-it';
	import { applyExternalLinkDecoration } from './markdownLinks.js';

	// Long-form markdown renderer for proposal detail pages. Each call site
	// nests this component under a real page-level heading (the section's
	// h2 — "Summary", "Rationale", etc.), so authored markdown headings
	// must be offset to keep the document outline coherent.
	//
	// `headingStartLevel` is the level MD H1 should land at; H2..H6 follow
	// at +1 each, clamped at h6. Default of 3 matches the proposal-detail
	// page (page H1 = proposal title → section H2 = "Summary"/etc. → MD
	// H1 demoted to h3).
	//
	// When the markdown contains "section dividers" (MD H2 — i.e. headings
	// one level under the demoted-doc-title), we extract them into an
	// Accordion so long rationales stay scannable. Anything before the
	// first section divider renders above the accordion (this used to be
	// silently dropped).
	let { markdown, headingStartLevel = 3 } = $props();

	// Build a markdown-it instance that demotes headings. Re-derive when
	// headingStartLevel changes so a parent can drive different scoping
	// per call site.
	const md = $derived.by(() => {
		const inst = markdownit({ linkify: true });
		const offset = Math.max(1, Math.min(6, headingStartLevel)) - 1;
		inst.renderer.rules.heading_open = function (tokens, idx) {
			const mdLevel = Number(tokens[idx].tag.slice(1));
			const level = Math.min(6, mdLevel + offset);
			tokens[idx].tag = `h${level}`;
			return `<h${level}>`;
		};
		inst.renderer.rules.heading_close = function (tokens, idx) {
			const tag = tokens[idx].tag || 'h6';
			return `</${tag}>`;
		};
		applyExternalLinkDecoration(inst);
		return inst;
	});

	const content = $derived(md.render(String(markdown ?? '')));

	// "Section divider" level — what MD H2 demotes to. Accordion sections
	// are split on this level.
	const sectionLevel = $derived(Math.min(6, headingStartLevel + 1));
	const sectionTag = $derived(`H${sectionLevel}`);

	let preSectionHTML = $state('');
	let accordionSections = $state([]);

	$effect(() => {
		// DOM-based post-processing — only runs client-side (the app is
		// SPA-only, no SSR). Re-runs when `content` or `sectionTag` change
		// so navigating between proposals or shifting startLevel rebuilds
		// the section split.
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = content;

		const sectionEls = tempDiv.querySelectorAll(sectionTag.toLowerCase());

		if (sectionEls.length === 0) {
			preSectionHTML = '';
			accordionSections = [];
			return;
		}

		// Capture content before the first section divider — a real
		// document might lead with intro paragraphs (or a demoted MD H1
		// title) before the first H2. The previous version of this
		// component dropped that content on the floor.
		let preHTML = '';
		let preNode = tempDiv.firstChild;
		while (preNode && preNode !== sectionEls[0]) {
			const wrapper = document.createElement('div');
			wrapper.appendChild(preNode.cloneNode(true));
			preHTML += wrapper.innerHTML;
			preNode = preNode.nextSibling;
		}
		preSectionHTML = preHTML;

		const tempSections = [];
		sectionEls.forEach((sectionEl, index) => {
			const title = sectionEl.textContent;
			let sectionContent = '';
			let cursor = sectionEl.nextSibling;
			while (cursor && cursor.tagName !== sectionTag) {
				const wrapper = document.createElement('div');
				wrapper.appendChild(cursor.cloneNode(true));
				sectionContent += wrapper.innerHTML;
				cursor = cursor.nextSibling;
			}
			tempSections.push({
				id: `section-${index}`,
				title,
				content: sectionContent
			});
		});
		accordionSections = tempSections;
	});
</script>

<section class="markdown-content">
	{#if accordionSections.length > 0}
		{#if preSectionHTML}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html preSectionHTML}
		{/if}
		<Accordion.Root type="multiple">
			{#each accordionSections as section}
				<Accordion.Item value={section.id}>
					<Accordion.Trigger>{section.title}</Accordion.Trigger>
					<Accordion.Content>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html section.content}
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{:else}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html content}
	{/if}
</section>

<style>
	:global(.markdown-content) {
		font-size: 0.875rem;
		line-height: 1.4;
		font-family: 'Geist', sans-serif;
	}

	/* Demoted heading sizes. With the default headingStartLevel=3, MD H1
	   becomes h3 (the doc-title equivalent), MD H2 becomes h4 (sub-section
	   divider — usually consumed by the accordion), MD H3..H6 become
	   h5..h6 (clamped). Sizes step down so authored hierarchy reads
	   correctly even when the section's own h2 sits above. */
	:global(.markdown-content h3) {
		font-size: 1.125rem;
		font-weight: 500;
		margin: 0.25rem 0 0.5rem 0;
	}

	:global(.markdown-content h4) {
		font-size: 1rem;
		font-weight: 500;
		margin: 0.5rem 0 0.4rem 0;
	}

	:global(.markdown-content h5),
	:global(.markdown-content h6) {
		font-size: 0.9375rem;
		font-weight: 500;
		margin: 0.5rem 0 0.4rem 0;
	}

	:global(.markdown-content strong) {
		font-weight: 600;
	}

	:global(.markdown-content em) {
		font-style: italic;
	}

	:global(.markdown-content p) {
		margin-bottom: 1rem;
		line-height: 1.4;
	}

	/* Authored links — same brand treatment as MarkdownBrief so voters
	   reading a rationale see "supporting links" stand out. Brand text
	   with a soft (50% opacity) brand underline; on hover the underline
	   pulls up to match the text. */
	:global(.markdown-content a) {
		color: hsl(var(--brand-hover));
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-color: hsl(var(--brand) / 0.5);
	}
	:global(.markdown-content a:hover) {
		text-decoration-color: hsl(var(--brand-hover));
	}

	/* Trailing ExternalLink glyph injected by `applyExternalLinkDecoration`.
	   Sized to match the link's text and aligned slightly above baseline so
	   it reads as a meta-affordance rather than punctuation. */
	:global(.markdown-content .md-external-icon) {
		display: inline-block;
		width: 0.875em;
		height: 0.875em;
		margin-left: 0.2em;
		vertical-align: -0.1em;
	}

	:global(.markdown-content ul),
	:global(.markdown-content ol) {
		margin-left: 1rem;
		margin-bottom: 1.5rem;
		padding-left: 0.5rem;
	}

	:global(.markdown-content li) {
		margin-bottom: 0.5rem;
	}

	:global(.markdown-content ul li) {
		list-style-type: square;
	}

	:global(.markdown-content ol li) {
		list-style-type: decimal;
	}

	/* Nested lists */
	:global(.markdown-content ol ol li) {
		list-style-type: lower-alpha;
	}

	:global(.markdown-content ol ol ol li) {
		list-style-type: lower-roman;
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

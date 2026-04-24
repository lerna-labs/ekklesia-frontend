<script>
	import markdownit from 'markdown-it';

	// Short-form markdown for ballot descriptions and similar prose. Differs
	// from the sibling `Markdown.svelte` (which splits long documents into
	// h2-driven accordion sections): this one renders the string inline with
	// a restricted syntax surface. No headings, no images, no raw HTML — just
	// emphasis, links, lists, and code.
	//
	// External links open in a new tab with noopener+noreferrer to keep tab-
	// nabbing and Referer leakage off the table for destinations the voting
	// authority linked to.
	let { markdown, class: klass = '', inline = false } = $props();

	const md = markdownit({
		html: false,
		breaks: false,
		linkify: true,
		typographer: false
	});

	// Strip block elements that would visually dominate a short description.
	// `inline` is the tightest variant — used in list cards where lists,
	// blockquotes, and code blocks would push the card height around. Inline
	// emphasis, links, and inline `code` still render.
	const disabled = ['heading', 'image', 'hr'];
	if (inline) disabled.push('list', 'blockquote', 'code', 'fence');
	md.disable(disabled);

	const defaultLinkOpen =
		md.renderer.rules.link_open ||
		function (tokens, idx, options, env, self) {
			return self.renderToken(tokens, idx, options);
		};
	md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
		const token = tokens[idx];
		const setAttr = (name, value) => {
			const i = token.attrIndex(name);
			if (i < 0) token.attrPush([name, value]);
			else token.attrs[i][1] = value;
		};
		setAttr('target', '_blank');
		setAttr('rel', 'noopener noreferrer');
		return defaultLinkOpen(tokens, idx, options, env, self);
	};

	const html = $derived(md.render(String(markdown ?? '')));
</script>

<div class="md-brief {klass}">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>

<style>
	:global(.md-brief) {
		font-size: 0.875rem;
		line-height: 1.5;
	}
	:global(.md-brief p) {
		margin: 0 0 0.75rem 0;
	}
	:global(.md-brief p:last-child) {
		margin-bottom: 0;
	}
	:global(.md-brief strong) {
		font-weight: 600;
	}
	:global(.md-brief em) {
		font-style: italic;
	}
	:global(.md-brief a) {
		color: rgb(234 88 12); /* orange-600 — matches the brand link color */
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-color: rgb(253 186 116); /* orange-300 */
	}
	:global(.md-brief a:hover) {
		text-decoration-color: rgb(234 88 12);
	}
	:global(.md-brief ul),
	:global(.md-brief ol) {
		margin: 0 0 0.75rem 0;
		padding-left: 1.25rem;
	}
	:global(.md-brief ul) {
		list-style-type: disc;
	}
	:global(.md-brief ol) {
		list-style-type: decimal;
	}
	:global(.md-brief li) {
		margin: 0.25rem 0;
	}
	:global(.md-brief li > p) {
		/* markdown-it wraps list items in <p> when blank lines separate items */
		margin: 0;
	}
	:global(.md-brief code) {
		background-color: rgb(241 245 249); /* slate-100 */
		padding: 0.1em 0.35em;
		border-radius: 3px;
		font-size: 0.85em;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
	}
	:global(.md-brief pre) {
		background-color: rgb(241 245 249);
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0 0 0.75rem 0;
	}
	:global(.md-brief pre code) {
		background: transparent;
		padding: 0;
	}
	:global(.md-brief blockquote) {
		border-left: 3px solid rgb(203 213 225); /* slate-300 */
		margin: 0 0 0.75rem 0;
		padding: 0 0 0 0.75rem;
		color: rgb(71 85 105); /* slate-600 */
	}
</style>

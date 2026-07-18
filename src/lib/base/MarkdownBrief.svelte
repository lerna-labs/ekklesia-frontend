<script>
  import markdownit from 'markdown-it';
  import { applyExternalLinkDecoration } from './markdownLinks.js';

  // Short-form markdown for ballot descriptions and similar prose. Differs
  // from the sibling `Markdown.svelte` (which splits long documents into
  // h2-driven accordion sections): this one renders the string inline with
  // a restricted syntax surface. No images, no raw HTML — just emphasis,
  // links, lists, code, and (depending on `headings`) either flattened
  // pseudo-headings or properly demoted heading elements.
  //
  // `headings` controls how authored `#`-headings render:
  //   - 'disabled' (default): heading tokens are stripped entirely.
  //   - 'flatten':  rendered as `<p class="md-flat-heading">` — visually
  //                 bold but with no semantic heading role. Use inside
  //                 cards where a real heading would muddy the page
  //                 outline (the card title is itself a heading).
  //   - 'demote':   rendered as real heading elements, offset so MD H1
  //                 becomes `<h{headingStartLevel}>`. Use in long-form
  //                 description blocks that sit beneath a known page
  //                 heading. Levels are clamped at h6.
  //
  // `breaks` enables markdown-it's soft-break-to-`<br>` mode — useful for
  // migrating raw text fields where authors used single newlines for
  // visual line breaks (proposal summaries, etc.).
  //
  // External links open in a new tab with noopener+noreferrer to keep tab-
  // nabbing and Referer leakage off the table for destinations the voting
  // authority linked to.
  let {
    markdown,
    class: klass = '',
    inline = false,
    headings = 'disabled',
    headingStartLevel = 2,
    breaks = false,
  } = $props();

  // Rebuild the markdown-it instance whenever a config-shaping prop
  // changes. In practice these props are static at the call site, but
  // reading reactive state inside a $derived closure keeps the Svelte 5
  // compiler happy and lets parents pass dynamic values if they ever
  // need to.
  const md = $derived.by(() => {
    const inst = markdownit({
      html: false,
      breaks,
      linkify: true,
      typographer: false,
    });

    // Strip block elements that would visually dominate a short
    // description. `inline` is the tightest variant — used in cards
    // where blockquotes and fenced/indented code blocks would push the
    // card height around. Lists are kept (authors often use bullets
    // in summaries); inline emphasis, links, and inline `code` still
    // render.
    const disabled = ['image', 'hr'];
    if (headings === 'disabled') disabled.push('heading');
    if (inline) disabled.push('blockquote', 'code', 'fence');
    inst.disable(disabled);

    applyExternalLinkDecoration(inst);

    if (headings === 'flatten') {
      inst.renderer.rules.heading_open = function () {
        return '<p class="md-flat-heading">';
      };
      inst.renderer.rules.heading_close = function () {
        return '</p>';
      };
    } else if (headings === 'demote') {
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
    }

    return inst;
  });

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
    color: hsl(var(--brand-hover));
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: hsl(var(--brand) / 0.5);
  }
  :global(.md-brief a:hover) {
    text-decoration-color: hsl(var(--brand-hover));
  }

  /* Trailing ExternalLink glyph injected by `applyExternalLinkDecoration`.
	   `currentColor` keeps the icon in step with the link text — orange in
	   `.md-brief`, whatever the surrounding type color is otherwise. */
  :global(.md-brief .md-external-icon) {
    display: inline-block;
    width: 0.875em;
    height: 0.875em;
    margin-left: 0.2em;
    vertical-align: -0.1em;
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
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
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

  /* Flattened pseudo-headings: bold paragraph, no semantic heading role.
	   Used inside cards where the card title is already the heading. */
  :global(.md-brief .md-flat-heading) {
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
  }

  /* Demoted real headings — visually subdued so they read as "subsection
	   labels" within a description block rather than competing with the
	   page-level headings above. Semantic level (h2..h6) is preserved for
	   screen readers and the document outline. */
  :global(.md-brief h1),
  :global(.md-brief h2) {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0.5rem 0 0.5rem 0;
    line-height: 1.3;
  }
  :global(.md-brief h3) {
    font-size: 1rem;
    font-weight: 600;
    margin: 0.5rem 0 0.4rem 0;
    line-height: 1.3;
  }
  :global(.md-brief h4),
  :global(.md-brief h5),
  :global(.md-brief h6) {
    font-size: 0.9375rem;
    font-weight: 600;
    margin: 0.5rem 0 0.4rem 0;
    line-height: 1.3;
  }
</style>

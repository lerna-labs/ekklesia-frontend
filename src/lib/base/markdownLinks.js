// Shared link-decoration helper for the markdown renderers
// (`Markdown.svelte` and `MarkdownBrief.svelte`). Authored markdown links
// in ballot/proposal copy are practically always outbound — supporting
// docs, IPFS gateways, partner sites — so we apply a uniform treatment:
//
//   1. force `target="_blank"` + `rel="noopener noreferrer"` so we don't
//      leak Referer or expose the opener for tab-nabbing,
//   2. inject a trailing lucide ExternalLink glyph styled as
//      `currentColor` so it picks up the link's brand-orange tone,
//   3. append a visually-hidden "(opens in new tab)" hint so screen
//      readers announce the off-site behavior — the icon itself is
//      `aria-hidden`.
//
// Both renderers reuse this helper so the visual + a11y contract stays
// in sync as we tune one or the other.

const EXTERNAL_LINK_SVG =
	'<svg class="md-external-icon" aria-hidden="true" focusable="false" ' +
	'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
	'stroke-linecap="round" stroke-linejoin="round">' +
	'<path d="M15 3h6v6"/>' +
	'<path d="M10 14 21 3"/>' +
	'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
	'</svg>';

const EXTERNAL_LINK_SR_HINT = '<span class="sr-only"> (opens in new tab)</span>';

export function applyExternalLinkDecoration(md) {
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

	const defaultLinkClose =
		md.renderer.rules.link_close ||
		function (tokens, idx, options, env, self) {
			return self.renderToken(tokens, idx, options);
		};
	md.renderer.rules.link_close = function (tokens, idx, options, env, self) {
		return (
			EXTERNAL_LINK_SVG +
			EXTERNAL_LINK_SR_HINT +
			defaultLinkClose(tokens, idx, options, env, self)
		);
	};
}

// Turns raw comment/proposal blurb text into a list of small, typed segments
// that `Text.svelte` renders with plain Svelte template syntax instead of
// `{@html}`. Keeping this as a pure function makes the parsing independently
// testable, and keeping the rendering in real Svelte markup (text
// interpolation + attribute bindings) means the untrusted text is never
// assembled into an HTML string in the first place, so it cannot be
// interpreted as markup, an attribute, or a `javascript:` URL scheme. Svelte
// escapes interpolated text and sets attributes through the DOM API rather
// than by string concatenation.

const URL_PATTERN = /(https?:\/\/[^\s]+)/;
const LINE_BREAK_PATTERN = /\r\n|\r|\n/;

// Collapse runs of 3+ line breaks down to 2, so a comment can't pad itself
// with dozens of blank lines.
function collapseLineBreaks(text) {
  return text.replace(/(?:\r\n|\r|\n)+/g, (match) => (match.length > 2 ? '\n\n' : match));
}

/**
 * @param {string} text
 * @returns {Array<{ type: 'text' | 'link' | 'br', value?: string }>}
 */
export function parseDisplayText(text) {
  const collapsed = collapseLineBreaks(String(text ?? ''));
  const parts = collapsed.split(URL_PATTERN);
  const segments = [];

  parts.forEach((part, index) => {
    // `String.split` on a regex with one capture group interleaves the
    // matched delimiters at odd indices. Those are always bare http(s)
    // URLs, since that's the only thing URL_PATTERN can match.
    if (index % 2 === 1) {
      segments.push({ type: 'link', value: part });
      return;
    }

    if (!part) return;

    const lines = part.split(LINE_BREAK_PATTERN);
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) segments.push({ type: 'br' });
      if (line) segments.push({ type: 'text', value: line });
    });
  });

  return segments;
}

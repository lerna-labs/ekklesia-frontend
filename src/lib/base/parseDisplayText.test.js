import { describe, it, expect } from 'vitest';
import { parseDisplayText } from './parseDisplayText.js';

// `Text.svelte` renders these segments with plain Svelte template syntax
// (text interpolation + attribute bindings), which Svelte escapes/sets
// safely on its own. The property this suite has to guarantee is upstream
// of that: a payload must never be classified as a `link` segment (the only
// segment type that becomes a real anchor tag), and any text segment must
// keep the attacker's characters as inert data rather than letting them
// widen into markup.

describe('parseDisplayText', () => {
  it('treats a <script> payload as plain inert text, never as a link', () => {
    const segments = parseDisplayText('<script>alert(document.cookie)</script>');

    expect(segments).toEqual([{ type: 'text', value: '<script>alert(document.cookie)</script>' }]);
    expect(segments.some((s) => s.type === 'link')).toBe(false);
  });

  it('treats an onerror/onload attribute payload as plain inert text', () => {
    const payload = '<img src=x onerror="alert(1)"><body onload="alert(2)">';
    const segments = parseDisplayText(payload);

    expect(segments).toEqual([{ type: 'text', value: payload }]);
    expect(segments.some((s) => s.type === 'link')).toBe(false);
  });

  it('never linkifies a javascript: URL', () => {
    const segments = parseDisplayText('click javascript:alert(1) now');

    expect(segments.some((s) => s.type === 'link')).toBe(false);
    expect(segments).toEqual([{ type: 'text', value: 'click javascript:alert(1) now' }]);
  });

  it('still linkifies bare http(s) URLs and converts newlines to <br> segments', () => {
    const segments = parseDisplayText('Visit https://example.com/path?a=1&b=2 now\nThanks');

    expect(segments).toEqual([
      { type: 'text', value: 'Visit ' },
      { type: 'link', value: 'https://example.com/path?a=1&b=2' },
      { type: 'text', value: ' now' },
      { type: 'br' },
      { type: 'text', value: 'Thanks' },
    ]);
  });

  it('collapses three or more consecutive line breaks down to two', () => {
    const segments = parseDisplayText('one\n\n\n\ntwo');

    expect(segments).toEqual([
      { type: 'text', value: 'one' },
      { type: 'br' },
      { type: 'br' },
      { type: 'text', value: 'two' },
    ]);
  });
});

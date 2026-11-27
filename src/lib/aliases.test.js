import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { loggedIn } from '$stores/sessionManager.js';
import { cn } from '$lib/utils.js';
import { page } from '$app/state';
import { goto } from '$app/navigation';

describe('test harness aliases and stubs', () => {
  it('resolves $lib and $stores', () => {
    expect(cn('a', 'b')).toBe('a b');
    expect(get(loggedIn)).toBe(false);
  });

  it('stubs $app/state and $app/navigation', async () => {
    expect(page.url.pathname).toBe('/');
    await goto('/x');
    expect(goto).toHaveBeenCalledWith('/x');
  });
});

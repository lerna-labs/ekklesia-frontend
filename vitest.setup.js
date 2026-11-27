import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

afterEach(() => {
  cleanup();
});

// Shared stubs for the SvelteKit runtime modules. A test that needs a specific
// page value or navigation spy overrides these with its own vi.mock call.
vi.mock('$app/state', () => ({
  page: { url: new URL('http://localhost/'), params: {}, data: {} },
  navigating: { current: null },
  updated: { current: false, check: async () => false },
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(async () => {}),
  invalidate: vi.fn(async () => {}),
  invalidateAll: vi.fn(async () => {}),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
  onNavigate: vi.fn(),
  preloadData: vi.fn(async () => ({})),
  preloadCode: vi.fn(async () => {}),
}));

import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      $stores: resolve('./src/stores'),
      $lib: resolve('./src/lib'),
    },
    // Svelte resolves to its client build under test only; the bundle is unaffected.
    conditions: mode === 'test' ? ['browser'] : undefined,
  },
  server: {
    allowedHosts: ['a1bc-24-121-173-86.ngrok-free.app', 'localhost'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.test.js'],
  },
}));

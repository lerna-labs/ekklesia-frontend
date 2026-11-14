import { defineConfig, loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Development only: the backend the dev server proxies `/api` and `/health` to.
  const backend = loadEnv(mode, process.cwd(), '').DEV_BACKEND_URL || 'http://localhost:3000';
  return {
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
      proxy: {
        '/api': backend,
        '/health': backend,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.js'],
      include: ['src/**/*.test.js'],
    },
  };
});

import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$stores: resolve('./src/stores'),
			$lib: resolve('./src/lib')
		}
	}
});

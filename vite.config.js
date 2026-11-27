import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// Get the directory where this config file is located
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, 'static');

// Derive build mode from CLI args so each environment lands in its own
// `build/<mode>` subdirectory. Vite defaults to mode=production when
// `--mode` is omitted, so we mirror that here.
const modeFlagIndex = process.argv.indexOf('--mode');
const buildMode =
  modeFlagIndex !== -1 && process.argv[modeFlagIndex + 1]
    ? process.argv[modeFlagIndex + 1]
    : 'production';
const buildOutDir = `build/${buildMode}`;

// Get version from package.json
let appVersion = '0.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  appVersion = packageJson.version || appVersion;
} catch (err) {
  if (err) console.warn('Could not read package.json, using default version:', appVersion);
}

// Ensure the static directory exists
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

// Write version.json to static directory
fs.writeFileSync(
  path.join(staticDir, 'version.json'),
  JSON.stringify({ version: appVersion, buildTime: new Date().toISOString() }, null, 2),
);

console.log(`Created version.json with version ${appVersion}`);

// Preprocess: for Svelte files in node_modules that use @layer in <style>, prepend Tailwind
// directives so PostCSS/Tailwind does not error ("no matching @tailwind components").
const tailwindLayerPreprocess = {
  style: ({ content, filename }) => {
    if (!filename || !filename.includes('node_modules') || !content.includes('@layer')) {
      return;
    }
    if (content.includes('@tailwind')) {
      return;
    }
    const tailwindDirectives = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n';
    return { code: tailwindDirectives + content };
  },
};

export default defineConfig(({ mode }) => {
  // Development only: the backend the dev server proxies `/api` and `/health` to.
  const backend = loadEnv(mode, process.cwd(), '').DEV_BACKEND_URL || 'http://localhost:3000';
  return {
    plugins: [
      sveltekit({
        preprocess: [tailwindLayerPreprocess, vitePreprocess()],

        // Using adapter-static since we're serving the app as static files from Express
        adapter: adapter({
          // Build output location, scoped per mode (build/production, build/preprod, …)
          pages: buildOutDir,
          assets: buildOutDir,
          fallback: 'index.html',
        }),

        alias: {
          $stores: resolve('./src/stores'),
          $lib: resolve('./src/lib'),
        },
      }),
    ],
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

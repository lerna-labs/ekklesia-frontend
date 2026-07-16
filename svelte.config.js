import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [tailwindLayerPreprocess, vitePreprocess()],

  kit: {
    // Using adapter-static since we're serving the app as static files from Express
    adapter: adapter({
      // Build output location, scoped per mode (build/production, build/preprod, …)
      pages: buildOutDir,
      assets: buildOutDir,
      fallback: 'index.html',
    }),

    // Add aliases for easier imports
    alias: {
      $stores: resolve('./src/stores'),
      $lib: resolve('./src/lib'),
    },
  },
};

// Add version as a Vite define (outside of the kit config)
/** @type {import('vite').UserConfig} */
const viteConfig = {
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
};

export default config;
export const vite = viteConfig;

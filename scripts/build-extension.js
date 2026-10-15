import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');

// Parse target: --target=chrome (default) or --target=firefox
const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1].toLowerCase() : 'chrome';

async function buildAll() {
  console.log(`=== Sentry AI Extension Builder (Target: ${target.toUpperCase()}) ===`);

  const distDir = resolve(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    console.log('--- Cleaning previous dist directory ---');
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  console.log('--- Step 1: Building Extension Pages & Service Worker ---');
  await build({
    root: rootDir,
    base: '',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'esnext',
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'popup.html'),
          dashboard: resolve(rootDir, 'dashboard.html'),
          sidepanel: resolve(rootDir, 'sidepanel.html'),
          serviceWorker: resolve(rootDir, 'src/background/serviceWorker.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'serviceWorker') {
              return 'background/[name].js';
            }
            return 'assets/[name].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  console.log('--- Step 2: Building Standalone Content Scripts (IIFE) ---');
  const contentScripts = [
    { name: 'canvasDefender', input: resolve(rootDir, 'src/content/canvasDefender.ts') },
    { name: 'aiShield', input: resolve(rootDir, 'src/content/aiShield.ts') },
    { name: 'domZapper', input: resolve(rootDir, 'src/content/domZapper.ts') },
    { name: 'urlCleaner', input: resolve(rootDir, 'src/content/urlCleaner.ts') },
  ];

  for (const cs of contentScripts) {
    console.log(`Building standalone IIFE: ${cs.name}...`);
    await build({
      root: rootDir,
      configFile: false,
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        target: 'esnext',
        rollupOptions: {
          input: cs.input,
          output: {
            format: 'iife',
            name: `Sentry_${cs.name}`,
            entryFileNames: `content/${cs.name}.js`,
            inlineDynamicImports: true,
          },
        },
      },
    });
  }

  console.log('--- Step 3: Finalizing Manifest & Asset Hygiene ---');
  // Handle Target-Specific Manifest
  if (target === 'firefox') {
    const firefoxManifest = resolve(rootDir, 'public/manifest.firefox.json');
    if (fs.existsSync(firefoxManifest)) {
      fs.copyFileSync(firefoxManifest, resolve(distDir, 'manifest.json'));
      console.log('Injected Firefox AMO Manifest (gecko ID + sidebar_action).');
    }
  }

  // Remove unwanted manifest.firefox.json from dist if present
  const distFirefoxManifest = resolve(distDir, 'manifest.firefox.json');
  if (fs.existsSync(distFirefoxManifest)) {
    fs.unlinkSync(distFirefoxManifest);
  }

  console.log(`[SUCCESS] Build completed successfully for ${target.toUpperCase()}!`);
}

buildAll().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');

async function buildAll() {
  console.log('--- Step 1: Building Extension Pages & Service Worker ---');
  await build({
    root: rootDir,
    base: '',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
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

  console.log('Build completed successfully! All content scripts are pure standalone IIFE without imports.');
}

buildAll().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

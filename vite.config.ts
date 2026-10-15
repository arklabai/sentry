import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  base: '',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        serviceWorker: resolve(__dirname, 'src/background/serviceWorker.ts'),
        canvasDefender: resolve(__dirname, 'src/content/canvasDefender.ts'),
        aiShield: resolve(__dirname, 'src/content/aiShield.ts'),
        domZapper: resolve(__dirname, 'src/content/domZapper.ts'),
        urlCleaner: resolve(__dirname, 'src/content/urlCleaner.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'serviceWorker') {
            return 'background/[name].js';
          }
          if (
            chunkInfo.name === 'canvasDefender' ||
            chunkInfo.name === 'aiShield' ||
            chunkInfo.name === 'domZapper' ||
            chunkInfo.name === 'urlCleaner'
          ) {
            return 'content/[name].js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../functions/src/shared', import.meta.url)) },
  },
  server: { fs: { allow: ['..'] } },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Meen Fina',
        short_name: 'Meen Fina',
        description: 'Anonymous "who in the group...?" votes with your friends',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#fff8f1',
        theme_color: '#ff6b3d',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      devOptions: { enabled: false },
    }),
  ],
});

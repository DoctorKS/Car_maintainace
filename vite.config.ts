import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons/apple-touch-icon-180.png',
        'fonts/Inter-Variable.woff2',
        'fonts/IBMPlexSansThai-Regular.woff2',
        'fonts/IBMPlexSansThai-Medium.woff2',
        'fonts/IBMPlexSansThai-SemiBold.woff2',
      ],
      manifest: {
        name: 'CX-5 Maintenance',
        short_name: 'CX-5',
        description: 'ตาราง maintainance CX-5 2016 ขข4699',
        lang: 'th',
        display: 'standalone',
        background_color: '#062F66',
        theme_color: '#062F66',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        // Don't precache the heavy 3D model — runtime CacheFirst handles it.
        globIgnores: ['**/models/**', '**/textures/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/models\/.*\.fbx$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fbx-models',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/textures\/.*\.(png|jpg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'textures',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Supabase REST GETs — network-first w/ short fallback
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});

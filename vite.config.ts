import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Little Games',
        short_name: 'Little Games',
        description: 'A child-friendly collection of calm offline games.',
        theme_color: '#17324d',
        background_color: '#fff8e7',
        display: 'standalone',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest}'],
        // Keep the large, unused source sheet in the repository without precaching it.
        // Games should load the optimized individual planet sprites instead.
        globIgnores: ['assets/pixel-planets/PixelPlanetsSheet.png'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});

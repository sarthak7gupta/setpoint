import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { setpointWatchPlugin } from './vite-plugin-setpoint-watch.ts'

export default defineConfig({
  plugins: [
    setpointWatchPlugin(),
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: [
        'favicon.png',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-512-maskable.png',
        'splash-icon.png',
      ],
      manifest: {
        name: 'SetPoint',
        short_name: 'SetPoint',
        description: 'Offline tennis scorer for singles and doubles. Score on court — no account.',
        theme_color: '#552D60',
        background_color: '#023E28',
        display: 'standalone',
        orientation: 'any',
        // Explicit scope + start so iOS home-screen opens the precached shell
        scope: '/',
        start_url: '/app?source=pwa',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    testTimeout: 15000,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'shared/**/*.{test,spec}.ts',
      'native/src/{db,watch}/**/*.test.ts',
    ],
  },
})

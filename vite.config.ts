import { fileURLToPath } from 'node:url'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const THEME_COLOR = '#3fa2e0'
const MAX_PRECACHE_BYTES = 3_000_000
const RUNTIME_CACHED_PREFIXES = ['/mediapipe/', '/models/']

export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === 'https' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'duck-gesture',
        short_name: 'duck-gesture',
        description: 'A duck shooting gallery you play with your hand in front of the camera.',
        theme_color: THEME_COLOR,
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wav,png,webmanifest}'],
        globIgnores: [
          'mediapipe/**',
          'models/**',
          'assets/Spritesheets/**',
          'assets/Vector/**',
          'assets/Preview.png',
          'assets/Sample.png',
        ],
        maximumFileSizeToCacheInBytes: MAX_PRECACHE_BYTES,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              RUNTIME_CACHED_PREFIXES.some((p) => url.pathname.startsWith(p)),
            handler: 'CacheFirst',
            options: {
              cacheName: 'hand-tracking',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 16 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
}))

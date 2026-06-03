import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// PWA / service worker — run `npm install` after adding vite-plugin-pwa to package.json
let VitePWA;
try { VitePWA = (await import('vite-plugin-pwa')).VitePWA; } catch { /* plugin not yet installed */ }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(VitePWA ? [VitePWA({
      registerType: 'autoUpdate',
      // Pre-cache the app shell so ePSA works offline (critical for bus mode on poor signal)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache Firebase API calls — those require network
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/firebase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      manifest: {
        name: 'ePSA — Prostate Cancer Risk Assessment',
        short_name: 'ePSA',
        description: 'AUA/SUO 2026-aligned prostate cancer early detection tool',
        theme_color: '#212070',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    })] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: 'hidden',
    rollupOptions: {
      external: ['@sentry/react'],
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
            'firebase/analytics',
          ],
          charts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
          qr: ['qrcode'],
        },
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    globals: false,
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/dev-proxy/npi': {
        target: 'https://npiregistry.cms.hhs.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev-proxy\/npi/, '/api'),
      },
      '/dev-proxy/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev-proxy\/nominatim/, ''),
      },
    },
  },
  define: {
    'process.env': process.env,
  },
})

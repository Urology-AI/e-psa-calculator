import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local demo: run questionnaire without Firebase (same app as gh-pages)
export default defineConfig({
  plugins: [react()],
  base: '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    rollupOptions: {
      input: './index.html',
    },
  },
  server: {
    port: 3000,
    open: true,
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
    'import.meta.env.VITE_DISABLE_FIREBASE': JSON.stringify('true'),
  },
});

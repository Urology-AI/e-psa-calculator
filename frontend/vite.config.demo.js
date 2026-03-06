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
  },
  define: {
    'import.meta.env.VITE_DISABLE_FIREBASE': JSON.stringify('true'),
  },
});

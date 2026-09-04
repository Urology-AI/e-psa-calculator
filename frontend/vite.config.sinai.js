import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sinai landing-page build — the lean, public-facing Part 1 tool linked from
// mountsinai.org. No Firebase, no i18n bundle, no admin/import surfaces: one
// questionnaire, one result, one CTA. Math comes from @epsa/engine so it can
// never drift from the full calculator or the bus screening tool.
export default defineConfig({
  plugins: [react()],
  base: './',
  esbuild: { drop: ['console', 'debugger'] },
  build: {
    outDir: 'dist-sinai',
    emptyOutDir: true,
    rollupOptions: {
      input: './index.sinai.html',
      output: { manualChunks: { vendor: ['react', 'react-dom'] } },
    },
  },
  define: {
    'import.meta.env.VITE_DISABLE_FIREBASE': JSON.stringify('true'),
  },
});

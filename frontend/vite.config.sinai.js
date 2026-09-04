import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { renameSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Vite names its HTML output after the entry file, so this build would emit
 * index.sinai.html — which Firebase Hosting won't serve as a directory index.
 * Rename it on the way out so the deployed site answers at "/".
 */
const emitAsIndexHtml = (outDir) => ({
  name: 'emit-as-index-html',
  closeBundle() {
    const dir = resolve(__dirname, outDir);
    renameSync(resolve(dir, 'index.sinai.html'), resolve(dir, 'index.html'));
  },
});

// Sinai landing-page build — the lean, public-facing Part 1 tool linked from
// mountsinai.org. No Firebase, no i18n bundle, no admin/import surfaces: one
// questionnaire, one result, one CTA. Math comes from @epsa/engine so it can
// never drift from the full calculator or the bus screening tool.
export default defineConfig({
  plugins: [react(), emitAsIndexHtml('dist-sinai')],
  base: './',
  // Not `public/` — that directory carries the full app's flyer PDF, store
  // listing assets, and a 900 kB logo, none of which this page loads. A
  // trimmed public-sinai/ keeps the deployed payload to what it actually uses.
  publicDir: 'public-sinai',
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

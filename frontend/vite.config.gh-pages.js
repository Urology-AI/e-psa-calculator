import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages configuration for static demo - no Firebase
export default defineConfig({
  plugins: [react()],
  base: '/e-psa-calculator/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    rollupOptions: {
      input: './index.gh-pages.html',
      external: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics', 'firebase/functions'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  define: {
    // Disable Firebase for GitHub Pages demo
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.VITE_GITHUB_PAGES': JSON.stringify('true')
  }
})
